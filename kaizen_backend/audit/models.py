"""
Audit Trail Models — Immutable activity log
"""

from django.db import models
from django.conf import settings
import json


class AuditLog(models.Model):
    """
    Immutable audit log entry.
    Records every significant action in the Kaizen system.
    """
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('submit', 'Submit'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('rework', 'Rework'),
        ('classify', 'Classify'),
        ('impact_review', 'Impact Review'),
        ('action_assign', 'Action Assignment'),
        ('action_update', 'Action Update'),
        ('action_complete', 'Action Completion'),
        ('verify', 'Verify'),
        ('vote', 'Vote'),
        ('close', 'Close'),
        ('evidence_upload', 'Evidence Upload'),
        ('evidence_delete', 'Evidence Delete'),
        ('resource_allocate', 'Resource Allocate'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    previous_value = models.TextField(blank=True, help_text='JSON snapshot of previous state')
    new_value = models.TextField(blank=True, help_text='JSON snapshot of new state')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    remarks = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['kaizen']),
            models.Index(fields=['action']),
            models.Index(fields=['-timestamp']),
        ]
        # Make audit logs immutable — no update or delete
        managed = True

    def __str__(self):
        user_name = self.user.get_full_name() if self.user else 'System'
        kaizen_ref = self.kaizen.sr_no if self.kaizen else 'N/A'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {user_name} → {self.get_action_display()} on {kaizen_ref}"

    def save(self, *args, **kwargs):
        # Only allow creation, not updates
        if self.pk:
            return  # Silently refuse updates — audit logs are immutable
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Prevent deletion of audit logs
        return  # Silently refuse deletion


def create_audit_log(user, action, kaizen=None, previous_value=None, new_value=None,
                     remarks='', ip_address=None):
    """
    Utility function to create an audit log entry.
    Call this from views whenever a significant action occurs.
    """
    return AuditLog.objects.create(
        user=user,
        kaizen=kaizen,
        action=action,
        previous_value=json.dumps(previous_value) if previous_value else '',
        new_value=json.dumps(new_value) if new_value else '',
        remarks=remarks,
        ip_address=ip_address,
    )
