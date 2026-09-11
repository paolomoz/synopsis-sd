// live-sections.mjs <url> [width] — top-level AEM grid columns (and inner columns of column rows): y, h, type, first text
import { chromium } from 'playwright';
const [url, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 600, hasTouch: +w < 600 });
await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(3500);
await p.addStyleTag({ content: '#onetrust-consent-sdk{display:none!important}*{animation:none!important;transition:none!important}' });
console.log(JSON.stringify(await p.evaluate(() => {
  const root = document.querySelector('.root.synopsysContainer > .aem-Grid, .site-content') || document.body;
  const row = (e, depth) => { const r = e.getBoundingClientRect(); return { d: depth, cls: e.className.replace(/aem-GridColumn(--default--\d+)?/g, '').replace(/\s+/g, ' ').trim().slice(0, 40), y: Math.round(r.top + scrollY), h: Math.round(r.height), x: Math.round(r.left), w: Math.round(r.width), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 36) }; };
  const out = [];
  const walk = (grid, depth) => { for (const c of grid.children) { if (c.getBoundingClientRect().height < 2) continue; const inner = c.matches('.synopsysContainer, .responsivegrid') ? c.querySelector(':scope > .aem-Grid') : null; if (inner) { walk(inner, depth); continue; } out.push(row(c, depth)); if (/\bcolumn\b/.test(c.className)) for (const cc of c.querySelectorAll(':scope .component-column > div')) { if (cc.getBoundingClientRect().height > 2) { out.push(row(cc, depth + 1)); for (const g of cc.querySelectorAll(':scope > .aem-Grid > .aem-GridColumn')) if (g.getBoundingClientRect().height > 2) out.push(row(g, depth + 2)); } } } };
  walk(root, 0);
  for (const c of []) {
    if (c.getBoundingClientRect().height < 2) continue; out.push(row(c, 0));
    if (/\bcolumn\b/.test(c.className)) for (const cc of c.querorAll?.('x') || c.querySelectorAll(':scope .component-column > div')) { if (cc.getBoundingClientRect().height > 2) { out.push(row(cc, 1)); for (const g of cc.querySelectorAll(':scope > .aem-Grid > .aem-GridColumn')) if (g.getBoundingClientRect().height > 2) out.push(row(g, 2)); } }
  }
  return { docH: document.documentElement.scrollHeight, rows: out };
})).replace(/},{/g, '},\n{')); await b.close();
