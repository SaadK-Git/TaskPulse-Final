
from app.redis_client import redis_client


def is_cancelled(job_id):

    value = redis_client.get(
        f"job:cancel:{job_id}"
    )

    return value == "1"

