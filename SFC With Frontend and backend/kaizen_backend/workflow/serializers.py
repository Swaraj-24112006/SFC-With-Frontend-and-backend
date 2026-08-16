"""
Workflow Serializers
"""

from rest_framework import serializers
from .models import WorkflowHistory


class WorkflowHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.username
        return 'Committee (Anonymous)'

    class Meta:
        model = WorkflowHistory
        fields = [
            'id', 'kaizen', 'action', 'action_display',
            'from_status', 'to_status',
            'performed_by', 'performed_by_name',
            'remarks', 'performed_at',
        ]
        read_only_fields = ['id', 'performed_at']


class ApproveSerializer(serializers.Serializer):
    """Serializer for approve action."""
    remarks = serializers.CharField(required=False, default='')
    classification = serializers.ChoiceField(
        choices=[('kaizen', 'Kaizen'), ('good_point', 'Good Point')],
        required=False,
        default='kaizen',
    )
    approved_by = serializers.CharField(
        required=False, default='',
        help_text='Name of the committee member who approved this Kaizen',
    )
    verified_by = serializers.CharField(
        required=False, default='',
        help_text='Name of the verifier / Kaizen Lead',
    )
    assigned_reviewer_id = serializers.IntegerField(
        required=False, default=None, allow_null=True,
        help_text='ID of the CustomUser assigned as reviewer',
    )


class RejectSerializer(serializers.Serializer):
    """Serializer for reject action — reason is required."""
    reason = serializers.CharField(required=False, default='Rejected by committee')
    remarks = serializers.CharField(required=False, default='')
    approved_by = serializers.CharField(required=False, default='')
    verified_by = serializers.CharField(required=False, default='')


class ReworkSerializer(serializers.Serializer):
    """Serializer for rework action."""
    remarks = serializers.CharField(required=False, default='Please revise and resubmit.')


class ClassifySerializer(serializers.Serializer):
    """Serializer for classification change."""
    classification = serializers.ChoiceField(
        choices=[
            ('kaizen', 'Kaizen'),
            ('good_point', 'Good Point'),
            ('pending', 'Pending'),
            ('none', 'None'),
        ],
        required=True,
    )
    remarks = serializers.CharField(required=False, default='')
