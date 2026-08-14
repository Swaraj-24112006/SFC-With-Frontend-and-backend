"""
Kaizen Serializers — Serialization for Kaizen CRUD operations
"""

from rest_framework import serializers
from .models import Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving
from accounts.serializers import UserListSerializer


class KaizenBenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = KaizenBenefit
        fields = ['productivity', 'quality', 'cost', 'delivery', 'safety', 'morale']


class KaizenEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = KaizenEvidence
        fields = [
            'id', 'evidence_type', 'file', 'original_filename',
            'file_size', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'file_size']


class KaizenCostSavingSerializer(serializers.ModelSerializer):
    class Meta:
        model = KaizenCostSaving
        fields = ['savings_inr', 'monthly_savings', 'annual_savings', 'calculation_notes']


class KaizenListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views."""
    benefits = KaizenBenefitSerializer(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    reviewer_name = serializers.CharField(
        source='assigned_reviewer.get_full_name', read_only=True, default=None
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    classification_display = serializers.CharField(source='get_classification_display', read_only=True)
    days_to_implement = serializers.IntegerField(read_only=True)

    class Meta:
        model = Kaizen
        fields = [
            'id', 'sr_no', 'month', 'suggestion_date', 'title',
            'area', 'mini_factory', 'location', 'machine',
            'cost_save', 'idea_by', 'implemented_by',
            'status', 'status_display', 'classification', 'classification_display',
            'benefits', 'created_by', 'created_by_name',
            'assigned_reviewer', 'reviewer_name',
            'days_to_implement', 'created_at',
        ]


class KaizenDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views and creation."""
    benefits = KaizenBenefitSerializer(required=False)
    cost_saving_detail = KaizenCostSavingSerializer(required=False, read_only=True)
    evidence_files = KaizenEvidenceSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    reviewer_name = serializers.CharField(
        source='assigned_reviewer.get_full_name', read_only=True, default=None
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    classification_display = serializers.CharField(source='get_classification_display', read_only=True)
    days_to_implement = serializers.IntegerField(read_only=True)
    days_to_close = serializers.IntegerField(read_only=True)
    is_editable = serializers.BooleanField(read_only=True)

    class Meta:
        model = Kaizen
        fields = [
            'id', 'sr_no', 'month', 'suggestion_date', 'title',
            'problem_before', 'counter_measure_after',
            'area', 'mini_factory', 'location', 'machine',
            'closing_target_date', 'implementation_date',
            'cost_save', 'idea_by', 'implemented_by', 'prepared_by',
            'approved_by', 'verified_by_name',
            'status', 'status_display', 'classification', 'classification_display',
            'remark', 'result',
            'photo_before', 'photo_after',
            'benefits', 'cost_saving_detail', 'evidence_files',
            'created_by', 'created_by_name',
            'assigned_reviewer', 'reviewer_name',
            'days_to_implement', 'days_to_close', 'is_editable',
            'created_at', 'updated_at', 'submitted_at',
        ]
        read_only_fields = [
            'id', 'sr_no', 'created_by', 'created_at', 'updated_at', 'submitted_at',
        ]

    def create(self, validated_data):
        benefits_data = validated_data.pop('benefits', None)
        kaizen = Kaizen.objects.create(**validated_data)

        # Create benefits
        if benefits_data:
            KaizenBenefit.objects.create(kaizen=kaizen, **benefits_data)
        else:
            KaizenBenefit.objects.create(kaizen=kaizen)

        return kaizen

    def update(self, instance, validated_data):
        benefits_data = validated_data.pop('benefits', None)

        # Update Kaizen fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update benefits if provided
        if benefits_data is not None:
            benefit, created = KaizenBenefit.objects.get_or_create(kaizen=instance)
            for attr, value in benefits_data.items():
                setattr(benefit, attr, value)
            benefit.save()

        return instance


class KaizenSubmitSerializer(serializers.Serializer):
    """Serializer for Kaizen submission action."""
    assigned_reviewer = serializers.IntegerField(
        required=False,
        help_text='ID of the reviewer to assign'
    )


class KaizenCostSavingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating cost savings detail."""
    class Meta:
        model = KaizenCostSaving
        fields = ['savings_inr', 'monthly_savings', 'annual_savings', 'calculation_notes']
