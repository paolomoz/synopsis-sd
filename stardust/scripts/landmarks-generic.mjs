// landmarks-generic.mjs <liveUrl> <buildUrl> [width] — y of every heading (matched by text) + first images, live vs build, top-down Δ
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [live, build, w = '1440', template = ''] = process.argv.slice(2);
const policy = JSON.parse(readFileSync('stardust/replica/residual-policy.json', 'utf8'));
const b = await chromium.launch();
async function probe(url, isLive) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 600, hasTouch: +w < 600 });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(isLive ? 3500 : 2000);
  const tmplHide = (isLive ? policy.hideOnLiveByTemplate : policy.hideOnBuildByTemplate)?.[template] || [];
  const hide = [...(isLive ? policy.hideOnLive : policy.hideOnBuild), ...tmplHide].join(','); const neutral = isLive ? Object.entries(policy.neutraliseOnLive || {}).map(([k, v]) => `${k}{${v}}`).join('') : '';
  await p.addStyleTag({ content: `${hide}{display:none!important}${neutral}${policy.freeze}` }).catch(() => {});
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300)); });
  const r = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 0 && r.left >= 0 && r.left < innerWidth; };
    const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60);
    const heads = {}; [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).forEach((h) => { const k = norm(h.textContent); if (k && !(k in heads)) heads[k] = { y: Math.round(h.getBoundingClientRect().top + scrollY), h: Math.round(h.getBoundingClientRect().height), fs: getComputedStyle(h).fontSize, fw: getComputedStyle(h).fontWeight, x: Math.round(h.getBoundingClientRect().left) }; });
    const imgs = [...document.querySelectorAll('img')].filter((i) => vis(i) && i.getBoundingClientRect().width > 120).map((i) => ({ y: Math.round(i.getBoundingClientRect().top + scrollY), w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height), x: Math.round(i.getBoundingClientRect().left) }));
    return { height: document.documentElement.scrollHeight, heads, imgs, footer: Math.round(document.querySelector('footer')?.getBoundingClientRect().top + scrollY) };
  });
  await p.close(); return r;
}
const L = await probe(live, true); const B = await probe(build, false); await b.close();
console.log(`height ${L.height} ${B.height} Δ ${B.height - L.height} | footer ${L.footer} ${B.footer} Δ ${B.footer - L.footer}`);
const keys = Object.keys(L.heads).sort((a, c) => L.heads[a].y - L.heads[c].y);
for (const k of keys) { const l = L.heads[k]; const bb = B.heads[k]; console.log(`${(bb ? String(bb.y - l.y) : 'MISSING').padStart(8)}  live ${String(l.y).padStart(5)} build ${String(bb ? bb.y : '-').padStart(5)} | ${l.fs}/${l.fw}${bb ? ` vs ${bb.fs}/${bb.fw}` : ''} | x ${l.x}${bb ? `/${bb.x}` : ''} | ${k}`); }
const extra = Object.keys(B.heads).filter((k) => !(k in L.heads)); if (extra.length) console.log('build-only headings:', extra.slice(0, 8));
console.log(`images live ${L.imgs.length} build ${B.imgs.length}`); L.imgs.slice(0, 10).forEach((i, n) => { const j = B.imgs[n]; console.log(`  img${n} live y${i.y} ${i.w}x${i.h} @${i.x}${j ? ` | build y${j.y} ${j.w}x${j.h} @${j.x} Δy ${j.y - i.y}` : ' | build -'}`); });
