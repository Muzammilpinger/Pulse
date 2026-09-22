const { chromium, expect } = require("../client/node_modules/@playwright/test");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const pages = [];
  try {
    for (const name of ["relay-a", "relay-b"]) {
      const ctx = await browser.newContext({ permissions: ["microphone"] });
      const p = await ctx.newPage();
      await p.addInitScript(() => {
        const Native = window.RTCPeerConnection;
        window.pulsePeers = [];
        window.RTCPeerConnection = class extends Native {
          constructor(config) {
            super(config);
            window.pulsePeers.push(this);
          }
        };
      });
      await p.goto("http://127.0.0.1:5173");
      await p.getByLabel("Display name").fill(name);
      await p.getByRole("button", { name: "Enter workspace" }).click();
      await p.getByRole("button", { name: "Join voice" }).first().click();
      await p.getByLabel("Force TURN").check();
      await p
        .locator(".call-panel")
        .getByRole("button", { name: "Join voice", exact: true })
        .click();
      pages.push(p);
    }
    for (const p of pages)
      await expect(p.getByRole("status")).toHaveText("Voice connected", {
        timeout: 30000,
      });
    await pages[0].waitForTimeout(2000);
    const stats = [];
    for (const p of pages) {
      const result = await p.evaluate(async () => {
        const pc = window.pulsePeers.at(-1);
        const report = await pc.getStats();
        const transport = [...report.values()].find(
          (s) => s.type === "transport" && s.selectedCandidatePairId,
        );
        const pair = report.get(transport.selectedCandidatePairId);
        const local = report.get(pair.localCandidateId),
          remote = report.get(pair.remoteCandidateId);
        return {
          localCandidateType: local.candidateType,
          remoteCandidateType: remote.candidateType,
          connectionState: pc.connectionState,
          bytesReceived: pair.bytesReceived,
        };
      });
      if (result.localCandidateType !== "relay" || result.bytesReceived <= 0)
        throw Error(JSON.stringify(result));
      stats.push(result);
    }
    const result = {
      date: new Date().toISOString(),
      mode: "iceTransportPolicy=relay",
      peers: stats,
      scope:
        "Two local Chromium sessions, synthetic microphones, coturn through Docker Desktop; not a multi-network NAT test.",
    };
    fs.writeFileSync(
      "docs/evidence/turn-relay.json",
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(result);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
