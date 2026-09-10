import { chromium } from 'playwright';
const port = process.argv[2]; const pages = process.argv.slice(3);
const b = await chromium.launch();
for (const n of pages) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await p.goto(`http://localhost:${port}/qa/${n}.html`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errs.push('goto ' + e.message.slice(0, 60)));
  await p.waitForTimeout(1500);
  for (let i = 1; i <= 4; i++) { await p.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 4); await p.waitForTimeout(150); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  const info = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, h1: document.querySelectorAll('h1').length, blocks: [...document.querySelectorAll('[data-block-name]')].filter((b) => b.dataset.blockName !== 'section-metadata').map((b) => b.dataset.blockName + ':' + b.dataset.blockStatus + ':' + Math.round(b.getBoundingClientRect().height)), broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length, imgs: document.images.length }));
  console.log(n, JSON.stringify(info), errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : '');
  await p.screenshot({ path: `/tmp/h-${n}.png`, fullPage: true }); await p.close();
}
await b.close();
