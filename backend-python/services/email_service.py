import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
import os


def _status_badge_style(status: str) -> str:
    styles = {
        "Created": "background:#ede9fe;color:#5b21b6;",
        "Assigned": "background:#fef3c7;color:#92400e;",
        "Fixed": "background:#dbeafe;color:#1e40af;",
        "Closed": "background:#d1fae5;color:#065f46;",
    }
    return styles.get(status, "background:#f3f4f6;color:#374151;")


async def _send(to: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Support System <{os.getenv('EMAIL_USERNAME')}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=os.getenv("SMTP_SERVER"),
        port=int(os.getenv("SMTP_PORT", 587)),
        username=os.getenv("EMAIL_USERNAME"),
        password=os.getenv("EMAIL_PASSWORD"),
        start_tls=True,
    )


async def send_ticket_created_email(ticket: dict):
    try:
        created_at = ticket.get("createdAt", datetime.utcnow())
        if isinstance(created_at, datetime):
            created_str = created_at.strftime("%d %b %Y, %I:%M %p")
        else:
            created_str = str(created_at)

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#4f46e5;padding:24px;text-align:center;">
            <h2 style="color:white;margin:0;font-size:20px;">Support Ticket Created</h2>
          </div>
          <div style="padding:28px;">
            <p style="color:#374151;font-size:15px;">Hi, a new support ticket has been submitted. Here are the details:</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;width:35%;">Ticket ID</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace;color:#4f46e5;font-size:13px;">{ticket['ticketId']}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Issue</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;font-size:13px;">{ticket['issueDescription']}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Contact</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;font-size:13px;">{ticket['contact']} ({ticket['contactType']})</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Status</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:13px;"><span style="background:#ede9fe;color:#5b21b6;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:bold;">Created</span></td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Created At</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;font-size:13px;">{created_str}</td>
              </tr>
            </table>
            <p style="margin-top:24px;color:#6b7280;font-size:13px;">Our support team will review your request and get back to you shortly.</p>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">This is an automated message from the Support System.</p>
          </div>
        </div>
        """

        to_email = (
            ticket["contact"]
            if ticket["contactType"] == "email"
            else os.getenv("EMAIL_USERNAME")
        )
        await _send(to_email, f"[{ticket['ticketId']}] Your support ticket has been created", html)
    except Exception as e:
        print(f"Ticket created email error: {e}")


async def send_ticket_status_email(ticket: dict):
    try:
        status = ticket.get("status", "")
        badge_style = _status_badge_style(status)
        notes = ticket.get("notes", "")
        notes_row = f"""
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Admin Notes</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;font-size:13px;">{notes}</td>
              </tr>""" if notes else ""

        closing = (
            "Your ticket has been closed. Thank you for contacting support!"
            if status == "Closed"
            else "Our team is working on your issue. We will keep you updated."
        )

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#4f46e5;padding:24px;text-align:center;">
            <h2 style="color:white;margin:0;font-size:20px;">Ticket Status Updated</h2>
          </div>
          <div style="padding:28px;">
            <p style="color:#374151;font-size:15px;">Your support ticket status has been updated.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;width:35%;">Ticket ID</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace;color:#4f46e5;font-size:13px;">{ticket['ticketId']}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Issue</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;font-size:13px;">{ticket['issueDescription']}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">New Status</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:13px;"><span style="{badge_style}padding:2px 10px;border-radius:20px;font-size:12px;font-weight:bold;">{status}</span></td>
              </tr>
              {notes_row}
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:bold;color:#6b7280;font-size:13px;">Contact</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;font-size:13px;">{ticket['contact']} ({ticket['contactType']})</td>
              </tr>
            </table>
            <p style="margin-top:24px;color:#6b7280;font-size:13px;">{closing}</p>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">This is an automated message from the Support System.</p>
          </div>
        </div>
        """

        to_email = (
            ticket["contact"]
            if ticket["contactType"] == "email"
            else os.getenv("EMAIL_USERNAME")
        )
        await _send(to_email, f"[{ticket['ticketId']}] Ticket status updated to: {status}", html)
    except Exception as e:
        print(f"Status update email error: {e}")
