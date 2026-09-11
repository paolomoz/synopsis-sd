// measure-pair.mjs — full-page pixel diff live vs EDS at a given width (pixelmatch), banners hidden
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { writeFileSync } from 'node:fs';
const [live, eds, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch();
async function shot(url, file) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 } });
  await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '#onetrust-consent-sdk,.onetrust-pc-dark-filter,#onetrust-banner-sdk{display:none!important} *{animation:none!important;transition:none!important}' });
  // trigger lazy images
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: file, fullPage: true }); await p.close(); return h;
}
const h1 = await shot(live, '/tmp/pair-live.png'); const h2 = await shot(eds, '/tmp/pair-eds.png'); await b.close();
const a = PNG.sync.read(await import('node:fs').then((fs) => fs.readFileSync('/tmp/pair-live.png')));
const c = PNG.sync.read(await import('node:fs').then((fs) => fs.readFileSync('/tmp/pair-eds.png')));
const W = Math.min(a.width, c.width); const H = Math.max(a.height, c.height);
const pad = (img) => { const out = new PNG({ width: W, height: H }); out.data.fill(255); PNG.bitblt(img, out, 0, 0, W, Math.min(img.height, H), 0, 0); return out; };
const A = pad(a); const C = pad(c); const diff = new PNG({ width: W, height: H });
const n = pixelmatch(A.data, C.data, diff.data, W, H, { threshold: 0.1 });
writeFileSync('/tmp/pair-diff.png', PNG.sync.write(diff));
const common = W * Math.min(a.height, c.height);
console.log(JSON.stringify({ width: W, liveHeight: h1, edsHeight: h2, heightDelta: h2 - h1, diffPixels: n, diffPercentOfUnion: +(100 * n / (W * H)).toFixed(2), similarityPercent: +(100 - 100 * n / (W * H)).toFixed(2), commonAreaPercent: +(100 * common / (W * H)).toFixed(1) }));
