"""Load the host architecture only; avoids multi-arch index gaps in kind's all-platform import."""

import argparse
import os
import subprocess
import tempfile

p = argparse.ArgumentParser()
p.add_argument("images", nargs="+")
p.add_argument("--cluster", default="pulse-demo")
a = p.parse_args()
platform = subprocess.check_output(
    ["docker", "version", "--format", "{{.Server.Os}}/{{.Server.Arch}}"], text=True
).strip()
nodes = subprocess.check_output(["kind", "get", "nodes", "--name", a.cluster], text=True).split()
for image in a.images:
    handle, path = tempfile.mkstemp(suffix=".tar", prefix="pulse-image-")
    os.close(handle)
    try:
        subprocess.run(["docker", "save", "--platform", platform, "-o", path, image], check=True)
        for node in nodes:
            with open(path, "rb") as source:
                subprocess.run(
                    [
                        "docker",
                        "exec",
                        "-i",
                        node,
                        "ctr",
                        "--namespace=k8s.io",
                        "images",
                        "import",
                        "--platform",
                        platform,
                        "-",
                    ],
                    stdin=source,
                    stdout=subprocess.DEVNULL,
                    check=True,
                )
        print("Loaded", image, "on", len(nodes), "nodes", flush=True)
    finally:
        os.unlink(path)
