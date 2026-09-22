/** Real API-backed presentation fixtures. No network mocking or fabricated metrics. */
const { chromium } = require("../client/node_modules/playwright");
const fs = require("node:fs");
const base = process.env.PULSE_URL || "http://localhost:8085";
(async () => {
  fs.mkdirSync("docs/images", { recursive: true });
  const browser = await chromium.launch();
  const landing = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  await landing.goto(base);
  await landing.evaluate(() => document.fonts.ready);
  await landing.screenshot({ path: "docs/images/welcome.png", fullPage: true });
  const people = ["muzammil", "sarah", "alex"];
  const pages = [];
  for (const name of people) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(base);
    await page.getByLabel("Display name").fill(name);
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await page.getByRole("button", { name: "# engineering" }).click();
    await page
      .locator(".profile")
      .getByText("Connected", { exact: true })
      .waitFor();
    pages.push(page);
  }
  const conversation = [
    [
      0,
      "A fresh space for the things we’re building. Welcome to the engineering channel 👋",
    ],
    [
      1,
      "Love how calm this feels. One place for the updates, the questions, and the small wins.",
    ],
    [
      2,
      "And a real system underneath: messages go through PostgreSQL and Redis before reaching everyone here.",
    ],
    [
      0,
      "Exactly. Different connections, one conversation. The interesting part is making it hold together when a gateway disappears.",
    ],
    [
      1,
      "That’s the next demo, then. Break something, watch it recover, and write down what actually happened.",
    ],
    [0, "Good engineering starts with a good question. Let’s keep building. ↗"],
  ];
  // Idempotent fixture creation: repeated captures do not duplicate the thread.
  if (
    !(await pages[0].getByText(conversation[0][1], { exact: true }).count())
  ) {
    for (const [index, text] of conversation) {
      await pages[index]
        .getByLabel("Message engineering", { exact: true })
        .fill(text);
      await pages[index]
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await pages[0].getByText(text, { exact: true }).waitFor();
    }
  }
  await pages[0]
    .getByLabel("Message engineering", { exact: true })
    .fill("A little progress, every day.");
  await pages[0].waitForTimeout(11000); // Let presence lease snapshots reach all browsers.
  await pages[0].locator(".messages").evaluate((el) => (el.scrollTop = 0));
  await pages[0].evaluate(() => document.fonts.ready);
  await pages[0].screenshot({
    path: "docs/images/workspace.png",
    fullPage: true,
  });
  await pages[0].setViewportSize({ width: 390, height: 844 });
  await pages[0].locator(".messages").evaluate((el) => (el.scrollTop = 0));
  await pages[0].screenshot({ path: "docs/images/mobile.png", fullPage: true });
  await browser.close();
})();
