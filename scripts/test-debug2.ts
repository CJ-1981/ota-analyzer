import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = '/home/z/my-project/docs';
const STAGING_DIR = '/tmp/ota-staging-live/ota-analyzer';

function getFileSize(filePath: string): number {
  try { return Math.round(fs.statSync(filePath).size / 1024); }
  catch { return 0; }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-gpu', 
      '--disable-dev-shm-usage',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Polyfill crypto.subtle for non-secure contexts
  await page.addInitScript(() => {
    // Check if crypto.subtle is available, if not, try to provide it
    if (!crypto.subtle) {
      // Use Node.js crypto or a simple polyfill
      // In headless Chrome, crypto.subtle requires secure context
      // We can't fully polyfill it, but we can prevent errors
      try {
        // Access the subtle API directly (might work in some contexts)
        const subtle = (crypto as any).subtle || (window as any).crypto?.subtle;
        if (!subtle) {
          console.log('crypto.subtle not available - this may cause issues');
        }
      } catch {
        console.log('crypto.subtle access failed');
      }
    }
  });

  // Set up route interception
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    let rp = url.pathname;
    if (rp.startsWith('/ota-analyzer/')) rp = rp.substring('/ota-analyzer/'.length);
    else if (rp.startsWith('/ota-analyzer')) rp = rp.substring('/ota-analyzer'.length);
    if (!rp || rp === '/') rp = 'index.html';
    const fp = path.join(STAGING_DIR, rp);
    if (fs.existsSync(fp)) {
      const ext = path.extname(fp).toLowerCase();
      const types: Record<string, string> = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
        '.png': 'image/png', '.ico': 'image/x-icon',
      };
      await route.fulfill({ status: 200, headers: { 'Content-Type': types[ext] || 'application/octet-stream' }, body: fs.readFileSync(fp) });
    } else {
      console.log('MISS:', url.pathname);
      await route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
    }
  });

  // Capture ALL console messages to understand the React error
  const consoleMsgs: string[] = [];
  page.on('console', msg => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text().substring(0, 300)}`);
  });
  page.on('pageerror', (err) => consoleMsgs.push(`[PAGE ERROR] ${err.message.substring(0, 300)}`));

  console.log('Navigating...');
  const resp = await page.goto('http://ota.local/ota-analyzer/', { waitUntil: 'commit', timeout: 15000 });
  console.log('Response:', resp?.status());

  await page.waitForTimeout(10000);

  // Print all console messages
  console.log('\n=== Console Messages ===');
  for (const msg of consoleMsgs) {
    console.log(msg);
  }

  // Check state
  const state = await page.evaluate(() => ({
    title: document.title,
    bodyStart: document.body?.innerText?.substring(0, 300) || '',
    htmlId: document.documentElement.id,
    hasCharts: document.querySelectorAll('canvas, svg.recharts-surface').length > 0,
    tabCount: document.querySelectorAll('[role="tab"]').length,
  }));
  console.log('\nState:', JSON.stringify(state, null, 2));

  await page.screenshot({ path: `${OUTPUT_DIR}/test-debug2.png` });
  console.log('Size:', getFileSize(`${OUTPUT_DIR}/test-debug2.png`), 'KB');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
