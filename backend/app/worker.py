from __future__ import annotations

import os

from redis import Redis
from rq import Queue, Worker

from app.config import settings


def main() -> None:
    listen = os.environ.get("RQ_QUEUES", "default").split(",")
    redis_conn = Redis.from_url(settings.redis_url)

    queues = [Queue(name.strip(), connection=redis_conn) for name in listen if name.strip()]
    worker = Worker(queues, connection=redis_conn)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
