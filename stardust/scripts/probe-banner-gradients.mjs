import { chromium } from 'playwright';
const b = await chromium.launch();
for (const url of ['https://www.synopsys.com/glossary/what-is-physical-ai.html', 'https://www.synopsys.com/articles/112g-linear-optics-phy.html']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  console.log(url.split('/').pop(), await p.evaluate(() => { const e = document.querySelector('.cmp-blogbanner .blog-banner'); return e ? e.className + ' | ' + getComputedStyle(e).backgroundImage + ' | ' + getComputedStyle(e).backgroundColor : 'no banner'; }));
  await p.close();
}
await b.close();
