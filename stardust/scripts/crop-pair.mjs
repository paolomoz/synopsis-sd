import { PNG } from 'pngjs'; import fs from 'node:fs';
const [a, b, y, h, out, yb] = process.argv.slice(2);
const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
const H = +h, Y = +y, YB = yb ? +yb : +y, W = A.width; const scale = 2;
const o = new PNG({ width: W * scale, height: (H * 2 + 6) * scale });
for (let yy = 0; yy < H * 2 + 6; yy++) for (let x = 0; x < W; x++) {
  let src, sy; if (yy < H) { src = A; sy = Y + yy; } else if (yy >= H + 6) { src = B; sy = YB + yy - H - 6; } else { src = null; }
  const r = src ? src.data[(sy * W + x) * 4] : 255, g = src ? src.data[(sy * W + x) * 4 + 1] : 0, bl = src ? src.data[(sy * W + x) * 4 + 2] : 255;
  for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) { const i = ((yy * scale + dy) * W * scale + x * scale + dx) * 4; o.data[i] = r; o.data[i + 1] = g; o.data[i + 2] = bl; o.data[i + 3] = 255; }
}
fs.writeFileSync(out, PNG.sync.write(o)); console.log('wrote', out);
