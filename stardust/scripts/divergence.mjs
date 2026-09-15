// divergence.mjs <dir> <results.json> <N> — for the N worst pages: first 100px band where the diff exceeds 35%, the share of
// differing pixels below that point (cascade), and the EDS section + live band at that y. Tells which block breaks height parity.
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch'; import { readFileSync } from 'node:fs'; import { chromium } from 'playwright';
const [dir, resFile, Nstr] = process.argv.slice(2); const N = +Nstr;
const res = JSON.parse(readFileSync(resFile, 'utf8')).filter((x) => x.pct != null).sort((a, b) => b.pct - a.pct).slice(0, N);
const b = await chromium.launch();
async function sectionAt(url, y, isLive) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(isLive ? 3000 : 2000);
  await p.evaluate(async () => { for (let yy = 0; yy < document.body.scrollHeight; yy += 700) { window.scrollTo(0, yy); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  const r = await p.evaluate(({ y, isLive }) => { const sel = isLive ? '.synopsysContainer > .aem-Grid > .aem-GridColumn, main > .aem-GridColumn, .aem-GridColumn' : 'main > .section';
    const els = [...document.querySelectorAll(sel)]; let best = null;
    for (const e of els) { const r = e.getBoundingClientRect(); const top = r.top + window.scrollY; if (r.height > 0 && top <= y && top + r.height > y) { if (!best || (isLive && r.height < best.h)) best = { cls: e.className.toString().replace(/aem-GridColumn(--default--12)?/g, '').trim().slice(0, 50), top: Math.round(top), h: Math.round(r.height), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) }; } }
    return best; }, { y, isLive });
  await p.close(); return r;
}
for (const x of res) {
  const slug = x.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  const a = PNG.sync.read(readFileSync(`${dir}/${slug}-live.png`)), c = PNG.sync.read(readFileSync(`${dir}/${slug}-build.png`));
  const Wd = Math.min(a.width, c.width), H = Math.max(a.height, c.height);
  const pad = (img) => { const o = new PNG({ width: Wd, height: H }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, Wd, Math.min(img.height, H), 0, 0); return o; };
  const d = new PNG({ width: Wd, height: H }); const total = pixelmatch(pad(a).data, pad(c).data, d.data, Wd, H, { threshold: 0.1 });
  const band = []; for (let y = 0; y < H; y += 100) { let k = 0; for (let yy = y; yy < Math.min(y + 100, H); yy++) for (let xx = 0; xx < Wd; xx++) { const i = (yy * Wd + xx) * 4; if (d.data[i] === 255 && d.data[i + 1] === 0) k++; } band.push(k); }
  let first = band.findIndex((k, i) => k / (Wd * Math.min(100, H - i * 100)) > 0.35); if (first < 0) first = band.length - 1;
  const below = band.slice(first).reduce((s, k) => s + k, 0); const y = first * 100 + 50;
  const live = x.template === 'landing' ? null : await sectionAt(JSON.parse(readFileSync('/tmp/site-sample.json')).find((s) => s[1] === x.path)[2], y, true);
  const build = await sectionAt('https://main--synopsis-sd--paolomoz.aem.live' + x.path, y, false);
  console.log(`${x.pct.toFixed(1).padStart(5)}%  dh=${String(x.dh).padStart(6)}  first@${String(y).padStart(5)} cascade=${(100 * below / total).toFixed(0).padStart(3)}%  ${x.template.padEnd(8)} ${x.path}\n        live:  ${live ? `${live.cls} [${live.top} h${live.h}] "${live.text}"` : '-'}\n        build: ${build ? `${build.cls} [${build.top} h${build.h}] "${build.text}"` : '-'}`);
}
await b.close();
