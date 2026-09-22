import asyncio
import json
import logging
import os
import time

import redis.asyncio as redis

redis_client = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    decode_responses=True,
    socket_connect_timeout=3,
    socket_timeout=5,
)
subscriber_client = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    decode_responses=True,
    socket_connect_timeout=3,
    health_check_interval=10,
)
subscription_ready = asyncio.Event()
log = logging.getLogger("pulse")


async def publish_message(message):
    await redis_client.publish("pulse:events", json.dumps(message))


async def subscribe_messages():
    while True:
        try:
            async with subscriber_client.pubsub() as pubsub:
                await pubsub.subscribe("pulse:events")
                async for event in pubsub.listen():
                    if event["type"] == "subscribe":
                        subscription_ready.set()
                    if event["type"] == "message":
                        yield json.loads(event["data"])
        except (redis.RedisError, OSError):
            subscription_ready.clear()
            log.warning("pubsub_reconnecting")
            await asyncio.sleep(1)


async def touch(room, connection_id, user):
    key = f"pulse:presence:{room}"
    member = f"{user}:{connection_id}"
    async with redis_client.pipeline(transaction=True) as pipe:
        pipe.zadd(key, {member: time.time() + 35})
        pipe.expire(key, 70)
        await pipe.execute()


async def leave(room, connection_id, user):
    await redis_client.zrem(f"pulse:presence:{room}", f"{user}:{connection_id}")


async def users(room):
    key = f"pulse:presence:{room}"
    await redis_client.zremrangebyscore(key, "-inf", time.time())
    members = await redis_client.zrange(key, 0, -1)
    return sorted({member.split(":", 1)[0] for member in members})
