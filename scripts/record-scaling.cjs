/** Live kubectl observations during an actual generated workload, not simulated values. */
const { chromium } = require("../client/node_modules/@playwright/test");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const K = ["--context", "kind-pulse-demo", "-n", "pulse"];
const k = (...a) => execFileSync("kubectl", [...K, ...a], { encoding: "utf8" });
(async () => {
  fs.mkdirSync("artifacts", { recursive: true });
  const hpa = {
    apiVersion: "autoscaling/v2",
    kind: "HorizontalPodAutoscaler",
    metadata: { name: "gateway", namespace: "pulse" },
    spec: {
      scaleTargetRef: {
        apiVersion: "apps/v1",
        kind: "Deployment",
        name: "gateway",
      },
      minReplicas: 2,
      maxReplicas: 5,
      metrics: [
        {
          type: "Resource",
          resource: {
            name: "cpu",
            target: { type: "Utilization", averageUtilization: 25 },
          },
        },
      ],
    },
  };
  execFileSync("kubectl", [...K, "apply", "-f", "-"], {
    input: JSON.stringify(hpa),
  });
  const browser = await chromium.launch();
  let child;
  try {
    const c = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: "artifacts/scaling",
        size: { width: 1440, height: 900 },
      },
    });
    const p = await c.newPage();
    await p.setContent(
      `<body style="margin:0;background:#edf0e9;color:#21362d;font:22px system-ui;padding:70px"><div style="color:#66806c;letter-spacing:5px">PULSE / LIVE EXPERIMENT</div><h1 style="font-size:54px">Watch the gateways scale.</h1><p>80 real WebSockets · 10 senders · local kind cluster</p><p>CPU target 25% of a 100m request. Mechanics demonstration, not capacity planning.</p><div id="stats" style="font-size:40px;padding:28px 0"></div><pre id="data" style="font-size:18px;background:white;padding:28px;border-radius:18px"></pre><p id="time"></p><small>Values below are read from the Kubernetes API every 3 seconds. No generated measurements.</small></body>`,
    );
    const log = fs.openSync("/tmp/pulse-scaling-video.log", "w");
    child = spawn(".venv/bin/python", ["scripts/scale.py"], {
      env: {
        ...process.env,
        PULSE_URL: "http://localhost:8089",
        PULSE_OUTPUT: "docs/evidence/hpa-video-run.json",
      },
      stdio: ["ignore", log, log],
    });
    const completion = new Promise((resolve) =>
      child.on("exit", (code) => resolve(code)),
    );
    for (let i = 0; i < 34; i++) {
      const h = JSON.parse(k("get", "hpa", "gateway", "-o", "json"));
      const pods = JSON.parse(
        k("get", "pods", "-l", "app=gateway", "-o", "json"),
      );
      const data = {
        current: h.status?.currentReplicas,
        desired: h.status?.desiredReplicas,
        cpu: h.status?.currentMetrics?.[0]?.resource?.current
          ?.averageUtilization,
        pods: pods.items.map((x) => ({
          name: x.metadata.name,
          ready: x.status.containerStatuses?.[0]?.ready === true,
        })),
      };
      await p.evaluate((d) => {
        document.querySelector("#stats").textContent =
          `${d.current ?? "…"} replicas now → ${d.desired ?? "…"} desired`;
        document.querySelector("#data").textContent = JSON.stringify(
          d,
          null,
          2,
        );
        document.querySelector("#time").textContent = new Date().toISOString();
      }, data);
      console.log(`Live sample ${i + 1}: ${data.current} replicas`);
      await p.waitForTimeout(3000);
    }
    const code = await completion;
    if (code !== 0)
      throw Error("Load generator failed; inspect recorded output");
    await p.screenshot({ path: "docs/images/scaling.png" });
    const video = p.video();
    await c.close();
    await video.saveAs("artifacts/pulse-scaling.webm");
  } finally {
    child?.kill();
    await browser.close();
    k("delete", "hpa", "gateway");
    k("scale", "deployment/gateway", "--replicas=2");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
