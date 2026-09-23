import { test, expect } from "@playwright/test";
async function join(page, name) {
  await page.goto("/");
  await page.getByLabel("Display name").fill(name);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page.locator(".profile")).toContainText("Connected");
}
test("two guests exchange persisted messages, switch channels, and search", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const alice = await a.newPage(),
    bob = await b.newPage();
  const stamp = Date.now();
  await join(alice, "alice");
  await join(bob, "bob");
  const message = `Browser proof ${stamp}`;
  await alice.getByLabel("Message general", { exact: true }).fill(message);
  await alice
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(bob.getByText(message, { exact: true })).toBeVisible();
  await bob.reload();
  await expect(bob.getByText(message, { exact: true })).toBeVisible();
  await bob.getByRole("button", { name: "# engineering" }).click();
  await expect(bob.getByText(message, { exact: true })).toHaveCount(0);
  await bob.reload();
  await expect(
    bob.getByRole("heading", { name: "engineering", exact: true }),
  ).toBeVisible();
  await bob.getByRole("button", { name: "# general" }).click();
  await expect(bob.getByText(message, { exact: true })).toBeVisible();
  await bob.getByLabel("Search loaded messages").fill("no-match-" + stamp);
  await expect(bob.getByText(/No messages match/)).toBeVisible();
  await a.close();
  await b.close();
});
test("mobile layout, keyboard send, safe text rendering, and logout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await join(page, "mobile");
  await page
    .getByLabel("Message general", { exact: true })
    .fill('<script>alert("text")</script>');
  await page.getByLabel("Message general", { exact: true }).press("Enter");
  await expect(
    page.getByText('<script>alert("text")</script>', { exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Toggle channels" }).click();
  await page.getByRole("button", { name: "Leave workspace" }).click();
  await expect(page.getByLabel("Display name")).toBeVisible();
});
test("two browsers establish WebRTC audio and cleanly leave", async ({
  browser,
}) => {
  const a = await browser.newContext({ permissions: ["microphone"] }),
    b = await browser.newContext({ permissions: ["microphone"] });
  const first = await a.newPage(),
    second = await b.newPage();
  await join(first, "voice-a");
  await join(second, "voice-b");
  for (const page of [first, second]) {
    await page
      .getByRole("button", { name: "Join voice", exact: false })
      .first()
      .click();
    await page
      .locator(".call-panel")
      .getByRole("button", { name: "Join voice", exact: true })
      .click();
  }
  await expect(first.getByRole("status")).toHaveText("Voice connected", {
    timeout: 25000,
  });
  await expect(second.getByRole("status")).toHaveText("Voice connected", {
    timeout: 25000,
  });
  const volume = first.getByLabel("Peer volume");
  await volume.focus();
  await volume.press("Home");
  for (let i = 0; i < 5; i++) await volume.press("ArrowRight");
  await expect(volume).toHaveValue("0.25");
  expect(
    await first.getByLabel("Peer audio").evaluate((audio) => audio.volume),
  ).toBe(0.25);
  await first.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "Unmute", exact: true }),
  ).toBeVisible();
  await first.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(second.getByRole("status")).toContainText("Your peer left");
  await a.close();
  await b.close();
});
