/**
 * svg-fix — html2md rejects SVG images over 40KB ("Image N failed validation: SVG is larger than 40KB").
 * Rasterise each oversized SVG with Playwright (2x), upload the PNG to DA media, and write a src→url map.
 *
 *   DA_TOKEN=… node stardust/scripts/svg-fix.mjs --sizes /tmp/svg-sizes.json --map stardust/svg-map.json
 *   node stardust/scripts/svg-fix.mjs --apply <content-dir> --map stardust/svg-map.json   # rewrite srcs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ORG = 'paolomoz'; const REPO = 'synopsis-sd';
const mapPath = opt('--map') || 'stardust/svg-map.json';
const map = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

if (opt('--apply')) {
  let files = 0; let refs = 0;
  for (const f of walk(opt('--apply'))) {
    let h = readFileSync(f, 'utf8'); const before = h;
    for (const [src, png] of Object.entries(map)) {
      const enc = src.replace(/&/g, '&amp;');
      if (h.includes(src) || h.includes(enc)) { h = h.split(src).join(png).split(enc).join(png); refs += 1; }
    }
    if (h !== before) { writeFileSync(f, h); files += 1; }
  }
  console.log(`[svg-fix] rewrote ${refs} src(s) in ${files} file(s)`);
  process.exit(0);
}

const token = process.env.DA_TOKEN;
if (!token) { console.error('DA_TOKEN missing'); process.exit(1); }
const sizes = JSON.parse(readFileSync(opt('--sizes'), 'utf8'));
const big = Object.entries(sizes).filter(([, s]) => s > 40 * 1024).map(([u]) => u).filter((u) => !map[u]);
console.log(`[svg-fix] ${big.length} oversized svg(s) to rasterise`);
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
let n = 0;
for (const url of big) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const svg = await res.text();
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><img id="i" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`);
    const img = page.locator('#i');
    await img.evaluate((el) => new Promise((r) => { if (el.complete) r(); else el.onload = r; }));
    const box = await img.boundingBox();
    if (!box || box.width < 2) throw new Error('no box');
    const w = Math.min(Math.round(box.width), 1600);
    await img.evaluate((el, ww) => { el.style.width = `${ww}px`; el.style.height = 'auto'; }, w);
    const png = await img.screenshot({ omitBackground: true, type: 'png' });
    const base = url.split('/').pop().replace(/\.svg.*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const hash = [...url].reduce((a, c) => ((a * 31) + c.charCodeAt(0)) >>> 0, 7).toString(36);
    const name = `${base}-${hash}.png`;
    const fd = new FormData(); fd.append('data', new Blob([png], { type: 'image/png' }), name);
    const put = await fetch(`https://admin.da.live/source/${ORG}/${REPO}/media/svg/${name}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (put.status === 401) { console.error('401 from DA — token expired'); process.exit(2); }
    if (!put.ok) throw new Error(`put ${put.status}`);
    map[url] = `https://content.da.live/${ORG}/${REPO}/media/svg/${name}`;
    n += 1; console.log(`[svg-fix] ${n}/${big.length} ${name} ${w}px (${(png.length / 1024).toFixed(0)}KB)`);
  } catch (e) { console.error(`[svg-fix] FAIL ${url}: ${e.message}`); }
  writeFileSync(mapPath, JSON.stringify(map, null, 1));
}
await browser.close();
console.log(`[svg-fix] map has ${Object.keys(map).length} entr(ies) → ${mapPath}`);
