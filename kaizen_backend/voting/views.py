"""
Voting Views — CFT Voting Sessions
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, F, Case, When, IntegerField

from kaizens.models import Kaizen
from .models import VotingSession, CftVote
from .serializers import (
    VotingSessionSerializer,
    VotingSessionListSerializer,
    CftVoteSerializer,
    CastVoteSerializer,
)
from accounts.permissions import IsCftMember, IsKaizenLead
from core.exceptions import KaizenAPIException, DuplicateResourceError


class VotingSessionViewSet(viewsets.ModelViewSet):
    """
    GET    /api/v1/voting/sessions/                — List voting sessions
    POST   /api/v1/voting/sessions/                — Create session (leads only)
    GET    /api/v1/voting/sessions/<id>/            — Session detail with votes
    POST   /api/v1/voting/sessions/<id>/close/      — Close voting
    POST   /api/v1/voting/sessions/<id>/vote/       — Cast vote
    GET    /api/v1/voting/sessions/<id>/results/    — Get ranking results
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VotingSession.objects.prefetch_related(
            'votes', 'votes__voter', 'votes__kaizen', 'eligible_kaizens'
        ).all()

    def get_serializer_class(self):
        if self.action == 'list':
            return VotingSessionListSerializer
        return VotingSessionSerializer

    def create(self, request, *args, **kwargs):
        # Only leads/admins can create sessions
        if not request.user.role or request.user.role.name not in ('kaizen_lead', 'admin'):
            raise KaizenAPIException(
                message='Only Kaizen leads or administrators can create voting sessions.',
                code='PERMISSION_DENIED',
                status_code=403,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.save(opened_by=request.user)

        return Response({
            'success': True,
            'message': f'Voting session for {session.month} {session.year} created.',
            'data': VotingSessionSerializer(session).data,
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = VotingSessionSerializer(instance)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """POST /api/v1/voting/sessions/<id>/close/ — Close voting session."""
        session = self.get_object()

        if not session.is_open:
            raise KaizenAPIException(
                message='Voting session is already closed.',
                code='ALREADY_CLOSED',
                status_code=409,
            )

        session.is_open = False
        session.closed_at = timezone.now()
        session.save(update_fields=['is_open', 'closed_at'])

        return Response({
            'success': True,
            'message': f'Voting session for {session.month} {session.year} has been closed.',
        })

    @action(detail=True, methods=['post'])
    def vote(self, request, pk=None):
        """POST /api/v1/voting/sessions/<id>/vote/ — Cast a vote."""
        session = self.get_object()

        if not session.is_open:
            raise KaizenAPIException(
                message='Voting session is closed. No more votes can be cast.',
                code='VOTING_CLOSED',
                status_code=422,
            )

        serializer = CastVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        kaizen_id = serializer.validated_data['kaizen']
        rank = serializer.validated_data['rank']

        # Verify Kaizen is eligible
        kaizen = get_object_or_404(Kaizen, pk=kaizen_id)
        if not session.eligible_kaizens.filter(pk=kaizen_id).exists():
            raise KaizenAPIException(
                message='This Kaizen is not eligible for this voting session.',
                code='NOT_ELIGIBLE',
                status_code=422,
            )

        # Check for duplicate vote
        if CftVote.objects.filter(
            session=session, voter=request.user, kaizen=kaizen
        ).exists():
            raise DuplicateResourceError(
                message='You have already voted for this Kaizen in this session.',
                details={'kaizen_id': kaizen_id},
            )

        # Check voter hasn't used this rank already in this session
        if CftVote.objects.filter(
            session=session, voter=request.user, rank=rank
        ).exists():
            raise KaizenAPIException(
                message=f'You have already assigned rank {rank} to another Kaizen in this session.',
                code='RANK_ALREADY_USED',
                status_code=422,
            )

        vote = CftVote.objects.create(
            session=session,
            voter=request.user,
            kaizen=kaizen,
            rank=rank,
        )

        return Response({
            'success': True,
            'message': f'Vote cast: {kaizen.sr_no} ranked #{rank}.',
            'data': CftVoteSerializer(vote).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """
        GET /api/v1/voting/sessions/<id>/results/
        Calculate rankings based on weighted scoring.
        Rank 1 = 3 pts, Rank 2 = 2 pts, Rank 3 = 1 pt.
        """
        session = self.get_object()

        # Calculate weighted scores
        rankings = (
            CftVote.objects.filter(session=session)
            .values('kaizen__id', 'kaizen__sr_no', 'kaizen__title')
            .annotate(
                total_score=Sum(
                    Case(
                        When(rank=1, then=3),
                        When(rank=2, then=2),
                        When(rank=3, then=1),
                        output_field=IntegerField(),
                    )
                ),
                vote_count=Count('id'),
                rank_1_count=Count(Case(When(rank=1, then=1))),
                rank_2_count=Count(Case(When(rank=2, then=1))),
                rank_3_count=Count(Case(When(rank=3, then=1))),
            )
            .order_by('-total_score', '-rank_1_count')
        )

        # Get all individual votes
        votes = CftVoteSerializer(
            session.votes.select_related('voter', 'kaizen').all(),
            many=True
        ).data

        return Response({
            'success': True,
            'data': {
                'session': {
                    'id': session.id,
                    'month': session.month,
                    'year': session.year,
                    'is_open': session.is_open,
                },
                'rankings': list(rankings),
                'votes': votes,
                'total_voters': session.votes.values('voter').distinct().count(),
            }
        })
