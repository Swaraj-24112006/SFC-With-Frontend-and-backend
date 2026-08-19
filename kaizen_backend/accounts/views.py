"""
Accounts Views — Authentication, Profile, User Management
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from django.conf import settings

from .models import CustomUser, Role
from .serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserListSerializer,
    PasswordChangeSerializer,
    RoleSerializer,
)
from .permissions import IsAdmin
from core.redis_client import (
    create_session,
    delete_session,
    delete_all_user_sessions,
)

# Name of the HttpOnly cookie carrying the Redis session ID
SESSION_COOKIE_NAME = 'kspg_sid'


class LoginView(generics.GenericAPIView):
    """
    POST /api/v1/auth/login/
    ─────────────────────────
    Authenticates the user, issues JWT tokens, and creates a Redis session.
    Sets an HttpOnly, SameSite=Lax `kspg_sid` cookie containing the session ID.

    Security measures:
    - Session fixation: brand-new session ID on every login
    - Concurrent sessions: max 5 per user (oldest auto-evicted via Redis)
    - Generic error: never reveals which field (username or password) is wrong
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        # ── Generic guard (never say which field is wrong) ────────────────────
        if not username or not password:
            return self._auth_failed()

        # ── Authenticate against Django user model ─────────────────────────────
        user = authenticate(request, username=username, password=password)
        if user is None:
            return self._auth_failed()

        if not user.is_active:
            return self._auth_failed()

        # ── Issue JWT tokens ──────────────────────────────────────────────────
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        jti = str(access_token.get('jti', ''))

        # ── Create Redis session (session fixation prevention: always new ID) ─
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:512]
        session_id = create_session(
            user_id=user.pk,
            username=user.username,
            user_agent=user_agent,
            jti=jti,
        )

        # ── Update last login ─────────────────────────────────────────────────
        CustomUser.objects.filter(pk=user.pk).update(
            last_login=timezone.now(),
            last_activity=timezone.now(),
        )

        # ── Build response ────────────────────────────────────────────────────
        response_data = {
            'success': True,
            'data': {
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh),
                },
            },
        }

        response = Response(response_data, status=status.HTTP_200_OK)

        # ── Set HttpOnly session cookie ───────────────────────────────────────
        cookie_age = getattr(settings, 'SESSION_COOKIE_AGE', 3600)
        is_secure = getattr(settings, 'SESSION_COOKIE_SECURE', False)

        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_id,
            max_age=cookie_age,
            httponly=True,                  # Not accessible via JavaScript
            secure=is_secure,               # True in HTTPS production
            samesite='Lax',                 # Mitigates CSRF; works with CORS
            path='/',
        )

        return response

    @staticmethod
    def _auth_failed():
        """Generic 401 — never reveals which field is wrong."""
        return Response(
            {
                'success': False,
                'error': {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Invalid username or password.',
                    'details': {},
                },
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )


class LogoutView(generics.GenericAPIView):
    """
    POST /api/v1/auth/logout/
    ─────────────────────────
    Full session invalidation:
    1. Deletes the Redis session record (immediate effect — cookie becomes worthless)
    2. Blacklists the SimpleJWT refresh token (prevents token reuse)
    3. Clears the kspg_sid cookie from the browser
    """
    permission_classes = [AllowAny]   # AllowAny so expired-token users can still log out

    def post(self, request):
        # ── 1. Delete Redis session ───────────────────────────────────────────
        session_id = request.COOKIES.get(SESSION_COOKIE_NAME)
        if session_id:
            delete_session(session_id)

        # ── 2. Blacklist refresh token ────────────────────────────────────────
        refresh_token_str = request.data.get('refresh')
        if refresh_token_str:
            try:
                token = RefreshToken(refresh_token_str)
                token.blacklist()
            except (TokenError, Exception):
                pass    # Already invalid — that's fine

        # ── 3. Clear the session cookie ───────────────────────────────────────
        response = Response(
            {'success': True, 'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            path='/',
            samesite='Lax',
        )

        return response


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
