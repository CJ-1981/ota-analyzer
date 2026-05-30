import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = '/home/z/my-project/docs';
const STAGING_DIR = '/tmp/ota-staging-fresh/ota-analyzer';

function getFileSize(filePath: string): number {
  try { return Math.round(fs.statSync(filePath).size / 1024); }
  catch { return 0; }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Route interception
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

  const consoleMsgs: string[] = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
  page.on('pageerror', (err) => consoleMsgs.push(`[PAGE ERROR] ${err.message.substring(0, 300)}`));

  console.log('Navigating to fresh build...');
  const resp = await page.goto('http://ota.local/ota-analyzer/', { waitUntil: 'commit', timeout: 15000 });
  console.log('Response:', resp?.status());

  // Check what resources are loaded
  await page.waitForTimeout(10000);

  console.log('\n=== Console Messages ===');
  for (const msg of consoleMsgs.slice(0, 30)) console.log(msg);

  const state = await page.evaluate(() => ({
    title: document.title,
    bodyStart: document.body?.innerText?.substring(0, 500) || '',
    bodyClasses: document.body?.className || '',
    htmlId: document.documentElement.id,
    hasCharts: document.querySelectorAll('canvas, svg.recharts-surface').length > 0,
    tabCount: document.querySelectorAll('[role="tab"]').length,
    buttonCount: document.querySelectorAll('button').length,
  }));
  console.log('\nState:', JSON.stringify(state, null, 2));

  await page.screenshot({ path: `${OUTPUT_DIR}/test-fresh.png` });
  console.log('Size:', getFileSize(`${OUTPUT_DIR}/test-fresh.png`), 'KB');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
