"""
Voting Models — CFT Monthly Awards Voting System
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class VotingSession(models.Model):
    """
    A voting session for a specific month/year.
    CFT members vote on eligible Kaizens within this session.
    """
    month = models.CharField(max_length=20, help_text='Month name (e.g., July)')
    year = models.IntegerField()
    is_open = models.BooleanField(default=True)
    eligible_kaizens = models.ManyToManyField(
        'kaizens.Kaizen',
        related_name='voting_sessions',
        blank=True,
    )
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='voting_sessions_opened'
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'kaizen_voting_sessions'
        unique_together = ['month', 'year']
        ordering = ['-year', '-opened_at']

    def __str__(self):
        status = 'Open' if self.is_open else 'Closed'
        return f"Voting — {self.month} {self.year} ({status})"


class CftVote(models.Model):
    """
    Individual CFT member vote on a Kaizen.
    Supports ranks 1, 2, and 3.
    """
    session = models.ForeignKey(
        VotingSession,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='cft_votes'
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='cft_votes'
    )
    rank = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text='Rank: 1 = Best, 2 = Second, 3 = Third'
    )
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kaizen_votes'
        unique_together = ['session', 'voter', 'kaizen']
        ordering = ['rank']

    def __str__(self):
        return f"{self.voter.get_full_name()} → {self.kaizen.sr_no} (Rank {self.rank})"
