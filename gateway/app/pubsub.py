import json
import os

import redis.asyncio as redis


REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379",
)

MESSAGE_CHANNEL = "pulse:messages"
PRESENCE_CHANNEL = "pulse:presence"
PRESENCE_KEY = "pulse:presence"

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True,
)


# ======================================================
# MESSAGES
# ======================================================

async def publish_message(message: dict):
    await redis_client.publish(
        MESSAGE_CHANNEL,
        json.dumps(message),
    )


async def subscribe_messages():
    pubsub = redis_client.pubsub()

    await pubsub.subscribe(MESSAGE_CHANNEL)

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield json.loads(message["data"])

    finally:
        await pubsub.unsubscribe(MESSAGE_CHANNEL)
        await pubsub.close()


# ======================================================
# PRESENCE STATE
# ======================================================

async def set_user_online(user_id: str):
    await redis_client.sadd(
        PRESENCE_KEY,
        user_id,
    )


async def set_user_offline(user_id: str):
    await redis_client.srem(
        PRESENCE_KEY,
        user_id,
    )


async def get_online_users():
    return await redis_client.smembers(
        PRESENCE_KEY
    )


# ======================================================
# PRESENCE EVENTS
# ======================================================

async def publish_presence(
    user_id: str,
    status: str,
):
    await redis_client.publish(
        PRESENCE_CHANNEL,
        json.dumps(
            {
                "user_id": user_id,
                "status": status,
            }
        ),
    )


async def subscribe_presence():
    pubsub = redis_client.pubsub()

    await pubsub.subscribe(
        PRESENCE_CHANNEL
    )

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield json.loads(
                    message["data"]
                )

    finally:
        await pubsub.unsubscribe(
            PRESENCE_CHANNEL
        )
        await pubsub.close()