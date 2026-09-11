import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://www.synopsys.com/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
for (const sy of [0, 300]) { await p.evaluate((y) => window.scrollTo(0, y), sy); await p.waitForTimeout(500);
  console.log(sy, await p.evaluate(() => { const a = [...document.querySelectorAll('.component-button.cta, .component-button.cta a, .nav-items-right a')].find((e) => /Contact Sales/.test(e.textContent) && e.getBoundingClientRect().width > 0); const c = getComputedStyle(a); const inner = a.querySelector('a') || a; const ci = getComputedStyle(inner); return JSON.stringify({ cls: a.className, bg: c.backgroundColor, color: ci.color, border: c.border, innerBg: ci.backgroundColor }); })); }
await b.close();
