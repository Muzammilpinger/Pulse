from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.connection_manager import ConnectionManager
from app.database import AsyncSessionLocal
from app.models import Message
from app.pubsub import (
    get_online_users,
    publish_message,
    publish_presence,
    set_user_offline,
    set_user_online,
    subscribe_messages,
    subscribe_presence,
)


router = APIRouter()

manager = ConnectionManager()


# ======================================================
# REDIS MESSAGE LISTENER
# ======================================================

async def redis_listener():
    print("🔵 Redis message listener started")

    async for message in subscribe_messages():
        try:
            print("📨 Redis received:", message)

            room_id = message["room_id"]

            await manager.broadcast_to_room(
                room_id,
                {
                    "type": "message",
                    "room_id": room_id,
                    "sender_id": message["sender_id"],
                    "content": message["content"],
                },
            )

            print(
                "📡 Message broadcasted to room:",
                room_id,
            )

        except Exception as error:
            print(
                f"❌ Redis message listener error: {error}"
            )


# ======================================================
# REDIS PRESENCE LISTENER
# ======================================================

async def presence_listener():
    print("🟢 Redis presence listener started")

    async for event in subscribe_presence():
        try:
            print("👤 Presence event:", event)

            user_id = event["user_id"]
            status = event["status"]

            await manager.broadcast_to_all(
                {
                    "type": "presence",
                    "user_id": user_id,
                    "status": status,
                }
            )

        except Exception as error:
            print(
                f"❌ Redis presence listener error: {error}"
            )


# ======================================================
# WEBSOCKET
# ======================================================

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str = "general",
    user: str = "anonymous",
):
    await manager.connect(
        websocket,
        room,
    )

    print(
        f"🟢 {user} joined #{room}"
    )

    # Add user to Redis presence
    await set_user_online(user)

    # Send current online users to this browser
    online_users = await get_online_users()

    await websocket.send_json(
        {
            "type": "presence_list",
            "users": list(online_users),
        }
    )

    # Tell everyone else that this user joined
    await publish_presence(
        user,
        "online",
    )

    try:
        while True:
            content = await websocket.receive_text()

            print(
                f"💬 {user} -> #{room}: {content}"
            )

            message = Message(
                room_id=room,
                sender_id=user,
                content=content,
            )

            async with AsyncSessionLocal() as session:
                session.add(message)
                await session.commit()

            await publish_message(
                {
                    "room_id": room,
                    "sender_id": user,
                    "content": content,
                }
            )

    except WebSocketDisconnect:
        manager.disconnect(
            websocket,
            room,
        )

        # Remove user from Redis presence
        await set_user_offline(user)

        # Tell everyone that they left
        await publish_presence(
            user,
            "offline",
        )

        print(
            f"🔴 {user} left #{room}"
        )