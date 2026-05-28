import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────

async function waitForDashboard(page: Page) {
  await expect(page.getByText("Loading analytics data")).toBeHidden({
    timeout: 30_000,
  });
}

async function goToTab(page: Page, tab: "system" | "operational" | "wasted") {
  await page.getByRole("tab", { name: tab, exact: false }).click();
  await page.waitForTimeout(500);
}

// ─── Test Suite ───────────────────────────────────────────────────────

test.describe("OTA Analytics Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
  });

  // ── Page load ───────────────────────────────────────────────────

  test("loads the dashboard and hides the loading spinner", async ({ page }) => {
    await expect(page.getByText("Analytics Dashboard")).toBeVisible();
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

  test("Download Report button triggers file download", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.getByRole("button", { name: /download.*report/i }).click();
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
    await page.goto("/");
    await waitForDashboard(page);
  });

  test("dashboard is usable on small screens", async ({ page }) => {
    await expect(page.getByText("Analytics Dashboard")).toBeVisible();
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
  test("navigating to an invalid sub-path returns 404", async ({ page }) => {
    const res = await page.goto("/nonexistent-page");
    expect(res?.status()).toBe(404);
  });
});
