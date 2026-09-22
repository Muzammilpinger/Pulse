from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import select

from app.auth import identity
from app.database import get_session
from app.models import Message

router = APIRouter(prefix="/rooms", tags=["messages"])


@router.get("/{room_id}/messages")
async def get_messages(
    room_id: str = Path(pattern=r"^[a-z0-9-]{1,40}$"),
    before: int | None = Query(default=None, gt=0),
    user=Depends(identity),
    session=Depends(get_session),
):
    query = select(Message).where(Message.room_id == room_id)
    if before:
        query = query.where(Message.id < before)
    result = await session.execute(query.order_by(Message.id.desc()).limit(50))
    return [
        {
            "id": m.id,
            "room_id": m.room_id,
            "sender_id": m.sender_id,
            "content": m.content,
            "created_at": m.created_at.isoformat() + "Z",
        }
        for m in reversed(result.scalars().all())
    ]
