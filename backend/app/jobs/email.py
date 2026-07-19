from __future__ import annotations

import re
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from pathlib import Path

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "branding"

# (Content-ID used in the HTML via cid:..., filename in ASSETS_DIR)
INLINE_IMAGES = [
    ("ssicsim-logo", "WhiteLogo.png"),
    ("ssicsim-instagram", "icon-instagram.png"),
    ("ssicsim-website", "icon-website.png"),
]


def _replace_placeholders(template: str, data: dict[str, str]) -> str:
    return re.sub(r"\{(\w+)\}", lambda m: data.get(m.group(1), m.group(0)), template)


def _build_inline_images() -> list[MIMEImage]:
    # Images are embedded (Content-ID / cid:) rather than linked by URL — a linked
    # http://localhost URL is only reachable from the sender's own machine, not from
    # Gmail's servers or the recipient, so those images would never actually load.
    images = []
    for cid, filename in INLINE_IMAGES:
        path = ASSETS_DIR / filename
        if not path.exists():
            continue
        img = MIMEImage(path.read_bytes())
        img.add_header("Content-ID", f"<{cid}>")
        img.add_header("Content-Disposition", "inline", filename=filename)
        images.append(img)
    return images


# Email layout: dark navy header with logo, 3px gold stripe, white body, small beige footer.
# Uses an inline-styled HTML table so it renders correctly across all major email clients.
# Logo/footer icons are referenced via cid: and embedded as inline attachments by send_emails.
def _render_html(body_text: str) -> str:
    paragraphs = []
    for line in body_text.split("\n"):
        stripped = line.strip()
        if stripped:
            paragraphs.append(f'<p style="margin:0 0 6px 0;">{escape(stripped)}</p>')
        else:
            paragraphs.append('<p style="margin:0 0 6px 0;">&nbsp;</p>')

    body_html = "\n".join(paragraphs)

    footer_links = """<a href="https://www.instagram.com/ssicsim/?hl=en" style="color:#b8922a;text-decoration:none;font-weight:600;">
              <img src="cid:ssicsim-instagram" width="14" height="14" alt="" style="vertical-align:middle;margin-right:5px;border:0;" />Instagram</a>
            <span style="color:#c9bd9e;">&nbsp;&middot;&nbsp;</span>
            <a href="https://ssicsim.ca" style="color:#b8922a;text-decoration:none;font-weight:600;">
              <img src="cid:ssicsim-website" width="14" height="14" alt="" style="vertical-align:middle;margin-right:5px;border:0;" />ssicsim.ca</a>"""

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>SSICSIM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&family=Darker+Grotesque:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f8f7f4;font-family:'Nunito Sans','DM Sans','Avenir Next','Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f8f7f4;padding:28px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#b8922a;padding:18px 32px;
                       border-radius:12px 12px 0 0;text-align:center;">
              <img src="cid:ssicsim-logo" alt="SSICSIM" width="113" height="40" style="display:block;margin:0 auto;border:0;" />
            </td>
          </tr>

          <!-- Gold stripe -->
          <tr>
            <td style="height:3px;background-color:#b8922a;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:28px 32px 22px;
                       border-radius:0 0 12px 12px;">
              <div style="font-size:15px;line-height:1.6;color:#1a1600;">
                {body_html}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;">
                {footer_links}
              </p>
              <p style="margin:0;font-size:11px;color:#7a6a44;letter-spacing:0.04em;">
                SSICSIM 2026 &middot; Toronto, ON
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_emails(
    recipients: list[dict[str, str]],
    subject_template: str,
    body_template: str,
    gmail_user: str,
    gmail_pass: str,
) -> list[dict]:
    results: list[dict] = []

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)

            for recipient in recipients:
                addr = recipient.get("email", "")
                if not addr:
                    continue
                try:
                    subject = _replace_placeholders(subject_template, recipient)
                    plain = _replace_placeholders(body_template, recipient)
                    html = _render_html(plain)

                    # multipart/related wraps the text alternatives + the inline
                    # (cid:) images they reference, so images travel with the email
                    # instead of being fetched from a URL after the fact.
                    msg = MIMEMultipart("related")
                    msg["From"] = f"SSICSIM <{gmail_user}>"
                    msg["To"] = addr
                    msg["Subject"] = subject

                    alt = MIMEMultipart("alternative")
                    alt.attach(MIMEText(plain, "plain", "utf-8"))
                    alt.attach(MIMEText(html, "html", "utf-8"))
                    msg.attach(alt)

                    for image in _build_inline_images():
                        msg.attach(image)

                    server.sendmail(gmail_user, addr, msg.as_string())
                    results.append({"email": addr, "success": True})
                except Exception as exc:
                    results.append({"email": addr, "success": False, "error": str(exc)})

    except smtplib.SMTPAuthenticationError:
        # Caught separately from address-level errors: this means Gmail credentials are wrong,
        # not that any recipient address is bad. Frontend validation only checks address
        # syntax/DNS — it cannot catch a misconfigured GMAIL_USER / GMAIL_APP_PASSWORD.
        for r in recipients:
            results.append(
                {
                    "email": r.get("email", ""),
                    "success": False,
                    "error": "SMTP authentication failed — check GMAIL_USER / GMAIL_APP_PASSWORD",
                }
            )
    except Exception as exc:
        # Catches connection failures (e.g. Gmail unreachable). Worker runs async with no
        # other error boundary, so every failure path must be captured in results.
        for r in recipients:
            results.append(
                {"email": r.get("email", ""), "success": False, "error": str(exc)}
            )

    return results
