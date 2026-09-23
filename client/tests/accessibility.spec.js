import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 1440]) {
  test(`welcome, workspace, and voice controls have no detected accessibility violations at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const check = async () => {
      // Measure the settled screen, not an intermediate entrance-animation frame.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        ),
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    };
    await check();
    await page.getByLabel("Display name").fill("a11y-review");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await expect(page.locator(".profile")).toContainText("Connected");
    await check();
    await page
      .getByRole("button", { name: "Join voice", exact: true })
      .first()
      .click();
    await check();
  });
}
