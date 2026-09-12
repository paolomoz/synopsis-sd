// gate-sample.mjs — sampled published-origin pixel gate per template (consistency instrument, step 3).
//   node stardust/scripts/gate-sample.mjs --template article --n 10 --width 1440 [--seed 7] [--paths a,b,c]
// Applies stardust/replica/residual-policy.json symmetrically (hideOnLive / hideOnBuild / neutralise / freeze),
// captures both pages full-height after a lazy-load settle, compares with pixelmatch, prints per-page % and Δh
// plus median / p90, and appends the run to stardust/replica/gate-samples.jsonl.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const template = opt('--template'); const N = +opt('--n', 10); const W = +opt('--width', 1440); const seed = +opt('--seed', 7);
const base = 'https://main--synopsis-sd--paolomoz.aem.live';
const policy = JSON.parse(readFileSync('stardust/replica/residual-policy.json', 'utf8'));
const map = JSON.parse(readFileSync('stardust/path-map.json', 'utf8'));
let paths = opt('--paths') ? opt('--paths').split(',') : Object.keys(map).filter((p) => map[p].template === template);
const LIVE_OVERRIDE = opt('--live'); const BUILD_OVERRIDE = opt('--build'); if (LIVE_OVERRIDE) paths = ['__single__'];
if (!opt('--paths')) { let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; paths = paths.sort().sort(() => rnd() - 0.5).slice(0, N); }
const b = await chromium.launch(); const dir = opt('--dir') || `stardust/replica/gates/sample-${template}-${W}`; mkdirSync(dir, { recursive: true });
async function shot(url, isLive, file) {
  const p = await b.newPage({ viewport: { width: W, height: 900 }, isMobile: W < 600, hasTouch: W < 600 });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(isLive ? 3500 : 2000);
  const tmplHide = (isLive ? policy.hideOnLiveByTemplate : policy.hideOnBuildByTemplate)?.[template] || [];
  const hide = [...(isLive ? policy.hideOnLive : policy.hideOnBuild), ...tmplHide].join(',');
  const neutral = isLive ? Object.entries(policy.neutraliseOnLive || {}).map(([k, v]) => `${k}{${v}}`).join('') : '';
  await p.addStyleTag({ content: `${hide}{display:none!important}${neutral}${policy.freeze}` }).catch(() => {});
  if (isLive) { for (const s of ['#onetrust-accept-btn-handler']) { await p.click(s, { timeout: 800 }).catch(() => {}); } }
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400)); });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: file, fullPage: true }); await p.close(); return h;
}
const results = [];
for (const path of paths) {
  const live = LIVE_OVERRIDE || map[path]?.live; if (!live) continue;
  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  try {
    const hl = await shot(live, true, `${dir}/${slug}-live.png`); const hb = await shot(BUILD_OVERRIDE || (base + (path === '/index' ? '/' : path)), false, `${dir}/${slug}-build.png`);
    const a = PNG.sync.read(readFileSync(`${dir}/${slug}-live.png`)); const c = PNG.sync.read(readFileSync(`${dir}/${slug}-build.png`));
    const Wd = Math.min(a.width, c.width); const H = Math.max(a.height, c.height);
    const pad = (img) => { const o = new PNG({ width: Wd, height: H }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, Wd, Math.min(img.height, H), 0, 0); return o; };
    const A = pad(a); const C = pad(c); const diff = new PNG({ width: Wd, height: H });
    const n = pixelmatch(A.data, C.data, diff.data, Wd, H, { threshold: 0.1 }); writeFileSync(`${dir}/${slug}-diff.png`, PNG.sync.write(diff));
    const pct = +(100 * n / (Wd * H)).toFixed(2); results.push({ path, pct, dh: hb - hl, hl, hb });
    console.log(`${pct.toFixed(2).padStart(6)}%  Δh ${String(hb - hl).padStart(5)}  ${path}`);
  } catch (e) { console.log(`   ERR  ${path} ${e.message.slice(0, 60)}`); results.push({ path, error: e.message.slice(0, 80) }); }
}
await b.close();
const ok = results.filter((r) => r.pct !== undefined).sort((x, y) => x.pct - y.pct);
const q = (k) => ok.length ? ok[Math.min(ok.length - 1, Math.floor(k * (ok.length - 1)))].pct : null;
const summary = { at: new Date().toISOString(), template, width: W, n: ok.length, median: q(0.5), p90: q(0.9), max: ok.length ? ok[ok.length - 1].pct : null, dhOver8: ok.filter((r) => Math.abs(r.dh) > 8).length, policy: policy.version, results };
console.log(`\n${template}@${W}: n=${ok.length} median=${summary.median}% p90=${summary.p90}% max=${summary.max}% |Δh|>8: ${summary.dhOver8}`);
appendFileSync('stardust/replica/gate-samples.jsonl', JSON.stringify(summary) + '\n');
