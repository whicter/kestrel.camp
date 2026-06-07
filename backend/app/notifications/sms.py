"""
SMS notifications via Twilio.
Fires whenever a user has notify_sms=True and a phone number set.
"""
import logging
from ..config import settings

logger = logging.getLogger(__name__)


async def send_sms_notification(
    *,
    user_phone: str,
    campground_name: str,
    park_name: str,
    date_from: str,
    date_to: str,
    available_count: int,
    booking_url: str,
) -> None:
    body = (
        f"🏕️ Kestrel: {available_count} site{'s' if available_count > 1 else ''} open at "
        f"{campground_name} ({date_from} → {date_to}). "
        f"Book now: {booking_url}"
    )

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.info("📱 [DEV SMS] To: %s\n%s", user_phone, body)
        return

    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        message = client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=user_phone,
        )
        logger.info("📱 SMS sent to %s — SID: %s", user_phone, message.sid)
    except Exception as e:
        logger.error("Twilio error sending to %s: %s", user_phone, e)
