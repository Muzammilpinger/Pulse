"""Short-lived signed guest sessions. Display names are not verified identities."""

import os
import time

import jwt
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

SECRET = os.environ.get("SESSION_SECRET", "")
if len(SECRET) < 32:
    raise RuntimeError("SESSION_SECRET must contain at least 32 characters")
router = APIRouter()


class Guest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z0-9_-]{2,24}$")


@router.post("/session")
async def session(guest: Guest):
    now = int(time.time())
    token = jwt.encode(
        {"sub": guest.username, "iat": now, "exp": now + 3600},
        SECRET,
        algorithm="HS256",
    )
    return {"token": token, "username": guest.username, "expires_in": 3600}


def verify(token: str) -> str:
    try:
        return jwt.decode(
            token, SECRET, algorithms=["HS256"], options={"require": ["exp", "sub"]}
        )["sub"]
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Session expired. Please join again.")


async def identity(authorization: str = Header(default="")):
    return verify(authorization.removeprefix("Bearer "))
