// site-assess.mjs <sample.json> <width> <outdir> — neutral pixel diff (no residual policy) of live vs published EDS for a page sample.
// Same method as the infographic's pxdiff: animations frozen, OneTrust/chat hidden, pixelmatch 0.1, pad to the taller page.
import { chromium } from 'playwright'; import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const [sampleFile, Wstr, dir] = process.argv.slice(2); const W = +Wstr; mkdirSync(dir, { recursive: true });
const sample = JSON.parse(readFileSync(sampleFile, 'utf8')); const outFile = `${dir}/results-${W}.json`;
const results = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : []; const done = new Set(results.map((r) => r.path));
const freeze = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter,[id*="chat"],[class*="chatbot"],#ask-synopsys,iframe[title*="chat" i]{display:none!important}`;
const b = await chromium.launch();
async function shot(url, file, isLive) {
  const p = await b.newPage({ viewport: { width: W, height: 900 }, isMobile: W < 600, hasTouch: W < 600 });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(isLive ? 3500 : 2500);
  if (isLive) await p.click('#onetrust-accept-btn-handler', { timeout: 1000 }).catch(() => {});
  await p.addStyleTag({ content: freeze }).catch(() => {});
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 600)); });
  const h = await p.evaluate(() => document.documentElement.scrollHeight); await p.screenshot({ path: file, fullPage: true }); await p.close(); return h;
}
function cmp(fa, fb) {
  const a = PNG.sync.read(readFileSync(fa)), c = PNG.sync.read(readFileSync(fb)); const Wd = Math.min(a.width, c.width), H = Math.max(a.height, c.height);
  const pad = (img) => { const o = new PNG({ width: Wd, height: H }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, Wd, Math.min(img.height, H), 0, 0); return o; };
  const n = pixelmatch(pad(a).data, pad(c).data, null, Wd, H, { threshold: 0.1 }); return +(100 * n / (Wd * H)).toFixed(2);
}
for (const [template, path, live] of sample) {
  if (done.has(path)) continue;
  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'; const r = { template, path, w: W };
  try {
    r.hLive = await shot(live, `${dir}/${slug}-live.png`, true);
    r.hBuild = await shot('https://main--synopsis-sd--paolomoz.aem.live' + (path === '/index' ? '/' : path), `${dir}/${slug}-build.png`, false);
    r.pct = cmp(`${dir}/${slug}-live.png`, `${dir}/${slug}-build.png`); r.dh = r.hBuild - r.hLive;
  } catch (e) { r.error = String(e).slice(0, 120); }
  results.push(r); writeFileSync(outFile, JSON.stringify(results, null, 1)); console.log(`${String(r.pct ?? 'ERR').padStart(6)}  dh=${String(r.dh ?? '').padStart(6)}  ${template.padEnd(8)} ${path}`);
}
await b.close();
