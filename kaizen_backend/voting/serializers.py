"""
Voting Serializers
"""

from rest_framework import serializers
from .models import VotingSession, CftVote


class CftVoteSerializer(serializers.ModelSerializer):
    voter_name = serializers.CharField(source='voter.get_full_name', read_only=True)
    kaizen_sr_no = serializers.CharField(source='kaizen.sr_no', read_only=True)
    kaizen_title = serializers.CharField(source='kaizen.title', read_only=True)

    class Meta:
        model = CftVote
        fields = [
            'id', 'session', 'voter', 'voter_name',
            'kaizen', 'kaizen_sr_no', 'kaizen_title',
            'rank', 'voted_at',
        ]
        read_only_fields = ['id', 'session', 'voter', 'voted_at']


class VotingSessionSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source='opened_by.get_full_name', read_only=True)
    votes = CftVoteSerializer(many=True, read_only=True)
    total_votes = serializers.SerializerMethodField()
    eligible_kaizen_count = serializers.SerializerMethodField()

    class Meta:
        model = VotingSession
        fields = [
            'id', 'month', 'year', 'is_open', 'description',
            'eligible_kaizens', 'opened_by', 'opened_by_name',
            'opened_at', 'closed_at', 'votes',
            'total_votes', 'eligible_kaizen_count',
        ]
        read_only_fields = ['id', 'opened_by', 'opened_at', 'closed_at']

    def get_total_votes(self, obj):
        return obj.votes.count()

    def get_eligible_kaizen_count(self, obj):
        return obj.eligible_kaizens.count()


class VotingSessionListSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source='opened_by.get_full_name', read_only=True)
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = VotingSession
        fields = [
            'id', 'month', 'year', 'is_open', 'description',
            'opened_by_name', 'opened_at', 'closed_at', 'total_votes',
        ]

    def get_total_votes(self, obj):
        return obj.votes.count()


class CastVoteSerializer(serializers.Serializer):
    """Serializer for casting a vote."""
    kaizen = serializers.IntegerField(required=True)
    rank = serializers.IntegerField(required=True, min_value=1, max_value=3)
