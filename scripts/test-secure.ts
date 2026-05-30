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
      '--unsafely-treat-insecure-origin-as-secure=http://ota.local',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Set up route interception BEFORE any navigation
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
      // Serve empty for unmatched routes
      await route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
    }
  });

  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message.substring(0, 300)));

  // Navigate
  console.log('Navigating...');
  const resp = await page.goto('http://ota.local/ota-analyzer/', { waitUntil: 'commit', timeout: 15000 });
  console.log('Response:', resp?.status());

  // Check crypto
  const cryptoInfo = await page.evaluate(() => ({
    isSecure: window.isSecureContext,
    cryptoSubtle: !!crypto?.subtle,
  }));
  console.log('Crypto:', JSON.stringify(cryptoInfo));

  // Wait for React to render
  await page.waitForTimeout(10000);

  const state = await page.evaluate(() => ({
    title: document.title,
    bodyStart: document.body?.innerText?.substring(0, 500) || '',
    bodyClasses: document.body?.className || '',
    htmlId: document.documentElement.id,
    hasCharts: document.querySelectorAll('canvas, svg.recharts-surface').length > 0,
    tabCount: document.querySelectorAll('[role="tab"]').length,
    buttonCount: document.querySelectorAll('button:not([id="_R_"])').length,
  }));
  console.log('State:', JSON.stringify(state, null, 2));

  await page.screenshot({ path: `${OUTPUT_DIR}/test-secure.png` });
  console.log('Size:', getFileSize(`${OUTPUT_DIR}/test-secure.png`), 'KB');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
