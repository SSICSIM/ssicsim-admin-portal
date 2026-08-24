from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.database import SessionLocal
from app.models.delegate import Delegate
from app.services.delegates import _compute_registration_period


def backfill_registration_periods() -> None:
    db = SessionLocal()
    try:
        delegates = db.scalars(select(Delegate)).all()
        updated = 0
        for delegate in delegates:
            if delegate.date_applied is None:
                continue
            new_period = _compute_registration_period(delegate.date_applied)
            if delegate.registration_period != new_period:
                print(
                    f"{delegate.id} ({delegate.first_name} {delegate.last_name}): "
                    f"{delegate.registration_period} -> {new_period}"
                )
                delegate.registration_period = new_period
                updated += 1
        db.commit()
        print(f"Updated {updated} of {len(delegates)} delegates.")
    finally:
        db.close()


if __name__ == "__main__":
    backfill_registration_periods()
