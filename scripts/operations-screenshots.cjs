const { chromium } = require("../client/node_modules/@playwright/test");
const { execFileSync } = require("node:child_process");
(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      ignoreHTTPSErrors: true,
    });
    const p = await ctx.newPage();
    await p.goto(
      "http://localhost:3000/d/pulse-operations?orgId=1&from=now-15m&to=now",
    );
    await p.getByText("Active connections", { exact: true }).waitFor();
    await p.waitForTimeout(6000);
    await p.screenshot({ path: "docs/images/operations.png", fullPage: false });
    const password = execFileSync(
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
          password: Buffer.from(password, "base64").toString(),
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
    await p.goto(
      "https://localhost:8090/applications/argocd/pulse?view=tree&resource=",
    );
    await p
      .getByText("Healthy", { exact: true })
      .first()
      .waitFor({ timeout: 30000 });
    await p.waitForTimeout(3000);
    await p.screenshot({ path: "docs/images/gitops.png", fullPage: true });
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
