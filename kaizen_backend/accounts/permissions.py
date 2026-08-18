"""
Accounts Permissions — Role-based access control for Kaizen system.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to administrators."""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role and
            request.user.role.name == 'admin'
        )


class IsInitiator(BasePermission):
    """Allow access to initiators (and above roles)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # All authenticated users can act as initiators
        return True


class IsReviewer(BasePermission):
    """Allow access to reviewers / managers."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.name in ('reviewer', 'kaizen_lead', 'admin')


class IsKaizenLead(BasePermission):
    """Allow access to Kaizen leads / CFT leads."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.name in ('kaizen_lead', 'admin')


class IsCftMember(BasePermission):
    """Allow access to CFT members for voting."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.name in ('cft_member', 'kaizen_lead', 'reviewer', 'admin')


class IsVerifier(BasePermission):
    """Allow access to verifiers."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.name in ('verifier', 'kaizen_lead', 'admin')


class IsOwnerOrAdmin(BasePermission):
    """Allow access to the resource owner or administrators."""
    def has_object_permission(self, request, view, obj):
        if request.user.role and request.user.role.name == 'admin':
            return True
        # Check if object has a created_by or user field
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsActionOwner(BasePermission):
    """Allow access to the assigned action owner."""
    def has_object_permission(self, request, view, obj):
        if request.user.role and request.user.role.name == 'admin':
            return True
        if hasattr(obj, 'assigned_to'):
            return obj.assigned_to == request.user
        return False


class IsReviewerOrAdmin(BasePermission):
    """Allow access to reviewers and administrators."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.name in ('reviewer', 'kaizen_lead', 'admin')
