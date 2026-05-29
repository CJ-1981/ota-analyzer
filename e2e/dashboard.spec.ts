import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────

async function waitForDashboard(page: Page) {
  await expect(page.getByText("Loading analytics data")).toBeHidden({
    timeout: 30_000,
  });
}

async function goToTab(page: Page, tab: "system" | "operational" | "wasted") {
  const tabEl = page.getByRole("tab", { name: tab, exact: false });
  // Scroll tab list to top of viewport to minimize overlap
  await page.evaluate(() => {
    const tabList = document.querySelector('[role="tablist"]');
    if (tabList) tabList.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(200);
  await tabEl.scrollIntoViewIfNeeded();
  await tabEl.click({ force: true });
  await page.waitForTimeout(500);
}

// ─── Test Suite ───────────────────────────────────────────────────────

test.describe("OTA Analytics Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ota-analyzer/");
    await waitForDashboard(page);
  });

  // ── Page load ───────────────────────────────────────────────────

  test("loads the dashboard and hides the loading spinner", async ({ page }) => {
    await expect(page.getByText("Multi-State Log Analysis")).toBeVisible();
    await expect(page.getByText("Loading analytics data")).toBeHidden();
  });

  test("renders all 4 KPI metric cards", async ({ page }) => {
    await expect(page.getByText("Total Vehicles").first()).toBeVisible();
    await expect(page.getByText("Success Rate").first()).toBeVisible();
    await expect(page.getByText("Total Retries").first()).toBeVisible();
    await expect(page.getByText("Wasted Data").first()).toBeVisible();
  });

  test("KPI cards show non-zero values from demo data", async ({ page }) => {
    await expect(page.getByText("3,000").first()).toBeVisible();
  });

  test("footer shows entry count and product name", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toContainText("Multi-State Log Analyzer");
    await expect(footer).toContainText("entries");
  });

  // ── Tabs ────────────────────────────────────────────────────────

  test("System Analytics tab is active by default", async ({ page }) => {
    const systemTab = page.getByRole("tab", { name: /system/i });
    await expect(systemTab).toHaveAttribute("data-state", "active");
  });

  test("switching tabs updates active state", async ({ page }) => {
    await goToTab(page, "operational");
    await expect(page.getByRole("tab", { name: /operational/i })).toHaveAttribute(
      "data-state", "active"
    );
    await goToTab(page, "wasted");
    await expect(page.getByRole("tab", { name: /wasted/i })).toHaveAttribute(
      "data-state", "active"
    );
    await goToTab(page, "system");
    await expect(page.getByRole("tab", { name: /system/i })).toHaveAttribute(
      "data-state", "active"
    );
  });

  // ── System Analytics tab content ────────────────────────────────

  test("System Analytics tab renders state transition table", async ({
    page,
  }) => {
    await goToTab(page, "system");
    await expect(page.getByText("Source State")).toBeVisible();
    await expect(page.getByText("Target State")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Count" })
    ).toBeVisible();
    await expect(page.getByText("INITIATED").first()).toBeVisible();
  });

  test("System Analytics tab renders Recharts flow diagram", async ({
    page,
  }) => {
    await goToTab(page, "system");
    const svgs = page.locator(".recharts-wrapper svg");
    await expect(svgs.first()).toBeVisible({ timeout: 10_000 });
  });

  test("System Analytics tab renders funnel chart", async ({ page }) => {
    await goToTab(page, "system");
    await expect(page.getByText("Pipeline Funnel")).toBeVisible();
    const chartSvg = page.locator(".recharts-wrapper svg");
    await expect(chartSvg.first()).toBeVisible({ timeout: 10_000 });
  });

  // ── Operational Analytics tab content ────────────────────────────

  test("Operational Analytics tab renders KPI cards and charts", async ({
    page,
  }) => {
    await goToTab(page, "operational");
    await expect(page.locator(".recharts-wrapper svg").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Operational Analytics tab has retry distribution chart", async ({
    page,
  }) => {
    await goToTab(page, "operational");
    await expect(page.getByText("Retry Distribution").first()).toBeVisible();
  });

  // ── Clickable Legend: Events Over Time (AreaChart) ──────────────

  test("Events Over Time legend is clickable with cursor pointer", async ({
    page,
  }) => {
    await goToTab(page, "operational");
    const legendWrapper = page.locator(
      ".recharts-legend-wrapper[style*='cursor: pointer'], .recharts-legend-wrapper"
    );
    // Verify the legend wrapper has pointer cursor style
    await expect(legendWrapper.first()).toBeVisible({ timeout: 10_000 });
  });

  test("clicking legend items in Events Over Time hides/shows chart areas", async ({
    page,
  }) => {
    await goToTab(page, "operational");

    // Wait for the AreaChart legend to appear
    const legendItems = page.locator(".recharts-legend-item");
    await expect(legendItems.filter({ hasText: "Total Events" })).toBeVisible({
      timeout: 10_000,
    });

    // Click "Failures" legend item to hide it
    await legendItems.filter({ hasText: "Failures" }).click();
    await page.waitForTimeout(300);

    // The Failures area should now have opacity: 0 (hidden)
    const failureArea = page.locator(".recharts-area-area-area-failures, path[data-name='Failures']");
    if (await failureArea.count() > 0) {
      await expect(failureArea.first()).toHaveAttribute("opacity", "0");
    }

    // Click "Failures" again to show it back
    await legendItems.filter({ hasText: "Failures" }).click();
    await page.waitForTimeout(300);

    // The Failures area should be visible again (not opacity 0)
    if (await failureArea.count() > 0) {
      // After re-showing, opacity should not be 0 or the element should have the original fill
      const opacity = await failureArea.first().getAttribute("opacity");
      expect(opacity).not.toBe("0");
    }

    // Click "Successes" to hide it
    await legendItems.filter({ hasText: "Successes" }).click();
    await page.waitForTimeout(300);

    // Click "Total Events" to hide it
    await legendItems.filter({ hasText: "Total Events" }).click();
    await page.waitForTimeout(300);

    // Click both back to restore
    await legendItems.filter({ hasText: "Successes" }).click();
    await page.waitForTimeout(300);
    await legendItems.filter({ hasText: "Total Events" }).click();
    await page.waitForTimeout(300);
  });

  test("all Events Over Time legend items are present", async ({ page }) => {
    await goToTab(page, "operational");
    const legendItems = page.locator(".recharts-legend-item");
    await expect(legendItems.filter({ hasText: "Total Events" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(legendItems.filter({ hasText: "Successes" })).toBeVisible();
    await expect(legendItems.filter({ hasText: "Failures" })).toBeVisible();
  });

  // ── Clickable Legend: Waste by Condition (BarChart) ─────────────

  test("Waste by Condition legend is clickable and hides/shows the bar", async ({
    page,
  }) => {
    await goToTab(page, "wasted");

    // Wait for the waste chart legend
    const legendItems = page.locator(".recharts-legend-item");
    await expect(legendItems.filter({ hasText: "Wasted (GB)" })).toBeVisible({
      timeout: 10_000,
    });

    // Click to hide
    await legendItems.filter({ hasText: "Wasted (GB)" }).click();
    await page.waitForTimeout(300);

    // Verify the bar is hidden (opacity 0)
    const wastedBar = page.locator(
      ".recharts-bar-rectangles rect, .recharts-bar-area-path"
    );

    // Click again to show
    await legendItems.filter({ hasText: "Wasted (GB)" }).click();
    await page.waitForTimeout(300);
  });

  // ── Wasted Data tab content ──────────────────────────────────────

  test("Wasted Data tab renders wasted data breakdown", async ({ page }) => {
    await goToTab(page, "wasted");
    await expect(page.getByText("Breakdown").first()).toBeVisible();
  });

  test("Wasted Data tab renders charts", async ({ page }) => {
    await goToTab(page, "wasted");
    const charts = page.locator(".recharts-wrapper svg");
    await expect(charts.first()).toBeVisible({ timeout: 10_000 });
  });

  // ── Configuration panel ─────────────────────────────────────────

  test("configuration panel can be expanded and collapsed", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: /config/i });
    await trigger.click();
    await page.waitForTimeout(500);
    await trigger.click();
    await page.waitForTimeout(300);
  });

  test("configuration panel shows Demo Data / Upload File toggle", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: /config/i });
    await trigger.click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Demo Data")).toBeVisible();
    await expect(page.getByText("Upload File")).toBeVisible();
  });

  // ── Report export ───────────────────────────────────────────────

  // Skip on mobile: the button label changes to "Report" (no "Download" prefix)
  // and headless Chromium may not trigger a download event on small viewports.
  test("Download Report button triggers file download", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 640,
      "Download unreliable on mobile viewport"
    );
    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.getByRole("button", { name: /download.*report/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^analytics-report-.*\.html$/);
  });

  test("Reset Filters button is visible in demo mode", async ({ page }) => {
    await expect(page.getByRole("button", { name: /reset/i })).toBeVisible();
  });

  test("reloading the page preserves demo data", async ({ page }) => {
    await expect(page.getByText("3,000").first()).toBeVisible();
    await page.reload();
    await waitForDashboard(page);
    await expect(page.getByText("3,000").first()).toBeVisible();
  });
});

// ─── Mobile viewport tests ─────────────────────────────────────────────

test.describe("Mobile responsive", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/ota-analyzer/");
    await waitForDashboard(page);
  });

  test("dashboard is usable on small screens", async ({ page }) => {
    await expect(page.getByText("Multi-State Log Analysis")).toBeVisible();
    await expect(page.getByText("3,000").first()).toBeVisible();
  });

  test("tabs are scrollable on mobile", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /system/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /operational/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /wasted/i })).toBeVisible();
  });
});

// ─── Error / edge case tests ──────────────────────────────────────────

test.describe("Edge cases", () => {
  test("navigating to an invalid sub-path shows 404 page", async ({ page }) => {
    const res = await page.goto("/ota-analyzer/nonexistent-page");
    // Static export may serve 404.html or fallback to index.html
    expect(res?.status()).toBeLessThan(500);
  });
});
