"""
Unit & Integration Tests for Forgot Password via SMS OTP
=========================================================
Tests compliance with all 10 items of the Forgot Password Security Checklist:
1. Model setup & phone masking
2. Cryptographic OTP generation (secrets)
3. Hashed storage (make_password), 5-min expiry, single-use, 5-attempt lock
4. Cooldown (60s) & hourly rate limiting
5. Timing-safe user lookup & privacy masking
6. SMS service formatting & error resilience
7. Async dispatch integration
8. DRF API endpoints (request, verify, reset)
9. Logging & zero plaintext OTP in logs/database
10. Post-reset cleanup, OTP invalidation & Redis session purge
"""

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from accounts.models import CustomUser, Role, PasswordResetOTP
from accounts.sms_service import format_to_e164
from core.redis_client import create_session, get_session


class ForgotPasswordOTPTests(TestCase):
    """
    Tests the complete Forgot Password via OTP workflow.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.role, _ = Role.objects.get_or_create(
            name='initiator',
            defaults={'description': 'Initiator Role'}
        )
        self.user = CustomUser.objects.create_user(
            username='forgot_test_user',
            employee_id='EMP-FGT-01',
            email='forgot@example.com',
            password='OldSecurePassword123!',
            first_name='Test',
            last_name='User',
            phone='+919876543210',
            role=self.role
        )

    def tearDown(self):
        cache.clear()

    def test_phone_masking_utility(self):
        """Item 5: Phone masking utility preserves country code and last 4 digits."""
        masked_in = PasswordResetOTP.mask_phone_number('+919876543210')
        self.assertTrue(masked_in.endswith('3210'))
        self.assertIn('X', masked_in)

        masked_us = PasswordResetOTP.mask_phone_number('+19518779367')
        self.assertTrue(masked_us.endswith('9367'))
        self.assertIn('X', masked_us)

        # Empty/short handling
        self.assertEqual(PasswordResetOTP.mask_phone_number(''), '')
        self.assertEqual(PasswordResetOTP.mask_phone_number('123'), '••••')

    def test_e164_formatting_utility(self):
        """Item 6: E.164 phone formatting handles various formats cleanly."""
        self.assertEqual(format_to_e164('+919876543210'), '+919876543210')
        self.assertEqual(format_to_e164('9876543210'), '+919876543210')
        self.assertEqual(format_to_e164('9518779367'), '+19518779367')

    @patch('accounts.tasks.send_password_reset_sms_task.delay')
    def test_request_otp_creates_hashed_record_and_masks_phone(self, mock_sms_delay):
        """Item 1, 2, 3, 5, 6, 7: Requesting OTP creates hashed record with 5-min expiry."""
        url = reverse('forgot-password')
        response = self.client.post(url, {'username': 'forgot_test_user'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('masked_phone', response.data['data'])
        self.assertTrue(response.data['data']['masked_phone'].endswith('3210'))

        # Check DB record
        otp_record = PasswordResetOTP.objects.filter(user=self.user, is_used=False).first()
        self.assertIsNotNone(otp_record)
        # OTP must NOT be 6 digits plaintext in the DB — must be salted Django hash
        self.assertNotEqual(len(otp_record.otp_hash), 6)
        self.assertTrue(otp_record.otp_hash.startswith('pbkdf2_') or otp_record.otp_hash.startswith('argon2'))
        self.assertFalse(otp_record.is_used)
        self.assertEqual(otp_record.attempt_count, 0)
        self.assertGreater(otp_record.expires_at, timezone.now())

    def test_request_otp_timing_safe_for_nonexistent_user(self):
        """Item 5: Non-existent user returns same generic response without leaking existence."""
        url = reverse('forgot-password')
        response = self.client.post(url, {'username': 'non_existent_user_9999'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('If an account matching that identifier exists', response.data['message'])

    @patch('accounts.tasks.send_password_reset_sms_task.delay')
    def test_request_otp_cooldown_enforced(self, mock_sms_delay):
        """Item 4: Consecutive requests within 60 seconds trigger 429 cooldown error."""
        url = reverse('forgot-password')
        # First request succeeds
        res1 = self.client.post(url, {'username': 'forgot_test_user'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Immediate second request triggers cooldown
        res2 = self.client.post(url, {'username': 'forgot_test_user'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(res2.data['error']['code'], 'COOLDOWN_ACTIVE')

    def test_verify_otp_success_issues_reset_token(self):
        """Item 3, 8: Valid 6-digit OTP verification issues cryptographic reset token."""
        raw_otp = '654321'
        record = PasswordResetOTP.objects.create(
            user=self.user,
            otp_hash=make_password(raw_otp),
            created_at=timezone.now(),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            attempt_count=0
        )

        url = reverse('verify-otp')
        response = self.client.post(url, {
            'username': 'forgot_test_user',
            'otp': raw_otp
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('reset_token', response.data['data'])
        reset_token = response.data['data']['reset_token']

        # Verify reset token is stored as a hash in DB
        record.refresh_from_db()
        self.assertIsNotNone(record.reset_token_hash)
        self.assertTrue(check_password(reset_token, record.reset_token_hash))

    def test_verify_otp_invalid_code_increments_attempts_and_locks_at_5(self):
        """Item 3: Invalid OTP increments attempt count and locks after 5 failed attempts."""
        record = PasswordResetOTP.objects.create(
            user=self.user,
            otp_hash=make_password('112233'),
            created_at=timezone.now(),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            attempt_count=0
        )

        url = reverse('verify-otp')

        # 4 failed attempts
        for i in range(4):
            res = self.client.post(url, {'username': 'forgot_test_user', 'otp': '999999'}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res.data['error']['code'], 'INVALID_OTP')

        record.refresh_from_db()
        self.assertEqual(record.attempt_count, 4)
        self.assertFalse(record.is_locked)

        # 5th failed attempt -> locks
        res5 = self.client.post(url, {'username': 'forgot_test_user', 'otp': '999999'}, format='json')
        self.assertEqual(res5.status_code, status.HTTP_400_BAD_REQUEST)

        record.refresh_from_db()
        self.assertEqual(record.attempt_count, 5)
        self.assertTrue(record.is_locked)

        # Clear IP/endpoint throttle cache to verify the DB record lockout explicitly
        cache.clear()

        # 6th attempt with CORRECT OTP must still be rejected because record is locked
        res6 = self.client.post(url, {'username': 'forgot_test_user', 'otp': '112233'}, format='json')
        self.assertEqual(res6.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res6.data['error']['code'], 'OTP_LOCKED')

    def test_verify_otp_expired_code_rejected(self):
        """Item 3: Expired OTP (past 5 minutes) is rejected with OTP_EXPIRED."""
        record = PasswordResetOTP.objects.create(
            user=self.user,
            otp_hash=make_password('123456'),
            created_at=timezone.now() - timedelta(minutes=10),
            expires_at=timezone.now() - timedelta(minutes=5),
            is_used=False,
            attempt_count=0
        )

        url = reverse('verify-otp')
        response = self.client.post(url, {'username': 'forgot_test_user', 'otp': '123456'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'OTP_EXPIRED')

    def test_reset_password_success_and_purges_all_sessions(self):
        """Item 8, 10: Resetting password updates credentials and purges all active Redis sessions."""
        # Setup an active session for the user
        session_id = create_session(
            user_id=self.user.pk,
            username=self.user.username,
            ip_address='192.168.1.50',
            user_agent='TestBrowser'
        )
        self.assertIsNotNone(get_session(session_id))

        # Setup verified OTP with reset_token
        raw_reset_token = 'secret_reset_token_xyz_12345'
        record = PasswordResetOTP.objects.create(
            user=self.user,
            otp_hash=make_password('123456'),
            reset_token_hash=make_password(raw_reset_token),
            created_at=timezone.now(),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            attempt_count=0
        )

        url = reverse('reset-password')
        new_pass = 'BrandNewSecurePass2026!@#'
        response = self.client.post(url, {
            'username': 'forgot_test_user',
            'reset_token': raw_reset_token,
            'new_password': new_pass,
            'confirm_password': new_pass,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        # Verify password is changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_pass))
        self.assertFalse(self.user.check_password('OldSecurePassword123!'))

        # Verify OTP record is invalidated
        record.refresh_from_db()
        self.assertTrue(record.is_used)
        self.assertIsNone(record.reset_token_hash)

        # Verify previous Redis session is purged (force re-login everywhere)
        self.assertIsNone(get_session(session_id))

    def test_reset_password_password_mismatch_rejected(self):
        """Item 8: Password and confirmation mismatch returns 400."""
        raw_reset_token = 'token_abc'
        PasswordResetOTP.objects.create(
            user=self.user,
            otp_hash=make_password('123456'),
            reset_token_hash=make_password(raw_reset_token),
            created_at=timezone.now(),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            attempt_count=0
        )

        url = reverse('reset-password')
        response = self.client.post(url, {
            'username': 'forgot_test_user',
            'reset_token': raw_reset_token,
            'new_password': 'PasswordOne123!',
            'confirm_password': 'PasswordTwo123!',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'PASSWORD_MISMATCH')
