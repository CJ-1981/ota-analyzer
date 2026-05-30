import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = '/home/z/my-project/docs';
const STATIC_DIR = '/home/z/my-project/out';
const MIME: Record<string, string> = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain',
};

async function createPage(browser: any, viewport: { width: number; height: number }): Promise<Page> {
  const page = await browser.newPage({ viewport });
  // Serve static files via route interception (no external HTTP server needed)
  await page.route('**/*', async (route: any) => {
    let urlPath = new URL(route.request().url()).pathname;
    // Strip /ota-analyzer prefix
    if (urlPath.startsWith('/ota-analyzer/')) urlPath = urlPath.substring('/ota-analyzer/'.length);
    else if (urlPath === '/ota-analyzer') urlPath = '';
    if (!urlPath || urlPath === '/') urlPath = 'index.html';

    const filePath = path.join(STATIC_DIR, urlPath);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      await route.fulfill({
        status: 200,
        contentType: MIME[ext] || 'application/octet-stream',
        body: fs.readFileSync(filePath),
      });
    } else {
      await route.fulfill({ status: 404, body: 'Not Found', contentType: 'text/plain' });
    }
  });
  return page;
}

async function wait(page: Page) {
  try {
    await page.locator('text=Loading analytics data').waitFor({ state: 'hidden', timeout: 30000 });
  } catch {}
  await page.locator('text=Total Vehicles').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2500);
}

async function switchTab(page: Page, name: string) {
  const tab = page.getByRole('tab', { name: new RegExp(name, 'i') });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  // Wait for Radix to switch tabs + charts to render
  await page.waitForTimeout(3000);
}

function fileSize(p: string): number {
  return Math.round(fs.statSync(p).size / 1024);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // We navigate to a dummy URL; route interception serves the content
  const DUMMY_URL = 'http://localhost/ota-analyzer/';

  // ── 1: Dashboard Overview ──
  console.log('1/4: Dashboard Overview...');
  const p1 = await createPage(browser, { width: 1440, height: 900 });
  await p1.goto(DUMMY_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await wait(p1);
  await p1.screenshot({ path: `${DOCS_DIR}/screenshot-overview.png` });
  console.log(`   ${fileSize(`${DOCS_DIR}/screenshot-overview.png`)} KB`);
  await p1.close();

  // ── 2: System Analytics ──
  console.log('2/4: System Analytics...');
  const p2 = await createPage(browser, { width: 1440, height: 900 });
  await p2.goto(DUMMY_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await wait(p2);
  await switchTab(p2, 'system');
  await p2.evaluate(() => {
    document.querySelector('[role="tablist"]')?.scrollIntoView({ block: 'start' });
  });
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: `${DOCS_DIR}/screenshot-system-analytics.png` });
  console.log(`   ${fileSize(`${DOCS_DIR}/screenshot-system-analytics.png`)} KB`);
  await p2.close();

  // ── 3: Wasted Data Analysis ──
  console.log('3/4: Wasted Data Analysis...');
  const p3 = await createPage(browser, { width: 1440, height: 900 });
  await p3.goto(DUMMY_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await wait(p3);
  await switchTab(p3, 'wasted');
  await p3.evaluate(() => {
    document.querySelector('[role="tablist"]')?.scrollIntoView({ block: 'start' });
  });
  await p3.waitForTimeout(500);

  // Debug: verify tab state
  const activeTab = await p3.locator('[role="tab"][data-state="active"]').first().textContent();
  const hasBreakdown = await p3.locator('text=Breakdown').first().isVisible().catch(() => false);
  console.log(`   Active tab: "${activeTab?.trim()}", Has breakdown: ${hasBreakdown}`);

  await p3.screenshot({ path: `${DOCS_DIR}/screenshot-wasted-data.png` });
  console.log(`   ${fileSize(`${DOCS_DIR}/screenshot-wasted-data.png`)} KB`);
  await p3.close();

  // ── 4: Mobile View ──
  console.log('4/4: Mobile View...');
  const p4 = await createPage(browser, { width: 375, height: 812 });
  await p4.goto(DUMMY_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await wait(p4);
  await p4.waitForTimeout(1000);

  // Verify mobile tabs are visible and not overlapping
  const tabCount = await p4.locator('[role="tab"]').count();
  console.log(`   Tab count: ${tabCount}`);

  await p4.screenshot({ path: `${DOCS_DIR}/screenshot-mobile.png` });
  console.log(`   ${fileSize(`${DOCS_DIR}/screenshot-mobile.png`)} KB`);
  await p4.close();

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
