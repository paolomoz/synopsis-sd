import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); p.on('console', (m) => { if (m.type()==='error') console.log('CONSOLE', m.text()); });
p.on('response', (r) => { if (r.url().includes('query-index')) console.log('IDX', r.status(), r.url()); });
await p.goto('https://main--synopsis-sd--paolomoz.aem.live/articles/category-automotive', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const m = await import('/scripts/index.js'); const rows = await m.getIndex();
  const h1 = document.querySelector('main h1')?.textContent;
  const fam = m.familyOf(location.pathname);
  const hits = rows.filter((r) => m.familyOf(r.path) === 'articles' && m.splitList(r.tags).some((t) => m.tagKey(t) === 'automotive'));
  return { rows: rows.length, h1, fam, hits: hits.length, listingClass: document.querySelector('.listing')?.className, total: document.querySelector('.listing')?.dataset.total, sample: rows.find((x) => x.tags)?.tags };
});
console.log(JSON.stringify(r)); await b.close();
