
from app.redis_client import redis_client


def is_cancelled(job_id):

    value = redis_client.get(
        f"job:cancel:{job_id}"
    )

    return value == "1"

STAGES = [
    "Loading recipient list",
    "Validating recipient addresses",
    "Preparing email content",
    "Building email payloads",
    "Processing recipient batches",
    "Dispatching email batches",
    "Tracking delivery responses",
    "Processing delivery results",
    "Finalizing delivery statistics",
    "Completing bulk email processing",
]