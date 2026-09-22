"""Seal the exact existing demo secret without printing or persisting plaintext."""

import hashlib
import json
import os
import subprocess
import time
from datetime import datetime, timezone

k = ["kubectl", "--context", "kind-pulse-demo", "-n", "pulse"]
subprocess.run(
    k
    + [
        "annotate",
        "secret",
        "pulse-secrets",
        "sealedsecrets.bitnami.com/managed=true",
        "--overwrite",
    ],
    check=True,
    stdout=subprocess.DEVNULL,
)
original = json.loads(subprocess.check_output(k + ["get", "secret", "pulse-secrets", "-o", "json"]))
clean = {
    "apiVersion": "v1",
    "kind": "Secret",
    "metadata": {"name": "pulse-secrets", "namespace": "pulse"},
    "type": "Opaque",
    "data": original["data"],
}
sealed = subprocess.check_output(
    [os.getenv("KUBESEAL", "kubeseal"), "--context", "kind-pulse-demo", "--format", "json"],
    input=json.dumps(clean).encode(),
)
assert all(value.encode() not in sealed for value in original["data"].values())
subprocess.run(k + ["apply", "-f", "-"], input=sealed, check=True, stdout=subprocess.DEVNULL)
for _ in range(40):
    resource = json.loads(
        subprocess.check_output(k + ["get", "sealedsecret", "pulse-secrets", "-o", "json"])
    )
    if any(
        c["type"] == "Synced" and c["status"] == "True"
        for c in resource.get("status", {}).get("conditions", [])
    ):
        break
    time.sleep(0.5)
else:
    raise RuntimeError("SealedSecret did not sync")
restored = json.loads(subprocess.check_output(k + ["get", "secret", "pulse-secrets", "-o", "json"]))
assert original["data"] == restored["data"]
result = {
    "date": datetime.now(timezone.utc).isoformat(),
    "namespace": "pulse",
    "secret": "pulse-secrets",
    "key_count": len(original["data"]),
    "synced": True,
    "round_trip_equal": True,
    "plaintext_written_to_disk": False,
    "encrypted_manifest_sha256": hashlib.sha256(sealed).hexdigest(),
}
with open("docs/evidence/sealed-secret.json", "w") as f:
    json.dump(result, f, indent=2)
print(json.dumps(result, indent=2))
