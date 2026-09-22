/** Real browser recovery after deleting its attached gateway pod in the dedicated kind demo. */
const { chromium, expect } = require("../client/node_modules/@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      recordVideo: process.env.PULSE_RECORD
        ? { dir: "artifacts/recovery", size: { width: 1440, height: 1000 } }
        : undefined,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(process.env.PULSE_URL || "http://localhost:8088");
    await page.getByLabel("Display name").fill("resilience");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await expect(page.locator(".profile")).toContainText("Connected");
    const pod = await page.locator(".channel-about code").textContent();
    const message = `History survives a gateway replacement · ${Date.now()}`;
    await page.getByLabel("Message general", { exact: true }).fill(message);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    const started = Date.now();
    execFileSync("kubectl", [
      "--context",
      "kind-pulse-demo",
      "-n",
      "pulse",
      "delete",
      "pod",
      pod,
      "--wait=false",
    ]);
    await expect(page.locator(".channel-about code")).not.toHaveText(pod, {
      timeout: 60000,
    });
    await expect(page.locator(".profile")).toContainText("Connected");
    const recoveredMs = Date.now() - started;
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await page
      .getByLabel("Message general", { exact: true })
      .fill("Reconnected. History retained. New messages work.");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      page
        .getByText("Reconnected. History retained. New messages work.", {
          exact: true,
        })
        .last(),
    ).toBeVisible();
    const result = {
      experiment: "delete attached gateway pod",
      date: new Date().toISOString(),
      before: pod,
      after: await page.locator(".channel-about code").textContent(),
      recoveryMs: recoveredMs,
      persistedMessageVisible: true,
      newMessageDelivered: true,
      limitations:
        "One local graceful pod deletion; not node loss, not internet failover.",
    };
    fs.writeFileSync(
      process.env.PULSE_OUTPUT || "docs/evidence/gateway-recovery.json",
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(result);
    if (process.env.PULSE_RECORD) {
      await page.waitForTimeout(20000);
      const video = page.video();
      await context.close();
      await video.saveAs("artifacts/pulse-recovery.webm");
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
