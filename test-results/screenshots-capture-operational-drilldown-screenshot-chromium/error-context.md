# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: screenshots.spec.ts >> capture operational drilldown screenshot
- Location: e2e/screenshots.spec.ts:21:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.evaluate: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e4]
  - heading "This page couldn’t load" [level=1] [ref=e6]
  - paragraph [ref=e7]: Reload to try again, or go back.
  - generic [ref=e8]:
    - button "Reload" [ref=e10] [cursor=pointer]
    - button "Back" [ref=e11] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect, type Page } from "@playwright/test";
  2  | 
  3  | test("capture overview screenshot", async ({ page }) => {
  4  |   await page.goto("/ota-analyzer/");
  5  |   // Wait for loading spinner to hide
  6  |   try {
  7  |     await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  8  |   } catch (e) {
  9  |     // Continue even if spinner wasn't found
  10 |   }
  11 |   await page.waitForTimeout(3000);
  12 | 
  13 |   // Take screenshot regardless of content
  14 |   await page.screenshot({ path: "docs/screenshot-overview.png", fullPage: false });
  15 | 
  16 |   // Check what's actually on the page
  17 |   const h1 = await page.textContent("h1").catch(() => "N/A");
  18 |   console.log("H1 found:", h1);
  19 | });
  20 | 
  21 | test("capture operational drilldown screenshot", async ({ page }) => {
  22 |   await page.goto("/ota-analyzer/");
  23 |   try {
  24 |     await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  25 |   } catch (e) {}
  26 |   await page.waitForTimeout(3000);
  27 | 
  28 |   // Try to click tab
  29 |   try {
  30 |     await page.getByRole("tab", { name: /operational/i }).click();
  31 |     await page.waitForTimeout(1500);
  32 |   } catch (e) {
  33 |     console.log("Could not click tab:", e.message?.substring(0, 100));
  34 |   }
  35 | 
> 36 |   await page.evaluate(() => {
     |              ^ Error: page.evaluate: Target page, context or browser has been closed
  37 |     const c = document.querySelectorAll(".recharts-wrapper");
  38 |     if (c.length > 0) c[0].scrollIntoView({ block: "center" });
  39 |   });
  40 |   await page.waitForTimeout(500);
  41 |   await page.screenshot({ path: "docs/screenshot-drilldown.png", fullPage: false });
  42 | });
  43 | 
  44 | test("capture wasted data screenshot", async ({ page }) => {
  45 |   await page.goto("/ota-analyzer/");
  46 |   try {
  47 |     await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  48 |   } catch (e) {}
  49 |   await page.waitForTimeout(3000);
  50 | 
  51 |   try {
  52 |     await page.getByRole("tab", { name: /wasted/i }).click();
  53 |     await page.waitForTimeout(1500);
  54 |   } catch (e) {
  55 |     console.log("Could not click tab:", e.message?.substring(0, 100));
  56 |   }
  57 | 
  58 |   await page.evaluate(() => {
  59 |     const c = document.querySelectorAll(".recharts-wrapper");
  60 |     if (c.length > 0) c[0].scrollIntoView({ block: "center" });
  61 |   });
  62 |   await page.waitForTimeout(500);
  63 |   await page.screenshot({ path: "docs/screenshot-wasted.png", fullPage: false });
  64 | });
  65 | 
  66 | test("capture configuration panel screenshot", async ({ page }) => {
  67 |   await page.goto("/ota-analyzer/");
  68 |   try {
  69 |     await expect(page.getByText("Loading analytics data")).toBeHidden({ timeout: 30_000 });
  70 |   } catch (e) {}
  71 |   await page.waitForTimeout(3000);
  72 | 
  73 |   try {
  74 |     await page.getByRole("button", { name: /config/i }).click();
  75 |     await page.waitForTimeout(1000);
  76 |   } catch (e) {
  77 |     console.log("Could not click config:", e.message?.substring(0, 100));
  78 |   }
  79 | 
  80 |   await page.screenshot({ path: "docs/screenshot-config.png", fullPage: false });
  81 | });
  82 | 
```