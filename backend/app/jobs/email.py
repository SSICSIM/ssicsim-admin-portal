from __future__ import annotations

import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape


def _replace_placeholders(template: str, data: dict[str, str]) -> str:
    return re.sub(r"\{(\w+)\}", lambda m: data.get(m.group(1), m.group(0)), template)


def _render_html(body_text: str, logo_url: str = "") -> str:
    paragraphs = []
    for line in body_text.split("\n"):
        stripped = line.strip()
        if stripped:
            paragraphs.append(f'<p style="margin:0 0 10px 0;">{escape(stripped)}</p>')
        else:
            paragraphs.append('<p style="margin:0 0 10px 0;">&nbsp;</p>')

    body_html = "\n".join(paragraphs)

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>SSICSIM</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f8f7f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#3d2b00;padding:24px 40px;
                       border-radius:12px 12px 0 0;text-align:center;">
              {f'<img src="{logo_url}" alt="SSICSIM" width="180" style="height:auto;max-height:48px;display:block;margin:0 auto;" />'
               if logo_url else
               '<p style="margin:0;font-size:24px;font-weight:700;color:#d3af37;letter-spacing:0.06em;">SSICSIM</p>'}
            </td>
          </tr>

          <!-- Gold stripe -->
          <tr>
            <td style="height:3px;background-color:#b8922a;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;
                       border-radius:0 0 12px 12px;">
              <div style="font-size:15px;line-height:1.75;color:#1a1600;">
                {body_html}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
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
    logo_url: str = "",
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
                    html = _render_html(plain, logo_url=logo_url)

                    msg = MIMEMultipart("alternative")
                    msg["From"] = f"SSICSIM <{gmail_user}>"
                    msg["To"] = addr
                    msg["Subject"] = subject

                    msg.attach(MIMEText(plain, "plain", "utf-8"))
                    msg.attach(MIMEText(html, "html", "utf-8"))

                    server.sendmail(gmail_user, addr, msg.as_string())
                    results.append({"email": addr, "success": True})
                except Exception as exc:
                    results.append({"email": addr, "success": False, "error": str(exc)})

    except smtplib.SMTPAuthenticationError:
        for r in recipients:
            results.append(
                {
                    "email": r.get("email", ""),
                    "success": False,
                    "error": "SMTP authentication failed — check GMAIL_USER / GMAIL_APP_PASSWORD",
                }
            )
    except Exception as exc:
        for r in recipients:
            results.append({"email": r.get("email", ""), "success": False, "error": str(exc)})

    return results
