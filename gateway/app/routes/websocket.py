import asyncio
import logging
import os
import re
import time
import uuid

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from prometheus_client import Counter, Gauge, Histogram
from redis.exceptions import RedisError

from app.auth import verify
from app.connection_manager import ConnectionManager
from app.database import AsyncSessionLocal
from app.models import Message
from app.pubsub import (
    leave,
    publish_message,
    redis_client,
    subscribe_messages,
    touch,
    users,
)

router = APIRouter()
manager = ConnectionManager()
log = logging.getLogger("pulse")
ACTIVE = Gauge("pulse_connections", "Active WebSocket connections")
MESSAGES = Counter("pulse_messages_total", "Persisted messages")
ERRORS = Counter("pulse_errors_total", "Rejected messages and dependency errors")
LATENCY = Histogram("pulse_persist_seconds", "Message persistence latency")
ROOM_PATTERN = re.compile(r"^[a-z0-9-]{1,40}$")


async def redis_listener():
    async for event in subscribe_messages():
        await manager.broadcast_to_room(event["room_id"], event)


async def heartbeat(websocket, room, cid, user):
    while True:
        try:
            await touch(room, cid, user)
            await websocket.send_json({"type": "presence_list", "users": await users(room)})
        except RedisError:
            log.warning("presence_refresh_waiting_for_redis")
        await asyncio.sleep(10)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, room: str = "general", token: str = ""):
    try:
        user = verify(token)
    except HTTPException:
        await websocket.close(code=4401)
        return
    origin = websocket.headers.get("origin")
    allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8085").split(",")
    if not ROOM_PATTERN.fullmatch(room) or (origin and origin not in allowed):
        await websocket.close(code=4403)
        return
    cid = uuid.uuid4().hex
    await manager.connect(websocket, room)
    ACTIVE.inc()
    task = None
    try:
        await touch(room, cid, user)
        await websocket.send_json(
            {"type": "ready", "instance": os.getenv("HOSTNAME", "local"), "user": user}
        )
        task = asyncio.create_task(heartbeat(websocket, room, cid, user))
        while True:
            content = await websocket.receive_text()
            if not content.strip() or len(content) > 4000:
                ERRORS.inc()
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Messages must contain 1–4000 characters.",
                    }
                )
                continue
            key = f"pulse:rate:{user}:{int(time.time() // 10)}"
            count = await redis_client.incr(key)
            await redis_client.expire(key, 20)
            if count > 20:
                ERRORS.inc()
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Slow down: 20 messages per 10 seconds.",
                    }
                )
                continue
            message = Message(room_id=room, sender_id=user, content=content.strip())
            with LATENCY.time():
                async with AsyncSessionLocal() as session:
                    session.add(message)
                    await session.commit()
            MESSAGES.inc()
            await publish_message(
                {
                    "type": "message",
                    "id": message.id,
                    "room_id": room,
                    "sender_id": user,
                    "content": message.content,
                    "created_at": message.created_at.isoformat() + "Z",
                }
            )
    except WebSocketDisconnect:
        pass
    except Exception:
        ERRORS.inc()
        log.exception("websocket_dependency_failure")
        try:
            await websocket.close(code=1013)
        except Exception:
            pass
    finally:
        if task:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        manager.disconnect(websocket, room)
        ACTIVE.dec()
        try:
            await leave(room, cid, user)
        except Exception:
            log.warning("presence_cleanup_deferred_to_expiry")
