from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Message


router = APIRouter(prefix="/rooms", tags=["messages"])


@router.get("/{room_id}/messages")
async def get_messages(
    room_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Message)
        .where(Message.room_id == room_id)
        .order_by(Message.created_at.desc())
        .limit(50)
    )

    messages = result.scalars().all()

    return [
        {
            "id": message.id,
            "room_id": message.room_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": message.created_at,
        }
        for message in reversed(messages)
    ]
