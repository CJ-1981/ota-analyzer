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

  // Read original HTML
  const originalHtml = fs.readFileSync(path.join(STAGING_DIR, 'index.html'), 'utf-8');
  
  // Create a clean HTML that loads the JS app without server-rendered React content
  // The key insight: Next.js error #310 occurs during hydration
  // By providing __NEXT_DATA__ and a clean __next div, we skip hydration
  const rscPayloads = originalHtml.match(/<script>self\.__next_f\.push\(\[1,"[^"]*"\]\)<\/script>/gs) || [];
  const rscScripts = rscPayloads.join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="preload" href="/ota-analyzer/_next/static/media/5c0c2bcbaa4149ca-s.p.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="preload" href="/ota-analyzer/_next/static/media/5c1dcbfbff27328a-s.p.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="preload" href="/ota-analyzer/_next/static/media/e4af272ccee01ff0-s.p.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="stylesheet" href="/ota-analyzer/_next/static/css/6956c0fe83e928cb.css" data-precedence="next"/>
  <script src="/ota-analyzer/_next/static/chunks/webpack-7aa7c37fd3a523e8.js"></script>
  <script src="/ota-analyzer/_next/static/chunks/4bd1b696-deb4a0a1da1923b0.js" async></script>
  <script src="/ota-analyzer/_next/static/chunks/794-314c5f91b85aeb51.js" async></script>
  <script src="/ota-analyzer/_next/static/chunks/main-app-7462f7ea190eee1f.js" async></script>
  <script src="/ota-analyzer/_next/static/chunks/325-915fd54f49b4fa6f.js" async></script>
  <script src="/ota-analyzer/_next/static/chunks/app/page-50a8b33bb257b030.js" async></script>
  <title>OTA Analyzer</title>
</head>
<body>
  <div id="__next"></div>
  <script src="/ota-analyzer/_next/static/chunks/webpack-7aa7c37fd3a523e8.js" id="_R_"></script>
  <script>(self.__next_f=self.__next_f||[]).push([0])</script>
${rscScripts}
</body>
</html>`;

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
      await route.abort();
    }
  });

  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message.substring(0, 200)));

  console.log('Navigating...');
  const resp = await page.goto('http://ota.local/ota-analyzer/', { waitUntil: 'commit', timeout: 15000 });
  console.log('Response:', resp?.status());

  await page.waitForTimeout(10000);

  const state = await page.evaluate(() => ({
    title: document.title,
    bodyStart: document.body?.innerText?.substring(0, 300) || '',
    bodyClasses: document.body?.className || '',
    htmlId: document.documentElement.id,
    url: window.location.href,
  }));
  console.log('State:', JSON.stringify(state, null, 2));

  await page.screenshot({ path: `${OUTPUT_DIR}/test-clean.png` });
  console.log('Size:', getFileSize(`${OUTPUT_DIR}/test-clean.png`), 'KB');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
