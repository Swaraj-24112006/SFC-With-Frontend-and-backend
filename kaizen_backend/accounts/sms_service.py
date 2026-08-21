"""
SMS Service — Twilio Integration for KSPG Kaizen Platform
===========================================================
Handles SMS OTP delivery with E.164 formatting, error resilience,
and structured security auditing.
"""

import logging
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger('kaizen')


def format_to_e164(phone: str, default_country_code: str = '+91') -> str:
    """
    Normalizes a phone number to standard E.164 format.
    Example: '9876543210' -> '+919876543210'
             '+19518779367' -> '+19518779367'
    """
    if not phone:
        return ""
    clean = "".join(c for c in phone.strip() if c.isdigit() or c == '+')
    if clean.startswith('+'):
        return clean
    
    # Check length
    digits_only = "".join(c for c in clean if c.isdigit())
    if len(digits_only) == 10:
        # If it matches the twilio sender or US format
        if digits_only == '9518779367':
            return f"+1{digits_only}"
        return f"{default_country_code}{digits_only}"
    elif len(digits_only) == 11 and digits_only.startswith('1'):
        return f"+{digits_only}"
    elif len(digits_only) == 12 and digits_only.startswith('91'):
        return f"+{digits_only}"
    
    return f"+{digits_only}" if digits_only else clean


def send_password_reset_sms(to_phone: str, otp_code: str) -> dict:
    """
    Sends a 6-digit password reset OTP to the destination phone number via Twilio SMS.
    
    Returns:
        dict: {'success': bool, 'message_sid': str or None, 'error': str or None}
    """
    if not to_phone:
        logger.warning("SMS dispatch aborted: No destination phone number provided.")
        return {'success': False, 'message_sid': None, 'error': 'No phone number provided'}

    formatted_phone = format_to_e164(to_phone)
    message_body = (
        f"Your KSPG Kaizen password reset code is {otp_code}. "
        f"This code is valid for 5 minutes. "
        f"Please do not share this code with anyone."
    )

    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
    from_phone = getattr(settings, 'TWILIO_PHONE_NUMBER', None)

    if not account_sid or not auth_token or not from_phone:
        logger.warning("Twilio credentials not configured in settings. Skipping real SMS dispatch.")
        return {
            'success': False,
            'message_sid': None,
            'error': 'Twilio credentials not configured'
        }

    # Format from_phone to E.164 if needed
    from_phone_e164 = format_to_e164(from_phone, default_country_code='+1')

    # In DEBUG mode, always print to console so developers can test without Twilio blocks
    if getattr(settings, 'DEBUG', True):
        print(f"\n=======================================================", flush=True)
        print(f" [DEV SMS OTP] Destination : {formatted_phone}", flush=True)
        print(f" [DEV SMS OTP] 6-Digit Code: {otp_code}", flush=True)
        print(f" [DEV SMS OTP] Message     : {message_body}", flush=True)
        print(f"=======================================================\n", flush=True)

    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=message_body,
            from_=from_phone_e164,
            to=formatted_phone
        )
        logger.info(
            f"SMS OTP dispatched successfully via Twilio: "
            f"to={formatted_phone[:5]}***{formatted_phone[-3:]}, SID={message.sid}"
        )
        return {
            'success': True,
            'message_sid': message.sid,
            'error': None
        }
    except TwilioRestException as exc:
        logger.error(
            f"Twilio API error sending SMS to {formatted_phone[:5]}***: "
            f"Code={exc.code}, Message={exc.msg}"
        )
        if exc.code == 572002 or exc.code == 21608:
            logger.warning(
                f"[TWILIO TRIAL ACCOUNT] Destination {formatted_phone} is not a verified Caller ID in Twilio Console. "
                f"For real SMS delivery on trial accounts, verify this number at https://console.twilio.com/us1/develop/phone-numbers/manage/verified"
            )
        return {
            'success': False,
            'message_sid': None,
            'error': f"Twilio error ({exc.code}): {exc.msg}"
        }
    except Exception as exc:
        logger.exception(f"Unexpected error sending SMS via Twilio: {exc}")
        return {
            'success': False,
            'message_sid': None,
            'error': str(exc)
        }

