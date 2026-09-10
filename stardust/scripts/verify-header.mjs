import { chromium } from 'playwright';
const B = 'https://main--synopsis-sd--paolomoz.aem.live';
const b = await chromium.launch();
const errors = [];
async function page(w, url) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${url} ${e.message}`));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1200);
  return { ctx, p };
}
let { ctx, p } = await page(1440, `${B}/`);
await p.screenshot({ path: '/tmp/eds-home-rest.png', clip: { x: 0, y: 0, width: 1440, height: 160 } });
for (const m of ['Products', 'Solutions', 'Why Synopsys']) {
  const t = p.locator('header .nav-trigger-label', { hasText: m }).first();
  await t.hover(); await p.waitForTimeout(700);
  await p.screenshot({ path: `/tmp/eds-menu-${m.replace(/\W/g, '')}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log(m, await p.evaluate((mm) => { const t = [...document.querySelectorAll('header .nav-trigger')].find((x) => x.textContent.trim().startsWith(mm)); const pn = t && t.querySelector('.menu-panel'); if (!pn) return 'no panel'; const r = pn.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), t.getAttribute('aria-expanded')]; }, m));
}
await p.mouse.move(700, 700); await p.waitForTimeout(400);
await p.click('header .nav-search-button'); await p.waitForTimeout(500);
await p.screenshot({ path: '/tmp/eds-search.png', clip: { x: 0, y: 0, width: 1440, height: 600 } });
await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/eds-home-pinned.png', clip: { x: 0, y: 0, width: 1440, height: 140 } });
await ctx.close();
({ ctx, p } = await page(1440, `${B}/verification/simulation/vcs`));
await p.screenshot({ path: '/tmp/eds-vcs-rest.png', clip: { x: 0, y: 0, width: 1440, height: 160 } });
await ctx.close();
({ ctx, p } = await page(360, `${B}/`));
await p.screenshot({ path: '/tmp/eds-m-rest.png', clip: { x: 0, y: 0, width: 360, height: 800 } });
await p.click('header .nav-hamburger button'); await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/eds-m-open.png', clip: { x: 0, y: 0, width: 360, height: 800 } });
await p.locator('header .nav-trigger-label', { hasText: 'Products' }).first().click(); await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/eds-m-products.png', clip: { x: 0, y: 0, width: 360, height: 800 } });
await ctx.close(); await b.close();
console.log('errors', errors.slice(0, 5));
