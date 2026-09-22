const { chromium, expect } = require("../client/node_modules/@playwright/test");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch();
  try {
    async function open(name) {
      const c = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const p = await c.newPage();
      await p.goto("http://localhost:8089");
      await p.getByLabel("Display name").fill(name);
      await p.getByRole("button", { name: "Enter workspace" }).click();
      await expect(p.locator(".profile")).toContainText("Connected");
      await p.getByRole("button", { name: "# engineering" }).click();
      await expect(p.locator(".profile")).toContainText("Connected");
      return {
        c,
        p,
        pod: await p.locator(".channel-about code").textContent(),
      };
    }
    const a = await open("cross-pod-a");
    let b;
    for (let i = 0; i < 12; i++) {
      b = await open("cross-pod-b");
      if (b.pod !== a.pod) break;
      await b.c.close();
      b = null;
    }
    if (!b) throw Error("Could not obtain two distinct gateway attachments");
    const message =
      "Verified across two different gateway pods · " +
      new Date().toISOString();
    await a.p.getByLabel("Message engineering", { exact: true }).fill(message);
    await a.p
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(b.p.getByText(message, { exact: true })).toBeVisible();
    await a.p.screenshot({ path: "docs/images/cross-pod-a.png" });
    await b.p.screenshot({ path: "docs/images/cross-pod-b.png" });
    const result = {
      date: new Date().toISOString(),
      senderPod: a.pod,
      receiverPod: b.pod,
      message,
      received: true,
    };
    fs.writeFileSync(
      "docs/evidence/cross-pod-browser.json",
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
