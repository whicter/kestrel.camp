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
    subject = f"🏕️ {available_count} site{'s' if available_count > 1 else ''} available — {campground_name}"

    sites_label = f"{available_count} site{'s' if available_count > 1 else ''} open"

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;">
          <span style="font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">🪶 Kestrel</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid #e5e5e3;border-radius:12px;padding:32px;">

          <!-- Status pill -->
          <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:4px 12px;margin-bottom:20px;">
            <span style="font-size:12px;font-weight:600;color:#16a34a;">● Available now</span>
          </div>

          <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.3;">
            {campground_name}
          </h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">{park_name}</p>

          <!-- Details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;width:90px;">Dates</td>
              <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a;">{date_from} → {date_to}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;">Available</td>
              <td style="padding:6px 0;font-size:13px;font-weight:600;color:#16a34a;">{sites_label}</td>
            </tr>
          </table>

          <!-- CTA -->
          <a href="{booking_url}" style="display:block;background:#1a1a1a;color:#ffffff;text-align:center;text-decoration:none;font-size:14px;font-weight:600;padding:13px 24px;border-radius:8px;">
            Book now →
          </a>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;font-size:12px;color:#9ca3af;">
          You're receiving this because you set a Kestrel alert for this campground.<br>
          <a href="https://www.kestrel-camp.com/alerts" style="color:#9ca3af;">Manage alerts</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    plain_body = f"""A campsite you're watching is now available!

{campground_name} — {park_name}
Dates: {date_from} → {date_to}
Sites open: {available_count}

Book now: {booking_url}

— Kestrel
Manage alerts: https://www.kestrel-camp.com/alerts
"""

    if settings.sendgrid_api_key:
        await _send_sendgrid(user_email, subject, html_body, plain_body)
    else:
        logger.info("📧 [DEV EMAIL] To: %s\nSubject: %s\n%s", user_email, subject, plain_body)


async def _send_sendgrid(to: str, subject: str, html_body: str, plain_body: str) -> None:
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, TrackingSettings, ClickTracking
        sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        message = Mail(
            from_email="noreply@kestrel-camp.com",
            to_emails=to,
            subject=subject,
            html_content=html_body,
            plain_text_content=plain_body,
        )
        tracking = TrackingSettings()
        tracking.click_tracking = ClickTracking(enable=False, enable_text=False)
        message.tracking_settings = tracking
        resp = sg.client.mail.send.post(request_body=message.get())
        logger.info("📧 Email sent to %s (status %s)", to, resp.status_code)
    except Exception as e:
        logger.error("SendGrid error: %s", e)
