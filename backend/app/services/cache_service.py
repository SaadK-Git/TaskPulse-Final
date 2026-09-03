from asyncio import log

from app.redis_client import redis_client,async_redis_client


import redis
import redis.asyncio as redis_async

import json


# =====================================================
# REDIS NAMES
# =====================================================

def get_progress_key(job_id):

    return f"job:progress:value:{job_id}"


def get_progress_channel(job_id):

    return f"job:progress:channel:{job_id}"
 
# =====================================================
# DASHBOARD VALUE
# =====================================================
def set_Dashboard_stats(role, stats,job_id = 0):

    key = f"dashboard:{role}:stats:value:{job_id}" 

    redis_client.set(
        key,
        json.dumps(stats),
        ex = 3600
    )
def get_Dashboard_stats(role,job_id):

    key = f"dashboard:{role}:stats:value:{job_id}" 

    stats = redis_client.get(key)

    if stats is None:
        return None

    return json.loads(stats)
# =====================================================
# PROGRESS VALUE
# =====================================================

def set_progress(job_id, progress):

    key = get_progress_key(job_id)

    redis_client.set(
        key,
        progress,
        ex = 3600
    )


async def get_progress(job_id):

    key = get_progress_key(job_id)

    progress = await async_redis_client.get(key)

    if progress is None:
        return None

    return int(progress)


# =====================================================
# PUB/SUB for progress updates
# =====================================================


def publish_progress(job_id, progress):

    channel = get_progress_channel(job_id)

    redis_client.publish(
        channel,
        progress,
    )


def create_async_pubsub():

    return async_redis_client.pubsub()

##SSE#########


def get_log_key(job_id):
    return f"job:logs:{job_id}"


def get_log_channel(job_id):
    return f"job:logs:channel:{job_id}"


def add_log(job_id, log):
    key = get_log_key(job_id)

    redis_client.rpush(
        key,
        json.dumps(log),
    )


async def get_logs(job_id):
    key = get_log_key(job_id)

    logs = await async_redis_client.lrange(
        key,
        0,
        -1,
    )

    return [
        json.loads(log)
        for log in logs
    ]


async def publish_log(job_id, log):
    channel = get_log_channel(job_id)

    await async_redis_client.publish(
        channel,
        json.dumps(log),
    )

    
# =====================================================
# PUB/SUB for status updates
# =====================================================
def get_progress_status_key(job_id):
    
    return f"job:progress:status:{job_id}"

def get_progress_status_channel(job_id):
    
    return f"job:progress:status:channel:{job_id}"

def set_progress_status(job_id, status):

    key = get_progress_status_key(job_id)

    redis_client.set(
        key,
        status
    )

async def get_progress_status(job_id):

    key = get_progress_status_key(job_id)

    status = await async_redis_client.get(key)

    if status is None:
        return None

    return status


def publish_progress_status(job_id , status):
    channel = get_progress_status_channel(job_id)

    redis_client.publish(
        channel,
        status
    ) 