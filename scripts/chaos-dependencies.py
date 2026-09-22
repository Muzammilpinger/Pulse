"""Restart only Pulse Compose dependencies; verify readiness and durable recovery."""

import json
import subprocess
import time
from datetime import datetime, timezone

import httpx

BASE = "http://localhost:8001"
results = []
for service in ["redis", "postgres"]:
    started = time.monotonic()
    subprocess.run(["docker", "compose", "stop", service], check=True, stdout=subprocess.DEVNULL)
    try:
        response = httpx.get(f"{BASE}/ready", timeout=10)
        assert response.status_code == 503, response.text
        results.append({"service": service, "during_outage_readiness": response.status_code})
    finally:
        subprocess.run(
            ["docker", "compose", "start", service], check=True, stdout=subprocess.DEVNULL
        )
    for attempt in range(60):
        try:
            if httpx.get(f"{BASE}/ready", timeout=5).status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    else:
        raise RuntimeError(f"{service} did not recover")
    results[-1]["stop_to_ready_seconds"] = round(time.monotonic() - started, 2)
    for probe in range(1, 7):
        completed = subprocess.run(
            [".venv/bin/pytest", "-q", "tests", "-k", "cross_gateway"],
            capture_output=True,
            text=True,
        )
        if completed.returncode == 0:
            break
        time.sleep(1)
    results[-1]["application_probe_attempts"] = probe
    results[-1]["cross_gateway_after_recovery"] = completed.returncode == 0
    results[-1]["stop_to_chat_seconds"] = round(time.monotonic() - started, 2)
    if completed.returncode:
        raise RuntimeError(completed.stdout)

result = {
    "date": datetime.now(timezone.utc).isoformat(),
    "experiments": results,
    "scope": "Graceful local Compose restarts; no volume deletion or data corruption.",
}
with open("docs/evidence/dependency-recovery.json", "w") as output:
    json.dump(result, output, indent=2)
print(json.dumps(result, indent=2))
