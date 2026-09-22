"""Sustained real fan-out plus HPA observations on the dedicated local cluster."""

import asyncio
import json
import time
from datetime import datetime, timezone

import httpx
from websockets.asyncio.client import connect


async def main():
    base = "http://localhost:8088/api"
    sockets = []
    counts = {"sent": 0, "received": 0, "errors": 0}
    samples = []
    readers = []
    run_id = str(int(time.time()))
    async with httpx.AsyncClient() as http:
        for i in range(80):
            token = (
                await http.post(base + "/session", json={"username": f"scale-{run_id}-{i}"})
            ).json()["token"]
            socket = await connect(f"ws://localhost:8088/api/ws?room=scale-{run_id}&token={token}")
            while json.loads(await socket.recv())["type"] != "ready":
                pass
            sockets.append(socket)

    async def read(socket):
        async for raw in socket:
            message = json.loads(raw)
            if message["type"] == "message":
                counts["received"] += 1
            elif message["type"] == "error":
                counts["errors"] += 1

    async def send(socket):
        deadline = time.monotonic() + 75
        while time.monotonic() < deadline:
            await socket.send(f"scaling experiment {time.monotonic()}")
            counts["sent"] += 1
            await asyncio.sleep(0.65)

    async def sample():
        for _ in range(16):
            process = await asyncio.create_subprocess_exec(
                "kubectl",
                "--context",
                "kind-pulse-demo",
                "-n",
                "pulse",
                "get",
                "hpa",
                "gateway",
                "-o",
                "json",
                stdout=asyncio.subprocess.PIPE,
            )
            raw, _ = await process.communicate()
            hpa = json.loads(raw)
            samples.append(
                {"at": datetime.now(timezone.utc).isoformat(), "status": hpa.get("status", {})}
            )
            await asyncio.sleep(5)

    try:
        readers = [asyncio.create_task(read(s)) for s in sockets]
        await asyncio.gather(*(send(s) for s in sockets[:10]), sample())
        await asyncio.sleep(2)
    finally:
        await asyncio.gather(*(s.close() for s in sockets))
        await asyncio.gather(*readers, return_exceptions=True)
    result = {
        "clients": 80,
        "senders": 10,
        "send_interval_seconds": 0.65,
        "duration_seconds": 75,
        "cpu_request": "100m",
        "hpa_target_percent": 25,
        "counts": counts,
        "samples": samples,
        "scope": "Local kind HPA mechanics demonstration; deliberately sensitive CPU target, not a capacity estimate. Existing sockets stay on original pods.",
    }
    with open("docs/evidence/hpa-scaling.json", "w") as output:
        json.dump(result, output, indent=2)
    print(
        json.dumps(
            {"counts": counts, "replicas": [s["status"].get("currentReplicas") for s in samples]},
            indent=2,
        )
    )


asyncio.run(main())
