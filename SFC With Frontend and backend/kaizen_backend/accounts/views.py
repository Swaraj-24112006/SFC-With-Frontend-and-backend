"""
Accounts Views — Registration, Profile, User Management
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import CustomUser, Role
from .serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserListSerializer,
    PasswordChangeSerializer,
    RoleSerializer,
)
from .permissions import IsAdmin


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/
    Register a new user account.
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)

        return Response({
            'success': True,
            'message': 'Registration successful.',
            'data': {
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }
        }, status=status.HTTP_201_CREATED)


class LogoutView(generics.GenericAPIView):
    """
    POST /api/v1/auth/logout/
    Blacklist the refresh token to log out.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({
                'success': True,
                'message': 'Logout successful.'
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired refresh token.',
                    'details': {},
                }
            }, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(generics.GenericAPIView):
    """
    POST /api/v1/auth/password/change/
    Change the authenticated user's password.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        return Response({
            'success': True,
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PUT/PATCH /api/v1/auth/profile/
    Retrieve or update the current user's profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Update last activity timestamp
        user = self.request.user
        CustomUser.objects.filter(pk=user.pk).update(last_activity=timezone.now())
        return user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'data': serializer.data,
        })


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin endpoints for user management.
    GET /api/v1/users/ — List all users
    GET /api/v1/users/<id>/ — User detail
    PUT/PATCH /api/v1/users/<id>/ — Update user
    POST /api/v1/users/<id>/toggle-active/ — Enable/disable user
    """
    queryset = CustomUser.objects.select_related('role').all()
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        return UserProfileSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Optional filters
        department = request.query_params.get('department')
        plant = request.query_params.get('plant')
        role = request.query_params.get('role')
        is_active = request.query_params.get('is_active')

        if department:
            queryset = queryset.filter(department__icontains=department)
        if plant:
            queryset = queryset.filter(plant__icontains=plant)
        if role:
            queryset = queryset.filter(role__name=role)
        if is_active is not None:
            queryset = queryset.filter(is_active_employee=is_active.lower() == 'true')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle a user's active employee status."""
        user = self.get_object()
        user.is_active_employee = not user.is_active_employee
        user.save(update_fields=['is_active_employee'])
        return Response({
            'success': True,
            'message': f'User {"activated" if user.is_active_employee else "deactivated"}.',
            'data': {'is_active_employee': user.is_active_employee},
        })


class RoleViewSet(viewsets.ModelViewSet):
    """
    Admin endpoints for role management.
    GET /api/v1/roles/ — List roles
    POST /api/v1/roles/ — Create role
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})
