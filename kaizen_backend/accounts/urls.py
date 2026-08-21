"""
Accounts URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    RegisterView,
    LogoutView,
    PasswordChangeView,
    ForgotPasswordRequestView,
    VerifyOTPView,
    ResetPasswordView,
    PasswordResetRequestView,
    OTPVerifyView,
    ProfileView,
    UserViewSet,
    RoleViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')

urlpatterns = [
    # Authentication — custom secure login with Redis session + HttpOnly cookie
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Password reset via SMS OTP (Standard Checklist Endpoints)
    path('forgot-password/', ForgotPasswordRequestView.as_view(), name='forgot-password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),

    # Backward compatibility aliases
    path('password/reset/', ForgotPasswordRequestView.as_view(), name='password-reset'),
    path('otp/verify/', VerifyOTPView.as_view(), name='otp-verify'),

    # Token refresh (uses cookie refresh token if needed)
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Profile & password
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    path('profile/', ProfileView.as_view(), name='profile'),

    # User & Role management (admin)
    path('', include(router.urls)),
]
