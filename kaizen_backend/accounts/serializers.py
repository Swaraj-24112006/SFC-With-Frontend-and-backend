"""
Accounts Serializers — Registration, Login, User Management
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration with password validation."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'employee_id', 'department',
            'designation', 'plant', 'area', 'phone', 'role',
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'employee_id': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing/updating user profiles."""
    role_detail = RoleSerializer(source='role', read_only=True)
    full_name = serializers.SerializerMethodField()
    role_category = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'employee_id', 'department', 'designation',
            'plant', 'area', 'phone', 'role', 'role_detail',
            'role_category',
            'is_active_employee', 'last_activity', 'date_joined',
            'last_login',
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'last_login', 'last_activity']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_role_category(self, obj) -> str:
        """
        Returns the normalised RBAC category string for the frontend.
        One of: 'initiator' | 'coordinator' | 'committee' | 'admin'
        """
        return obj.role_category


class UserListSerializer(serializers.ModelSerializer):
    """Compact serializer for user listings."""
    role_name = serializers.CharField(source='role.get_name_display', read_only=True, default='Initiator')
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'employee_id', 'full_name', 'department',
            'designation', 'plant', 'area', 'role', 'role_name',
            'is_active_employee',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value
