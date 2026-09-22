"""Observe a manual GitOps deployment, failed image rollout, and repair from Git."""

import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

K = ["kubectl", "--context", "kind-pulse-demo"]


def command(*args):
    return subprocess.check_output(K + list(args), text=True)


def app():
    return json.loads(command("-n", "argocd", "get", "application", "pulse", "-o", "json"))[
        "status"
    ]


def wait(predicate, seconds=240):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(3)
    raise TimeoutError("GitOps observation did not reach expected state")


initial = wait(
    lambda: (
        (
            s
            if s.get("sync", {}).get("status") == "Synced"
            and s.get("health", {}).get("status") == "Healthy"
            else None
        )
        if (s := app())
        else None
    )
)
result = {
    "date": datetime.now(timezone.utc).isoformat(),
    "initialRevision": initial["sync"]["revision"],
    "initial": "Synced / Healthy",
}
try:
    command(
        "-n",
        "pulse",
        "set",
        "image",
        "deployment/gateway",
        "gateway=ghcr.io/muzammilpinger/pulse-gateway:deliberately-invalid-rollback-check",
    )

    def failed():
        pods = json.loads(command("-n", "pulse", "get", "pods", "-l", "app=gateway", "-o", "json"))[
            "items"
        ]
        states = [
            c.get("state", {}).get("waiting", {}).get("reason")
            for p in pods
            for c in p["status"].get("containerStatuses", [])
        ]
        return states if any(s in ("ErrImagePull", "ImagePullBackOff") for s in states) else None

    result["failedRolloutStates"] = wait(failed, 120)
    result["readyReplicasDuringFailure"] = json.loads(
        command("-n", "pulse", "get", "deployment", "gateway", "-o", "json")
    )["status"].get("readyReplicas", 0)
    assert result["readyReplicasDuringFailure"] >= 2
finally:
    command(
        "-n",
        "argocd",
        "patch",
        "application",
        "pulse",
        "--type",
        "merge",
        "-p",
        json.dumps(
            {"operation": {"sync": {"revision": initial["sync"]["revision"], "prune": False}}}
        ),
    )
    command("-n", "pulse", "rollout", "status", "deployment/gateway", "--timeout=240s")
final = wait(
    lambda: (
        (
            s
            if s.get("sync", {}).get("status") == "Synced"
            and s.get("health", {}).get("status") == "Healthy"
            else None
        )
        if (s := app())
        else None
    )
)
result["restored"] = "Synced / Healthy"
result["restoredRevision"] = final["sync"]["revision"]
result["images"] = {
    d["metadata"]["name"]: d["spec"]["template"]["spec"]["containers"][0]["image"]
    for d in json.loads(command("-n", "pulse", "get", "deployments", "-o", "json"))["items"]
}
result["scope"] = (
    "Manual Argo sync; injected live image drift rejected by pull, then restored from the same known-good Git revision. Not an automatic rollback."
)
Path("docs/evidence/gitops-rollback.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
