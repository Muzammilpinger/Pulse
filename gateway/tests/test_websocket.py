import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.connection_manager import ConnectionManager
from app.database import AsyncSessionLocal
from app.models import Message
from app.pubsub import publish_message, subscribe_messages


router = APIRouter()

manager = ConnectionManager()


async def redis_listener():
    async for message in subscribe_messages():
        try:
            # subscribe_messages() already returns a Python dict
            data = message

            room_id = data["room_id"]
            content = data["content"]
            sender_id = data["sender_id"]

            await manager.broadcast_to_room(
                room_id,
                {
                    "room_id": room_id,
                    "sender_id": sender_id,
                    "content": content,
                },
            )

        except Exception as error:
            print(f"Redis listener error: {error}")


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str = "general",
    user: str = "anonymous",
):
    await manager.connect(websocket, room)

    try:
        while True:
            content = await websocket.receive_text()

            message = Message(
                room_id=room,
                sender_id=user,
                content=content,
            )

            async with AsyncSessionLocal() as session:
                session.add(message)
                await session.commit()

            payload = {
                "room_id": room,
                "sender_id": user,
                "content": content,
            }

            await publish_message(payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room)

