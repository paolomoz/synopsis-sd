import { chromium } from 'playwright';
const b = await chromium.launch();
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '#onetrust-consent-sdk{display:none!important}' });
  console.log(url.slice(0, 40), JSON.stringify(await p.evaluate(() => {
    const r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; };
    const vis = (e) => e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().left >= 0;
    const labels = [...document.querySelectorAll('.main-nav-item-header')].filter(vis);
    return { navWrap: r(document.querySelector('.nav-top-wrapper')), logo: r(document.querySelector('.nav-top-wrapper .logo')), logoSvg: r(document.querySelector('.nav-top-wrapper .logo svg')), label1: r(labels[0]), label1Style: labels[0] ? [getComputedStyle(labels[0]).fontSize, getComputedStyle(labels[0]).fontWeight, getComputedStyle(labels[0]).color] : null, labelsX: labels.map((l) => Math.round(l.getBoundingClientRect().left)), search: r([...document.querySelectorAll('.icon-search, .icon-search svg')].find(vis)), cta: r([...document.querySelectorAll('.component-button.cta, .cta a, .nav-items-right a')].find((e) => vis(e) && /Contact Sales/.test(e.textContent))), pre: r(document.querySelector('.pre-header')), preLang: r([...document.querySelectorAll('.pre-header *')].find((e) => /English/.test(e.textContent) && e.children.length <= 2 && vis(e))), preAsk: r([...document.querySelectorAll('.pre-header *')].find((e) => /^Ask$/.test(e.textContent.trim()) && vis(e))) };
  })));
  await p.close();
}
await b.close();
