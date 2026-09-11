import { chromium } from 'playwright';
const b = await chromium.launch();
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  await p.addStyleTag({ content: '#onetrust-consent-sdk{display:none!important}' });
  for (const sy of [0, 900]) { await p.evaluate((y) => window.scrollTo(0, y), sy); await p.waitForTimeout(600);
    console.log(url.slice(8, 30), sy, JSON.stringify(await p.evaluate(() => { const nav = document.querySelector('.component-nav-top, header .nav-row'); const c = getComputedStyle(nav); const r = nav.getBoundingClientRect(); const logo = document.querySelector('.nav-top-wrapper .logo svg path, header .nav-brand svg path'); return { cls: nav.className.slice(0, 60), pos: c.position, top: Math.round(r.top), h: Math.round(r.height), bg: c.backgroundColor, logoFill: logo ? getComputedStyle(logo).fill : null, visible: r.bottom > 0 && r.top < 640 }; }))); }
  await p.close();
}
await b.close();
