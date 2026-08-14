"""
Accounts Models — CustomUser and Role
======================================
Extends Django's AbstractUser with manufacturing-specific fields:
employee_id, department, designation, plant, area, and role assignment.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    """
    Kaizen system roles controlling access permissions.
    Roles: initiator, reviewer, kaizen_lead, cft_member, verifier, admin
    """
    ROLE_CHOICES = [
        ('initiator', 'Initiator'),
        ('reviewer', 'Reviewer / Manager'),
        ('kaizen_lead', 'Kaizen Lead / CFT Member'),
        ('cft_member', 'CFT Member'),
        ('verifier', 'Verifier'),
        ('admin', 'Administrator'),
    ]

    name = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)
    description = models.TextField(blank=True)
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text='Granular permission map for this role'
    )

    class Meta:
        db_table = 'roles'
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()


class CustomUser(AbstractUser):
    """
    Extended user model for the Kaizen system.
    Stores employee details relevant to the manufacturing context.
    """
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique employee identifier (e.g., EMP-001)'
    )
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    plant = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    is_active_employee = models.BooleanField(
        default=True,
        help_text='Whether this employee is currently active in the system'
    )
    last_activity = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'users'
        ordering = ['employee_id']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['department']),
            models.Index(fields=['plant']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.employee_id})"

    @property
    def role_name(self):
        return self.role.name if self.role else 'initiator'

    def has_kaizen_permission(self, permission):
        """Check if user has a specific Kaizen permission via their role."""
        if not self.role:
            return False
        if self.role.name == 'admin':
            return True
        return self.role.permissions.get(permission, False)
