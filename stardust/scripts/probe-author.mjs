import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [url, sel] of [['https://www.synopsys.com/authors/frank-malloy.html', '.cmp-blogsdev__mra-item-container'], ['https://main--synopsis-sd--paolomoz.aem.live/authors/frank-malloy', '.cards.author > ul > li']]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  console.log(url.slice(8, 40), JSON.stringify(await p.evaluate((sel) => { const items = [...document.querySelectorAll(sel)]; const vis = items.filter((e) => e.getBoundingClientRect().height > 0); const pag = [...document.querySelectorAll('button, a')].filter((e) => /load more|show more|next|page \d|›|»/i.test(e.textContent) && e.getBoundingClientRect().height > 0).map((e) => e.textContent.trim().slice(0, 30)); const first = vis[0]?.getBoundingClientRect(); const second = vis[1]?.getBoundingClientRect(); return { total: items.length, visible: vis.length, pagination: pag.slice(0, 5), firstY: first && Math.round(first.top + scrollY), firstH: first && Math.round(first.height), pitch: first && second && Math.round(second.top - first.top), docH: document.documentElement.scrollHeight, pager: document.querySelector('.cmp-blogsdev__pagination, .pagination, [class*="pagination"]')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) }; }, sel)));
  await p.close();
}
await b.close();
