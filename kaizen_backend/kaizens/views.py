"""
Kaizen Views — CRUD, Drafts, Submission, Evidence, Cost Savings
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db.models import Sum, Q
from django.shortcuts import get_object_or_404

from .models import Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving
from .serializers import (
    KaizenListSerializer,
    KaizenDetailSerializer,
    KaizenSubmitSerializer,
    KaizenEvidenceSerializer,
    KaizenCostSavingSerializer,
    KaizenCostSavingUpdateSerializer,
)
from .filters import KaizenFilter
from .validators import validate_kaizen_for_submission
from accounts.permissions import IsOwnerOrAdmin, IsReviewer, IsAdmin
from core.exceptions import InvalidWorkflowTransition, KaizenAPIException

import logging

logger = logging.getLogger('kaizen')


class KaizenViewSet(viewsets.ModelViewSet):
    """
    Main Kaizen CRUD ViewSet.

    Endpoints:
        GET    /api/v1/kaizens/              — List all Kaizens (filtered, paginated, sorted)
        POST   /api/v1/kaizens/              — Create a new Kaizen
        GET    /api/v1/kaizens/<id>/          — Get Kaizen detail
        PUT    /api/v1/kaizens/<id>/          — Update Kaizen (draft/rework only)
        PATCH  /api/v1/kaizens/<id>/          — Partial update
        DELETE /api/v1/kaizens/<id>/          — Delete (drafts only)
        POST   /api/v1/kaizens/<id>/submit/   — Submit for review
        GET    /api/v1/kaizens/drafts/         — Current user's drafts
        GET    /api/v1/kaizens/my-kaizens/     — Current user's Kaizens
        GET    /api/v1/kaizens/assigned/       — Assigned for review
        GET    /api/v1/kaizens/pending/        — Pending Kaizens
        GET    /api/v1/kaizens/approved/       — Approved Kaizens
        GET    /api/v1/kaizens/rejected/       — Rejected Kaizens
        GET    /api/v1/kaizens/closed/         — Closed Kaizens
    """
    permission_classes = [AllowAny]
    filterset_class = KaizenFilter
    search_fields = ['title', 'problem_before', 'counter_measure_after', 'idea_by', 'area']
    ordering_fields = [
        'sr_no', 'title', 'suggestion_date', 'cost_save', 'status',
        'created_at', 'implementation_date', 'area', 'mini_factory',
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        return Kaizen.objects.select_related(
            'created_by', 'assigned_reviewer', 'benefits'
        ).prefetch_related('evidence_files').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return KaizenListSerializer
        return KaizenDetailSerializer

    def perform_create(self, serializer):
        """Auto-generate sr_no and set created_by.

        Falls back to the default initiator user when the request is
        unauthenticated (AnonymousUser), allowing the frontend to submit
        Kaizens without a full auth token during development.
        """
        from accounts.models import CustomUser

        user = self.request.user
        if not user or not user.is_authenticated:
            # Use the first active CustomUser as the default submitter
            user = (
                CustomUser.objects.filter(is_active=True).first()
                or CustomUser.objects.first()
            )
            if user is None:
                from core.exceptions import KaizenAPIException
                raise KaizenAPIException(
                    message='No active user exists in the system. Please create a user first.',
                    code='NO_USER',
                    status_code=503,
                )

        serializer.save(
            created_by=user,
            sr_no=Kaizen.generate_sr_no(),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            'success': True,
            'message': 'Kaizen created successfully.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        # If status was transitioned via review, record workflow history
        new_status = request.data.get('status')
        if new_status and new_status != instance.status:
            from workflow.models import WorkflowHistory
            WorkflowHistory.objects.create(
                kaizen=updated_instance,
                action=new_status,
                from_status=instance.status,
                to_status=new_status,
                performed_by=None,
                remarks=request.data.get('remark', f'Status updated to {new_status} by committee.'),
            )

        return Response({
            'success': True,
            'message': 'Kaizen updated successfully.',
            'data': serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.is_deletable:
            raise KaizenAPIException(
                message='Only draft Kaizens can be deleted.',
                code='NOT_DELETABLE',
                status_code=403,
            )

        if instance.created_by != request.user and not (
            request.user.role and request.user.role.name == 'admin'
        ):
            raise KaizenAPIException(
                message='You can only delete your own drafts.',
                code='PERMISSION_DENIED',
                status_code=403,
            )

        instance.delete()
        return Response({
            'success': True,
            'message': 'Kaizen draft deleted successfully.',
        }, status=status.HTTP_200_OK)

    # -----------------------------------------------------------------------
    # Custom Actions
    # -----------------------------------------------------------------------

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        POST /api/v1/kaizens/<id>/submit/
        Submit a draft Kaizen for review.
        """
        kaizen = self.get_object()

        if kaizen.status not in ('draft', 'rework'):
            raise InvalidWorkflowTransition(
                message=f'Cannot submit a Kaizen with status "{kaizen.get_status_display()}".',
                details={'current_status': kaizen.status, 'allowed_from': ['draft', 'rework']},
            )

        # Validate required fields
        errors = validate_kaizen_for_submission(kaizen)
        if errors:
            raise KaizenAPIException(
                message='Kaizen is incomplete. Please fill all required fields before submission.',
                code='INCOMPLETE_SUBMISSION',
                status_code=422,
                details=errors,
            )

        # Assign reviewer if provided
        serializer = KaizenSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reviewer_id = serializer.validated_data.get('assigned_reviewer')
        if reviewer_id:
            from accounts.models import CustomUser
            try:
                reviewer = CustomUser.objects.get(pk=reviewer_id)
                kaizen.assigned_reviewer = reviewer
            except CustomUser.DoesNotExist:
                raise KaizenAPIException(
                    message='Assigned reviewer not found.',
                    code='REVIEWER_NOT_FOUND',
                    status_code=404,
                )

        kaizen.status = 'submitted'
        kaizen.submitted_at = timezone.now()
        kaizen.save()

        # Create workflow history
        from workflow.models import WorkflowHistory
        WorkflowHistory.objects.create(
            kaizen=kaizen,
            action='submitted',
            from_status='draft' if kaizen.status != 'rework' else 'rework',
            to_status='submitted',
            performed_by=request.user,
            remarks='Kaizen submitted for review.',
        )

        return Response({
            'success': True,
            'message': 'Kaizen submitted for review successfully.',
            'data': KaizenDetailSerializer(kaizen).data,
        })

    @action(detail=False, methods=['get'])
    def drafts(self, request):
        """GET /api/v1/kaizens/drafts/ — Current user's draft Kaizens."""
        queryset = self.get_queryset().filter(
            created_by=request.user,
            status='draft',
        )
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='my-kaizens')
    def my_kaizens(self, request):
        """GET /api/v1/kaizens/my-kaizens/ — Current user's Kaizens."""
        queryset = self.get_queryset().filter(created_by=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def assigned(self, request):
        """GET /api/v1/kaizens/assigned/ — Kaizens assigned to current user for review."""
        queryset = self.get_queryset().filter(
            assigned_reviewer=request.user,
            status__in=['submitted', 'pending'],
        )
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """GET /api/v1/kaizens/pending/ — All pending Kaizens."""
        queryset = self.get_queryset().filter(status__in=['submitted', 'pending'])
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def approved(self, request):
        """GET /api/v1/kaizens/approved/ — All approved Kaizens."""
        queryset = self.get_queryset().filter(status='approved')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def rejected(self, request):
        """GET /api/v1/kaizens/rejected/ — All rejected Kaizens."""
        queryset = self.get_queryset().filter(status='rejected')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def closed(self, request):
        """GET /api/v1/kaizens/closed/ — All closed Kaizens."""
        queryset = self.get_queryset().filter(status='closed')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='by-srno/(?P<sr_no>[^/.]+)')
    def by_srno(self, request, sr_no=None):
        """GET /api/v1/kaizens/by-srno/<sr_no>/ — Get Kaizen by serial number."""
        kaizen = get_object_or_404(Kaizen, sr_no=sr_no)
        serializer = KaizenDetailSerializer(kaizen)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='cost-savings')
    def cost_savings(self, request):
        """
        GET /api/v1/kaizens/cost-savings/
        Aggregated cost savings report with breakdowns.
        """
        kaizens = Kaizen.objects.filter(status__in=['approved', 'good_point', 'closed'])

        # Total savings
        total = kaizens.aggregate(total=Sum('cost_save'))['total'] or 0

        # By month
        by_month = list(
            kaizens.values('month').annotate(
                total_savings=Sum('cost_save')
            ).order_by('month')
        )

        # By area
        by_area = list(
            kaizens.values('area').annotate(
                total_savings=Sum('cost_save')
            ).order_by('-total_savings')
        )

        # By mini-factory
        by_factory = list(
            kaizens.values('mini_factory').annotate(
                total_savings=Sum('cost_save')
            ).order_by('-total_savings')
        )

        # By employee (idea_by)
        by_employee = list(
            kaizens.values('idea_by').annotate(
                total_savings=Sum('cost_save')
            ).order_by('-total_savings')[:20]
        )

        return Response({
            'success': True,
            'data': {
                'total_savings_inr': float(total),
                'by_month': by_month,
                'by_area': by_area,
                'by_mini_factory': by_factory,
                'by_employee': by_employee,
            }
        })


class KaizenEvidenceViewSet(viewsets.ModelViewSet):
    """
    Evidence upload/management for a specific Kaizen.
    POST /api/v1/kaizens/<kaizen_id>/evidence/ — Upload evidence
    GET  /api/v1/kaizens/<kaizen_id>/evidence/ — List evidence
    DELETE /api/v1/kaizens/<kaizen_id>/evidence/<id>/ — Delete evidence
    """
    serializer_class = KaizenEvidenceSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return KaizenEvidence.objects.filter(
            kaizen_id=self.kwargs['kaizen_pk']
        ).select_related('uploaded_by')

    def create(self, request, kaizen_pk=None):
        kaizen = get_object_or_404(Kaizen, pk=kaizen_pk)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validate file
        file = request.FILES.get('file')
        if file:
            if file.size > (10 * 1024 * 1024):  # 10MB
                raise KaizenAPIException(
                    message='File size exceeds the maximum allowed size of 10MB.',
                    code='FILE_TOO_LARGE',
                    status_code=400,
                )

            if file.content_type not in ['image/jpeg', 'image/png', 'image/webp', 'image/gif']:
                raise KaizenAPIException(
                    message='Only JPEG, PNG, WebP, and GIF images are allowed.',
                    code='INVALID_FILE_TYPE',
                    status_code=400,
                )

        serializer.save(
            kaizen=kaizen,
            uploaded_by=request.user,
            original_filename=file.name if file else '',
            file_size=file.size if file else 0,
        )

        return Response({
            'success': True,
            'message': 'Evidence uploaded successfully.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)

    def list(self, request, kaizen_pk=None):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    def destroy(self, request, kaizen_pk=None, pk=None):
        evidence = self.get_object()

        # Only owner, kaizen creator, or admin can delete
        if (
            evidence.uploaded_by != request.user and
            evidence.kaizen.created_by != request.user and
            not (request.user.role and request.user.role.name == 'admin')
        ):
            raise KaizenAPIException(
                message='You do not have permission to delete this evidence.',
                code='PERMISSION_DENIED',
                status_code=403,
            )

        # Delete the file from storage
        if evidence.file:
            evidence.file.delete(save=False)
        evidence.delete()

        return Response({
            'success': True,
            'message': 'Evidence deleted successfully.',
        })
