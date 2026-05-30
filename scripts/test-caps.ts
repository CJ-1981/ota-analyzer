import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Test basic JS capabilities
  const capabilities = await page.evaluate(() => {
    return {
      eval: typeof eval === 'function',
      Function: typeof Function === 'function',
      fetch: typeof fetch === 'function',
      Promise: typeof Promise === 'function',
      Proxy: typeof Proxy === 'function',
      Symbol: typeof Symbol === 'function',
      WeakRef: typeof WeakRef === 'function',
      FinalizationRegistry: typeof FinalizationRegistry === 'function',
      structuredClone: typeof structuredClone === 'function',
      TextEncoder: typeof TextEncoder === 'function',
      crypto: !!crypto?.subtle,
      matchMedia: typeof window.matchMedia === 'function',
      matchMediaResult: window.matchMedia('(min-width: 768px)').matches,
      URL: typeof URL === 'function',
      URLSearchParams: typeof URLSearchParams === 'function',
      Blob: typeof Blob === 'function',
      File: typeof File === 'function',
      FileReader: typeof FileReader === 'function',
      requestAnimationFrame: typeof requestAnimationFrame === 'function',
      requestIdleCallback: typeof requestIdleCallback === 'function',
      IntersectionObserver: typeof IntersectionObserver === 'function',
      ResizeObserver: typeof ResizeObserver === 'function',
      MutationObserver: typeof MutationObserver === 'function',
    };
  });
  console.log('JS Capabilities:', JSON.stringify(capabilities, null, 2));

  // Test eval with a complex expression
  try {
    const evalResult = await page.evaluate(() => {
      const result = new Function('return [1,2,3].map(x => x * 2)')();
      return result;
    });
    console.log('Complex eval:', evalResult);
  } catch (err) {
    console.log('Complex eval failed:', err);
  }

  // Test async operations
  try {
    const asyncResult = await page.evaluate(async () => {
      const p = new Promise<string>((resolve) => {
        setTimeout(() => resolve('timeout worked'), 100);
      });
      return await p;
    });
    console.log('Async result:', asyncResult);
  } catch (err) {
    console.log('Async failed:', err);
  }

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
