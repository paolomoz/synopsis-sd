// llm-visibility.mjs <url> [...urls] — words visible after JS that are absent from the served HTML (what an agent fetching HTML never sees).
// Reports the missing words per page grouped by the element that carries them, so the source of each gap is obvious.
import { chromium } from 'playwright';
const urls = process.argv.slice(2);
const b = await chromium.launch();
const words = (t) => (t.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-\.]*/gu) || []);
for (const url of urls) {
  const raw = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.0)' } })).text();
  const rawText = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
  const rawSet = new Set(words(rawText));
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  const nodes = await p.evaluate(() => {
    const out = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const region = el.closest('header') ? 'header' : el.closest('footer') ? 'footer' : 'main';
      const block = el.closest('[class*="block"], .default-content-wrapper, nav, .section'); out.push({ t, region, where: block ? block.className.split(' ').slice(0, 2).join('.') : el.tagName.toLowerCase() }); }
    return out; });
  const missing = {}; let total = 0, miss = 0;
  for (const { t, region, where } of nodes) for (const w of words(t)) { total++; if (!rawSet.has(w)) { miss++; const k = `${region} › ${where}`; (missing[k] ||= new Set()).add(w); } }
  console.log(`\n${url}\n  visible words ${total}, missing from HTML ${miss} (${(100 - (miss / total) * 100).toFixed(1)}% readable)`);
  for (const [k, s] of Object.entries(missing).sort((a, b) => b[1].size - a[1].size)) console.log(`  ${String(s.size).padStart(4)}  ${k}: ${[...s].slice(0, 14).join(' ')}${s.size > 14 ? ' …' : ''}`);
  await p.close();
}
await b.close();
