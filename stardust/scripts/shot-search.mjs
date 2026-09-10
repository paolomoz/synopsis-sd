import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('https://www.synopsys.com/search.html?q=PCIe', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(4000);
await p.evaluate(() => { document.querySelectorAll('#onetrust-consent-sdk, .onetrust-pc-dark-filter').forEach((e) => e.remove()); });
await p.screenshot({ path: '/tmp/search-live.png', clip: { x: 0, y: 0, width: 1280, height: 1000 } });
const info = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, resultCount: document.querySelectorAll('.coveo-result-frame, .CoveoResult, [class*="result-item"]').length, summary: document.querySelector('.CoveoQuerySummary, [class*="query-summary"]')?.textContent?.trim().slice(0, 120), facets: [...document.querySelectorAll('.CoveoFacet .coveo-facet-header-title, [class*="facet"] h2, [class*="facet-header"]')].map((e) => e.textContent.trim()).slice(0, 8) }));
console.log(JSON.stringify(info)); await b.close();
