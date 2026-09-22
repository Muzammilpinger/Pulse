import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth import router as auth_router
from app.database import Base, engine
from app.pubsub import redis_client, subscriber_client
from app.routes.health import router as health_router
from app.routes.messages import router as messages_router
from app.routes.websocket import manager, redis_listener
from app.routes.websocket import router as websocket_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(app):
    # Replicas can start before PostgreSQL is ready; retry within the startup probe window.
    from sqlalchemy import text

    for attempt in range(30):
        try:
            async with engine.begin() as connection:
                await connection.execute(text("SELECT pg_advisory_xact_lock(741852)"))
                await connection.run_sync(Base.metadata.create_all)
            break
        except Exception:
            if attempt == 29:
                raise
            await asyncio.sleep(2)
    task = asyncio.create_task(redis_listener())
    yield
    await manager.close()
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    await redis_client.aclose()
    await subscriber_client.aclose()
    await engine.dispose()


app = FastAPI(title="Pulse Gateway", version="0.5.0", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(health_router)
app.include_router(messages_router)
app.include_router(websocket_router)
