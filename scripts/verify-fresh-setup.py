"""New isolated Compose project and empty volume, then real integration tests."""

import json
import os
import subprocess
import tempfile
from pathlib import Path

config = json.loads(subprocess.check_output(["docker", "compose", "config", "--format", "json"]))
config["name"] = "pulse-fresh-check"
config["services"].pop("client")
for name, port in [("gateway", 18001), ("gateway-2", 18011), ("signaling", 18002)]:
    config["services"][name]["ports"][0]["published"] = str(port)
for v in config["volumes"].values():
    v.pop("name", None)
for n in config.get("networks", {}).values():
    n.pop("name", None)
with tempfile.TemporaryDirectory(prefix="pulse-fresh-") as directory:
    path = Path(directory) / "compose.json"
    path.write_text(json.dumps(config))
    command = ["docker", "compose", "-f", str(path)]
    try:
        subprocess.run(command + ["up", "-d", "--build", "--wait"], check=True)
        env = dict(
            os.environ,
            GATEWAY_A="http://localhost:18001",
            GATEWAY_B="http://localhost:18011",
            SIGNALING="http://localhost:18002",
        )
        result = subprocess.run(
            [".venv/bin/pytest", "-q", "tests"],
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        Path("docs/evidence/fresh-setup-tests.txt").write_text(
            "Isolated project pulse-fresh-check; new empty PostgreSQL volume.\n" + result.stdout
        )
        result.check_returncode()
        print(result.stdout)
    finally:
        subprocess.run(command + ["down", "-v"], check=True)
