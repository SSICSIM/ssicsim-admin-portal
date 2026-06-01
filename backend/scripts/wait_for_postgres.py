from __future__ import annotations

import os
import time
from urllib.parse import urlparse

import psycopg2


def _dsn_from_sqlalchemy_url(sqlalchemy_url: str) -> str:
    # Accept both postgresql:// and postgresql+psycopg2://
    if "+psycopg2" in sqlalchemy_url:
        sqlalchemy_url = sqlalchemy_url.replace("+psycopg2", "")
    return sqlalchemy_url


def main() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit("DATABASE_URL is required")

    dsn = _dsn_from_sqlalchemy_url(db_url)
    parsed = urlparse(dsn)
    target = f"{parsed.hostname}:{parsed.port or 5432}/{parsed.path.lstrip('/')}"

    timeout_s = int(os.environ.get("WAIT_FOR_DB_TIMEOUT_S", "60"))
    start = time.time()

    while True:
        try:
            conn = psycopg2.connect(dsn)
            conn.close()
            print(f"Postgres is up at {target}")
            return
        except Exception as e:
            if time.time() - start > timeout_s:
                raise SystemExit(
                    f"Timed out waiting for Postgres at {target}: {e}"
                ) from e
            time.sleep(1)


if __name__ == "__main__":
    main()
