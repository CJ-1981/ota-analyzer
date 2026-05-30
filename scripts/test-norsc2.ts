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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Read and modify HTML
  let html = fs.readFileSync(path.join(STAGING_DIR, 'index.html'), 'utf-8');
  
  // Keep the __next_f initialization: (self.__next_f=self.__next_f||[]).push([0])
  // But remove all RSC data pushes: self.__next_f.push([1,"..."])
  // The RSC data pushes contain serialized React Server Component tree
  // Without them, React will do a full client-side render
  
  // Remove only the [1,"..."] pushes (RSC data), keep [0] (bootstrap signal)
  html = html.replace(/<script>self\.__next_f\.push\(\[1,"[^"]*"\]\)<\/script>/g, '');
  
  console.log('Modified HTML length:', html.length);

  // Route interception
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    let rp = url.pathname;
    if (rp.startsWith('/ota-analyzer/')) rp = rp.substring('/ota-analyzer/'.length);
    else if (rp.startsWith('/ota-analyzer')) rp = rp.substring('/ota-analyzer'.length);
    if (!rp || rp === '/') rp = 'index.html';
    const fp = path.join(STAGING_DIR, rp);
    if (rp === 'index.html') {
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'text/html' }, body: html });
    } else if (fs.existsSync(fp)) {
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

  console.log('Navigating...');
  const resp = await page.goto('http://ota.local/ota-analyzer/', { waitUntil: 'commit', timeout: 15000 });
  console.log('Response:', resp?.status());

  await page.waitForTimeout(12000);

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

  await page.screenshot({ path: `${OUTPUT_DIR}/test-norsc2.png` });
  console.log('Size:', getFileSize(`${OUTPUT_DIR}/test-norsc2.png`), 'KB');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
