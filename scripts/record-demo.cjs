/** Silent, captioned walkthrough of real browser actions and live operations UIs. */
const { chromium, expect } = require("../client/node_modules/@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["microphone"],
    ignoreHTTPSErrors: true,
    recordVideo: {
      dir: "artifacts/walkthrough",
      size: { width: 1440, height: 1000 },
    },
  });
  const other = await browser.newContext({ permissions: ["microphone"] });
  const p = await ctx.newPage(),
    q = await other.newPage();
  const start = Date.now();
  async function caption(text, seconds) {
    await p.evaluate((text) => {
      document.querySelector("#demo-caption")?.remove();
      const n = document.createElement("div");
      n.id = "demo-caption";
      n.textContent = text;
      Object.assign(n.style, {
        position: "fixed",
        bottom: "16px",
        left: "12%",
        width: "76%",
        boxSizing: "border-box",
        padding: "16px 24px",
        background: "#19372ef2",
        color: "white",
        borderRadius: "14px",
        font: "18px system-ui",
        textAlign: "center",
        zIndex: 99999,
        pointerEvents: "none",
      });
      document.body.appendChild(n);
    }, text);
    console.log(text);
    await p.waitForTimeout(seconds * 1000);
  }
  async function join(page, name) {
    await page.goto("http://localhost:8085");
    await page.getByLabel("Display name").fill(name);
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await expect(page.locator(".profile")).toContainText("Connected");
  }
  try {
    await p.goto("http://localhost:8085");
    await caption(
      "Pulse · a real-time workspace and an inspectable distributed system.",
      9,
    );
    await p.getByLabel("Display name").fill("demo-host");
    await p.getByRole("button", { name: "Enter workspace" }).click();
    await join(q, "demo-guest");
    for (const x of [p, q])
      await x.getByRole("button", { name: "# engineering" }).click();
    const message =
      "A real message between two independent browser sessions · " +
      new Date().toISOString();
    await q.getByLabel("Message engineering", { exact: true }).fill(message);
    await q.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(p.getByText(message, { exact: true })).toBeVisible();
    await caption(
      "Guest aliases are public. This message came from a second browser session.",
      12,
    );
    await p.reload();
    await p.getByRole("button", { name: "# engineering" }).click();
    await expect(p.getByText(message, { exact: true })).toBeVisible();
    await caption(
      "Refresh the browser: PostgreSQL history brings the conversation back.",
      10,
    );
    await p.getByLabel("Search loaded messages").fill("independent browser");
    await caption(
      "Search the loaded conversation. Older history has explicit pagination.",
      8,
    );
    await p.getByLabel("Search loaded messages").fill("");
    for (const x of [p, q]) {
      await x.getByRole("button", { name: "Join voice" }).first().click();
      await x
        .locator(".call-panel")
        .getByRole("button", { name: "Join voice", exact: true })
        .click();
    }
    await expect(p.getByRole("status")).toHaveText("Voice connected", {
      timeout: 30000,
    });
    await caption(
      "Two-peer WebRTC is connected. This recording uses synthetic microphones.",
      12,
    );
    await p.getByRole("button", { name: "Mute", exact: true }).click();
    await caption(
      "Mute locally, then leave. Signaling and media have separate responsibilities.",
      7,
    );
    await p.getByRole("button", { name: "Leave", exact: true }).click();
    await p.goto(
      "http://localhost:3000/d/pulse-operations?orgId=1&from=now-15m&to=now",
    );
    await p.getByText("Active connections", { exact: true }).waitFor();
    await p.waitForTimeout(4000);
    await caption(
      "Real Prometheus scrapes: connections, message rate, errors, latency, and peer outcomes.",
      16,
    );
    const encoded = execFileSync(
      "kubectl",
      [
        "--context",
        "kind-pulse-demo",
        "-n",
        "argocd",
        "get",
        "secret",
        "argocd-initial-admin-secret",
        "-o",
        "jsonpath={.data.password}",
      ],
      { encoding: "utf8" },
    );
    const auth = await ctx.request.post(
      "https://localhost:8090/api/v1/session",
      {
        data: {
          username: "admin",
          password: Buffer.from(encoded, "base64").toString(),
        },
      },
    );
    if (!auth.ok()) throw Error("Argo login failed");
    const { token } = await auth.json();
    await ctx.addCookies([
      {
        name: "argocd.token",
        value: token,
        url: "https://localhost:8090",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);
    await p.goto("https://localhost:8090/applications/argocd/pulse?view=tree");
    await p.getByText("Healthy", { exact: true }).first().waitFor();
    await caption(
      "Argo CD compares the running system with Git. Images are pinned to a verified commit.",
      18,
    );
    await p.goto("http://localhost:8085");
    await caption(
      "Measured local evidence, explicit limitations: public guests, Pub/Sub gaps, single-instance data services.",
      12,
    );
    const remain = Math.max(0, 135 - (Date.now() - start) / 1000);
    await caption(
      "Explore the README, raw test evidence, failure matrix, and architecture decisions on GitHub.",
      remain,
    );
    const video = p.video();
    await ctx.close();
    await video.saveAs("artifacts/pulse-walkthrough.webm");
    fs.writeFileSync(
      "docs/evidence/walkthrough.json",
      JSON.stringify(
        {
          date: new Date().toISOString(),
          elapsedSeconds: (Date.now() - start) / 1000,
          scope:
            "Real browser recording, silent explanatory captions, synthetic microphone input. No results mocked.",
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
