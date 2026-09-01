# app/redis_client.py

import redis
import redis.asyncio as aioredis

from app.config import settings


# ============================================================
# Synchronous Redis client
#
# Used by Celery workers.
# Celery tasks are ordinary synchronous Python functions
# in our current implementation.
# ============================================================

redis_client = redis.Redis.from_url(
    settings.redis_url,
    decode_responses=True,
)


# ============================================================
# Asynchronous Redis client
#
# Used by FastAPI WebSocket endpoints.
# ============================================================

async_redis_client = aioredis.Redis.from_url(
    settings.redis_url,
    decode_responses=True,
)