"""
Workflow Views — Kaizen Approval, Rejection, Rework, Classification
Authentication disabled for testing phase.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from kaizens.models import Kaizen
from .models import WorkflowHistory
from .serializers import (
    WorkflowHistorySerializer,
    ApproveSerializer,
    RejectSerializer,
    ReworkSerializer,
    ClassifySerializer,
)
from core.exceptions import InvalidWorkflowTransition, KaizenAPIException


@api_view(['POST'])
@permission_classes([AllowAny])
def approve_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/approve/
    Approve a Kaizen (sets status to 'approved' or 'good_point').
    Updates: status, classification, approved_by, verified_by_name,
             assigned_reviewer, submitted_at.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('submitted', 'pending', 'draft', 'approved', 'good_point', 'rework'):
        raise InvalidWorkflowTransition(
            message=f'Cannot approve a Kaizen with status "{kaizen.get_status_display()}".',
            details={'current_status': kaizen.status, 'allowed_from': ['submitted', 'pending', 'draft', 'approved', 'good_point', 'rework']},
        )

    serializer = ApproveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from_status = kaizen.status
    classification = serializer.validated_data.get('classification', 'kaizen')

    if classification == 'good_point':
        kaizen.status = 'good_point'
        kaizen.classification = 'good_point'
    else:
        kaizen.status = 'approved'
        kaizen.classification = 'kaizen'

    # Persist committee review fields to DB
    approved_by = serializer.validated_data.get('approved_by', '').strip()
    verified_by = serializer.validated_data.get('verified_by', '').strip()
    remarks = serializer.validated_data.get('remarks', '')

    if approved_by:
        kaizen.approved_by = approved_by
    if verified_by:
        kaizen.verified_by_name = verified_by
    if 'remarks' in serializer.validated_data and remarks:
        kaizen.remark = remarks

    # Assign reviewer if a user ID was provided
    reviewer_id = serializer.validated_data.get('assigned_reviewer_id')
    if reviewer_id:
        from accounts.models import CustomUser
        try:
            kaizen.assigned_reviewer = CustomUser.objects.get(pk=reviewer_id)
        except CustomUser.DoesNotExist:
            pass

    # Record submission timestamp if not already set
    if not kaizen.submitted_at:
        kaizen.submitted_at = timezone.now()

    kaizen.save()

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='approved' if classification != 'good_point' else 'good_point',
        from_status=from_status,
        to_status=kaizen.status,
        performed_by=None,
        remarks=remarks,
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been approved as {kaizen.get_classification_display()}.',
        'data': {
            'status': kaizen.status,
            'classification': kaizen.classification,
            'approvedBy': kaizen.approved_by,
            'verifiedByName': kaizen.verified_by_name,
            'submittedAt': kaizen.submitted_at,
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def reject_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/reject/
    Reject a Kaizen — reason is required.
    Updates: status, remark, approved_by, verified_by_name, submitted_at.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('submitted', 'pending', 'draft', 'approved', 'good_point', 'rework'):
        raise InvalidWorkflowTransition(
            message=f'Cannot reject a Kaizen with status "{kaizen.get_status_display()}".',
            details={'current_status': kaizen.status, 'allowed_from': ['submitted', 'pending', 'draft', 'approved', 'good_point', 'rework']},
        )

    serializer = RejectSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from_status = kaizen.status
    kaizen.status = 'rejected'
    kaizen.remark = serializer.validated_data['reason']

    # Persist committee reviewer details
    approved_by = serializer.validated_data.get('approved_by', '').strip()
    verified_by = serializer.validated_data.get('verified_by', '').strip()
    if approved_by:
        kaizen.approved_by = approved_by
    if verified_by:
        kaizen.verified_by_name = verified_by
    if not kaizen.submitted_at:
        kaizen.submitted_at = timezone.now()

    kaizen.save()

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='rejected',
        from_status=from_status,
        to_status='rejected',
        performed_by=None,
        remarks=serializer.validated_data['reason'],
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been rejected.',
        'data': {
            'status': kaizen.status,
            'approvedBy': kaizen.approved_by,
            'verifiedByName': kaizen.verified_by_name,
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def rework_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/rework/
    Return a Kaizen for correction/rework.
    Updates: status, remark, submitted_at.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('submitted', 'pending', 'draft', 'approved', 'good_point'):
        raise InvalidWorkflowTransition(
            message=f'Cannot return a Kaizen with status "{kaizen.get_status_display()}" for rework.',
            details={'current_status': kaizen.status, 'allowed_from': ['submitted', 'pending', 'draft', 'approved', 'good_point']},
        )

    serializer = ReworkSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from_status = kaizen.status
    kaizen.status = 'rework'
    kaizen.remark = serializer.validated_data['remarks']
    if not kaizen.submitted_at:
        kaizen.submitted_at = timezone.now()
    kaizen.save()

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='rework',
        from_status=from_status,
        to_status='rework',
        performed_by=None,
        remarks=serializer.validated_data['remarks'],
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been returned for rework.',
        'data': {'status': kaizen.status},
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def classify_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/classify/
    Change the classification of a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    serializer = ClassifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    old_classification = kaizen.classification
    kaizen.classification = serializer.validated_data['classification']
    kaizen.save(update_fields=['classification', 'updated_at'])

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='classified',
        from_status=old_classification,
        to_status=kaizen.classification,
        performed_by=None,
        remarks=serializer.validated_data.get('remarks', ''),
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} classification changed to {kaizen.get_classification_display()}.',
        'data': {'classification': kaizen.classification},
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def workflow_history(request, kaizen_id):
    """
    GET /api/v1/kaizens/<id>/workflow-history/
    Get the complete workflow history for a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)
    history = WorkflowHistory.objects.filter(kaizen=kaizen).select_related('performed_by')
    serializer = WorkflowHistorySerializer(history, many=True)
    return Response({'success': True, 'data': serializer.data})
