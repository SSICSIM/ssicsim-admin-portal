from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from redis import Redis
from rq import Queue

from app.config import settings
from app.jobs.email import send_emails

router = APIRouter(prefix="/email", tags=["email"])


# ─── queue ────────────────────────────────────────────────────────────────────


class EmailQueueRequest(BaseModel):
    recipients: list[dict[str, str]]
    subject: str
    body: str


@router.post("/queue", status_code=202)
def queue_email_job(payload: EmailQueueRequest) -> dict:
    if not settings.gmail_user or not settings.gmail_app_password:
        return {"error": "GMAIL_USER or GMAIL_APP_PASSWORD is not set on the server.", "queued": 0}

    if not payload.recipients:
        return {"error": "No recipients provided.", "queued": 0}

    redis_conn = Redis.from_url(settings.redis_url)
    q = Queue(connection=redis_conn)

    logo_url = f"{settings.frontend_url.rstrip('/')}/branding/WhiteLogo.png"

    job = q.enqueue(
        send_emails,
        payload.recipients,
        payload.subject,
        payload.body,
        settings.gmail_user,
        settings.gmail_app_password,
        logo_url,
        job_timeout=300,
    )

    return {
        "job_id": job.id,
        "queued": len(payload.recipients),
        "status": "queued",
    }


# ─── validate ─────────────────────────────────────────────────────────────────


class EmailValidateRequest(BaseModel):
    emails: list[str]


class EmailValidateResult(BaseModel):
    email: str
    valid: bool
    normalized: str | None = None
    reason: str | None = None


@router.post("/validate", response_model=list[EmailValidateResult])
def validate_emails(payload: EmailValidateRequest) -> list[dict]:
    from email_validator import EmailNotValidError, validate_email

    # Deduplicate domains — DNS lookups are the slow part
    seen_bad_domains: set[str] = set()
    results = []

    for addr in payload.emails:
        try:
            info = validate_email(addr.strip(), check_deliverability=True)
            results.append(
                {
                    "email": addr,
                    "valid": True,
                    "normalized": info.normalized,
                }
            )
        except EmailNotValidError as exc:
            reason = str(exc)
            # Soften "domain not found" to a warning rather than a hard error so
            # admins aren't blocked by transient DNS issues.
            domain = addr.split("@")[-1].lower() if "@" in addr else ""
            if domain and domain not in seen_bad_domains and "DNS" in reason:
                seen_bad_domains.add(domain)
            results.append(
                {
                    "email": addr,
                    "valid": False,
                    "reason": reason,
                }
            )

    return results
