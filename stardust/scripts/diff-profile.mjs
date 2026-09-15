// diff-profile.mjs <dir> <path...> — diff image + per-200px-band difference profile for pages captured by site-assess.mjs
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch'; import { readFileSync, writeFileSync } from 'node:fs';
const [dir, ...paths] = process.argv.slice(2);
for (const path of paths) {
  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  const a = PNG.sync.read(readFileSync(`${dir}/${slug}-live.png`)), c = PNG.sync.read(readFileSync(`${dir}/${slug}-build.png`));
  const Wd = Math.min(a.width, c.width), H = Math.max(a.height, c.height);
  const pad = (img) => { const o = new PNG({ width: Wd, height: H }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, Wd, Math.min(img.height, H), 0, 0); return o; };
  const A = pad(a), C = pad(c), d = new PNG({ width: Wd, height: H }); const n = pixelmatch(A.data, C.data, d.data, Wd, H, { threshold: 0.1 });
  writeFileSync(`${dir}/${slug}-diff.png`, PNG.sync.write(d));
  const rows = []; for (let y = 0; y < H; y += 200) { let k = 0, t = 0; for (let yy = y; yy < Math.min(y + 200, H); yy++) for (let xx = 0; xx < Wd; xx++) { const i = (yy * Wd + xx) * 4; t++; if (d.data[i] === 255 && d.data[i + 1] === 0) k++; } rows.push(`${String(y).padStart(5)}:${(100 * k / t).toFixed(0).padStart(3)}%`); }
  console.log(`${(100 * n / (Wd * H)).toFixed(2)}%  ${path}  live ${a.height} build ${c.height}\n  ${rows.join('  ')}`);
}
