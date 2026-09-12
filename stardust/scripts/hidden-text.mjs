// hidden-text.mjs <url...> — text in <main> that is in the HTML but not rendered (display:none / visibility:hidden / [hidden]):
// what a visibility checker flags as "missing words" (agents read it, users never see it). Grouped by the hiding block.
import { chromium } from 'playwright';
const b = await chromium.launch();
const words = (t) => new Set((t.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-\.#]*/gu) || []));
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const hiddenRoot = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden) return e; } return null; };
    const out = {}; let visible = 0;
    const walker = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = walker.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
      const h = hiddenRoot(el); if (!h) { visible += t.split(/\s+/).length; continue; }
      const blk = h.closest('[class*="block"]') || h.closest('.section') || h; const key = `${blk.className.split(' ').slice(0, 2).join('.') || blk.tagName} ‹${h.tagName.toLowerCase()}.${(h.className || '').toString().split(' ')[0]}${h.hidden ? '[hidden]' : ''}›`;
      (out[key] ||= []).push(t); }
    return { out, visible }; });
  const all = new Set(); const rows = Object.entries(r.out).map(([k, ts]) => { const s = words(ts.join(' ')); s.forEach((w) => all.add(w)); return [k, s, ts]; }).sort((a, b2) => b2[1].size - a[1].size);
  console.log(`\n${url}\n  visible words ≈${r.visible}, hidden unique words ${all.size}`);
  for (const [k, s, ts] of rows) console.log(`  ${String(s.size).padStart(4)}  ${k}: ${ts.slice(0, 3).map((t) => t.slice(0, 40)).join(' | ')}`);
  await p.close();
}
await b.close();
