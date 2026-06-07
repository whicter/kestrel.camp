"""
Notification sender. Logs to console in development, SendGrid in production.
"""
import logging
from ..config import settings

logger = logging.getLogger(__name__)


async def send_alert_notification(
    *,
    user_email: str,
    campground_name: str,
    park_name: str,
    date_from: str,
    date_to: str,
    available_count: int,
    booking_url: str,
) -> None:
    subject = f"🏕️ {available_count} site{'s' if available_count > 1 else ''} open — {campground_name}"

    body = f"""
Hi there,

A campsite you're watching just became available!

  Campground:  {campground_name}
  Park:        {park_name}
  Dates:       {date_from} → {date_to}
  Sites open:  {available_count}

Book now before they're gone:
  {booking_url}

— Kestrel
"""

    if settings.sendgrid_api_key:
        await _send_sendgrid(user_email, subject, body)
    else:
        logger.info("📧 [DEV EMAIL] To: %s\nSubject: %s\n%s", user_email, subject, body)


async def _send_sendgrid(to: str, subject: str, body: str) -> None:
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        message = Mail(
            from_email="whicter.han@gmail.com",
            to_emails=to,
            subject=subject,
            plain_text_content=body,
        )
        resp = sg.client.mail.send.post(request_body=message.get())
        logger.info("📧 Email sent to %s (status %s)", to, resp.status_code)
    except Exception as e:
        logger.error("SendGrid error: %s", e)
