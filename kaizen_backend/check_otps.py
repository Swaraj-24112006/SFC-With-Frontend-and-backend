import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kaizen_backend.settings')
django.setup()

from accounts.models import CustomUser, PasswordResetOTP

user = CustomUser.objects.get(username='test_user_1')
otps = PasswordResetOTP.objects.filter(user=user).order_by('-created_at')

print(f"User: {user.username}, Phone: {user.phone}")
for otp in otps:
    print(f"OTP - Created: {otp.created_at}, Is Used: {otp.is_used}, Attempts: {otp.attempt_count}")
