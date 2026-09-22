"""Run deterministic cross-pod integration checks against the dedicated demo cluster."""

import os
import subprocess
import time

import httpx

K = ["kubectl", "--context", "kind-pulse-demo", "-n", "pulse"]
for deployment in ["gateway", "signaling"]:
    subprocess.run(
        K + ["rollout", "status", "deployment/" + deployment, "--timeout=180s"], check=True
    )
pods = subprocess.check_output(
    K + ["get", "pods", "-l", "app=gateway", "-o", "jsonpath={.items[*].metadata.name}"], text=True
).split()
if len(pods) < 2:
    raise SystemExit("Need at least two gateway pods")
processes = []
try:
    for pod, port in zip(pods[:2], [18021, 18022]):
        processes.append(
            subprocess.Popen(
                K + ["port-forward", pod, f"{port}:8001"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        )
    processes.append(
        subprocess.Popen(
            K + ["port-forward", "svc/signaling", "18023:8002"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    )
    for _ in range(40):
        try:
            if (
                all(
                    httpx.get(f"http://localhost:{port}/ready").status_code == 200
                    for port in [18021, 18022]
                )
                and httpx.get("http://localhost:18023/health").status_code == 200
            ):
                break
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    else:
        raise SystemExit("Port forwards did not become ready")
    print("Gateway pods:", ", ".join(pods[:2]), flush=True)
    env = {
        **os.environ,
        "GATEWAY_A": "http://localhost:18021",
        "GATEWAY_B": "http://localhost:18022",
        "SIGNALING": "http://localhost:18023",
    }
    result = subprocess.run([".venv/bin/pytest", "-q", "tests"], env=env)
    raise SystemExit(result.returncode)
finally:
    for process in processes:
        process.terminate()
        process.wait()
