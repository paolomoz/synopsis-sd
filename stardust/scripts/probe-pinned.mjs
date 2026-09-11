import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.argv[2], { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
await p.addStyleTag({ content: '#onetrust-consent-sdk{display:none!important}' });
for (const sy of [0, 200, 2000]) {
  await p.evaluate((y) => window.scrollTo(0, y), sy); await p.waitForTimeout(600);
  console.log(sy, JSON.stringify(await p.evaluate(() => { const nav = document.querySelector('.component-nav-top, header .nav-row, header nav'); const c = getComputedStyle(nav); const r = nav.getBoundingClientRect(); const lab = document.querySelector('.main-nav-item-header, .nav-drop .nav-trigger-label, header nav a'); const logo = document.querySelector('.nav-top-wrapper .logo svg path, header .nav-brand svg path'); return { cls: nav.className.slice(0, 80), pos: c.position, top: Math.round(r.top), h: Math.round(r.height), bg: c.backgroundColor, shadow: c.boxShadow.slice(0, 40), blur: c.backdropFilter, labelColor: lab ? getComputedStyle(lab).color : null, logoFill: logo ? getComputedStyle(logo).fill : null, preHeaderTop: Math.round(document.querySelector('.pre-header, .utility-bar')?.getBoundingClientRect().top ?? -1) }; })));
}
await b.close();
