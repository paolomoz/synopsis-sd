// dom-dump.mjs <url> <selector>... — visible subtree with rects + key computed styles (depth ≤ 5)
import { chromium } from 'playwright';
const [url, ...sels] = process.argv.slice(2);
const W = +(process.env.W || 1440); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: 900 }, isMobile: W < 600, hasTouch: W < 600 });
await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
await p.addStyleTag({ content: '#onetrust-consent-sdk,.onetrust-pc-dark-filter{display:none!important} *{animation:none!important;transition:none!important}' });
for (const sel of sels) {
  const out = await p.evaluate((spec) => {
    const [sel, txt] = spec.split('~'); const re = txt ? new RegExp(txt) : null;
    const root = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left >= 0 && r.left < window.innerWidth && (!re || re.test(e.textContent)); });
    if (!root) return `NO VISIBLE MATCH ${sel}`;
    const lines = [];
    const walk = (e, d) => {
      const r = e.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return; if (d > 5) return;
      const c = getComputedStyle(e); const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(' ').slice(0, 50);
      const st = [`${c.display}`, c.fontSize !== '18px' || own ? `${c.fontSize}/${c.fontWeight} lh${c.lineHeight}` : '', c.color !== 'rgb(17, 28, 36)' && own ? c.color : '', c.backgroundColor !== 'rgba(0, 0, 0, 0)' ? `bg:${c.backgroundColor}` : '', c.backgroundImage !== 'none' ? `bgi:${c.backgroundImage.slice(0, 40)}` : '', c.padding !== '0px' ? `p:${c.padding}` : '', c.margin !== '0px' ? `m:${c.margin}` : '', c.borderRadius !== '0px' ? `br:${c.borderRadius}` : '', c.boxShadow !== 'none' ? `sh:${c.boxShadow.slice(0, 40)}` : '', c.textTransform !== 'none' ? c.textTransform : '', c.position !== 'static' ? c.position : '', c.textAlign !== 'start' ? `ta:${c.textAlign}` : ''].filter(Boolean).join(' ');
      lines.push(`${'  '.repeat(d)}${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} [${Math.round(r.left)},${Math.round(r.top + scrollY)} ${Math.round(r.width)}x${Math.round(r.height)}] ${st}${own ? ` "${own}"` : ''}${e.tagName === 'IMG' ? ` src=${e.src.split('/').pop().slice(0, 30)}` : ''}`);
      [...e.children].forEach((ch) => walk(ch, d + 1));
    };
    walk(root, 0); return lines.join('\n');
  }, sel);
  console.log(`\n### ${sel}\n${out}`);
}
await b.close();
