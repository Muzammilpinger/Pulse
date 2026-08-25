import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.routes.health import router as health_router
from app.routes.messages import router as messages_router
from app.routes.websocket import (
    router as websocket_router,
    redis_listener,
    presence_listener,
)


redis_task = None
presence_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_task
    global presence_task

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    redis_task = asyncio.create_task(redis_listener())
    presence_task = asyncio.create_task(presence_listener())

    yield

    redis_task.cancel()
    presence_task.cancel()

    try:
        await redis_task
    except asyncio.CancelledError:
        pass

    try:
        await presence_task
    except asyncio.CancelledError:
        pass

    await engine.dispose()


app = FastAPI(
    title="Pulse Gateway",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(messages_router)
app.include_router(websocket_router)