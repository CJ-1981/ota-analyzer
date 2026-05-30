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

  const page = await browser.newPage({ 
    viewport: { width: 1440, height: 900 },
    bypassCSP: true,
  });

  // Route interception  
  const misses: string[] = [];
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
      await route.fulfill({ 
        status: 200, 
        headers: { 'Content-Type': types[ext] || 'application/octet-stream' }, 
        body: fs.readFileSync(fp) 
      });
    } else {
      misses.push(url.pathname);
      await route.fulfill({ status: 404, body: 'Not Found', contentType: 'text/plain' });
    }
  });

  const consoleMsgs: string[] = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
  page.on('pageerror', (err) => consoleMsgs.push(`[PAGE ERROR] ${err.message.substring(0, 300)}`));
  page.on('requestfailed', (req) => consoleMsgs.push(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`));

  // Navigate with domcontentloaded (before load event)
  console.log('Navigating...');
  try {
    const resp = await page.goto('http://localhost:9999/ota-analyzer/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    console.log('Response:', resp?.status());
  } catch (e: any) {
    console.log('Nav error:', e.message?.substring(0, 200));
  }

  // Check state immediately
  await page.waitForTimeout(1000);
  let state = await page.evaluate(() => ({
    title: document.title,
    bodyStart: document.body?.innerText?.substring(0, 200) || '',
    htmlId: document.documentElement.id,
    readyState: document.readyState,
    bodyChildCount: document.body?.children.length,
  }));
  console.log('\nAfter 1s:', JSON.stringify(state));

  // Wait for JS to execute
  await page.waitForTimeout(8000);
  
  state = await page.evaluate(() => ({
    title: document.title,
    bodyStart: document.body?.innerText?.substring(0, 400) || '',
    htmlId: document.documentElement.id,
    readyState: document.readyState,
    bodyChildCount: document.body?.children.length,
  }));
  
  const extras = await page.evaluate(() => ({
    hasCharts: document.querySelectorAll('canvas, svg.recharts-surface').length > 0,
    tabCount: document.querySelectorAll('[role="tab"]').length,
    buttonCount: document.querySelectorAll('button').length,
  }));
  console.log('Extras:', JSON.stringify(extras));
  console.log('\nAfter 9s:', JSON.stringify(state));

  if (misses.length > 0) {
    console.log('\nMissed routes:', misses);
  }

  console.log('\n=== Console Messages ===');
  for (const msg of consoleMsgs.slice(0, 30)) console.log(msg);

  await page.screenshot({ path: `${OUTPUT_DIR}/test-bypass.png` });
  console.log('\nSize:', getFileSize(`${OUTPUT_DIR}/test-bypass.png`), 'KB');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
