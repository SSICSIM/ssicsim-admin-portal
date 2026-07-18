from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.sec_member import SecMember


def require_admin_token(
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")
) -> None:
    if not settings.admin_api_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin token missing",
        )
    if x_admin_token != settings.admin_api_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )


def get_current_actor(
    x_actor_email: str | None = Header(default=None, alias="X-Actor-Email"),
    x_actor_name: str | None = Header(default=None, alias="X-Actor-Name"),
    db: Session = Depends(get_db),
) -> SecMember | None:
    if not x_actor_email:
        return None

    email = x_actor_email.strip().lower()
    actor = db.scalar(select(SecMember).where(SecMember.email == email))

    if actor is None:
        name = (x_actor_name or email.split("@")[0]).strip()
        first_name, _, last_name = name.partition(" ")
        actor = SecMember(
            first_name=first_name.strip() or email,
            last_name=last_name.strip() or "Member",
            email=email,
            role="SEC",
            last_logged_in=datetime.now(timezone.utc),
        )
        db.add(actor)
    else:
        actor.last_logged_in = datetime.now(timezone.utc)

    db.commit()
    db.refresh(actor)
    return actor
