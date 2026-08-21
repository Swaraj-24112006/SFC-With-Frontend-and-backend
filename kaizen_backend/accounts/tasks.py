"""
Celery Background Tasks for Accounts App
==========================================
Handles asynchronous SMS dispatch and notification background jobs.
"""

import logging
from celery import shared_task
from .sms_service import send_password_reset_sms

logger = logging.getLogger('kaizen')


@shared_task(bind=True, max_retries=3, default_retry_delay=10, name='accounts.send_password_reset_sms_task')
def send_password_reset_sms_task(self, phone_number: str, otp_code: str):
    """
    Celery task to asynchronously dispatch an SMS OTP via Twilio.
    """
    logger.info(f"Executing async SMS task for destination: {phone_number[:5]}***")
    result = send_password_reset_sms(phone_number, otp_code)
    if not result.get('success'):
        error_msg = result.get('error', 'Unknown error')
        logger.warning(f"SMS task encountered an issue: {error_msg}")
    return result


def dispatch_sms_otp(phone_number: str, otp_code: str) -> None:
    """
    Helper to dispatch SMS OTP asynchronously via Celery.
    Gracefully falls back to inline execution if Celery broker/worker is unavailable.
    """
    if not phone_number:
        return

    try:
        # Try async dispatch via Celery
        send_password_reset_sms_task.delay(phone_number, otp_code)
        logger.info(f"Dispatched SMS task to Celery queue for {phone_number[:5]}***")
    except Exception as exc:
        logger.warning(f"Celery queue unavailable ({exc}). Executing SMS inline.")
        try:
            send_password_reset_sms(phone_number, otp_code)
        except Exception as inner_exc:
            logger.exception(f"Inline SMS delivery failed: {inner_exc}")
