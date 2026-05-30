import { test, expect, type Page } from "@playwright/test";

test("capture overview screenshot", async ({ page }) => {
  await page.goto("/ota-analyzer/");
  // Wait for loading spinner to hide
  try {
    await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  } catch (e) {
    // Continue even if spinner wasn't found
  }
  await page.waitForTimeout(3000);

  // Take screenshot regardless of content
  await page.screenshot({ path: "docs/screenshot-overview.png", fullPage: false });

  // Check what's actually on the page
  const h1 = await page.textContent("h1").catch(() => "N/A");
  console.log("H1 found:", h1);
});

test("capture operational drilldown screenshot", async ({ page }) => {
  await page.goto("/ota-analyzer/");
  try {
    await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  } catch (e) {}
  await page.waitForTimeout(3000);

  // Try to click tab
  try {
    await page.getByRole("tab", { name: /operational/i }).click();
    await page.waitForTimeout(1500);
  } catch (e) {
    console.log("Could not click tab:", e.message?.substring(0, 100));
  }

  await page.evaluate(() => {
    const c = document.querySelectorAll(".recharts-wrapper");
    if (c.length > 0) c[0].scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshot-drilldown.png", fullPage: false });
});

test("capture wasted data screenshot", async ({ page }) => {
  await page.goto("/ota-analyzer/");
  try {
    await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  } catch (e) {}
  await page.waitForTimeout(3000);

  try {
    await page.getByRole("tab", { name: /wasted/i }).click();
    await page.waitForTimeout(1500);
  } catch (e) {
    console.log("Could not click tab:", e.message?.substring(0, 100));
  }

  await page.evaluate(() => {
    const c = document.querySelectorAll(".recharts-wrapper");
    if (c.length > 0) c[0].scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshot-wasted.png", fullPage: false });
});

test("capture configuration panel screenshot", async ({ page }) => {
  await page.goto("/ota-analyzer/");
  try {
    await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  } catch (e) {}
  await page.waitForTimeout(3000);

  try {
    await page.getByRole("button", { name: /config/i }).click();
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log("Could not click config:", e.message?.substring(0, 100));
  }

  await page.screenshot({ path: "docs/screenshot-config.png", fullPage: false });
});
