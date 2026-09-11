// sections-geo.mjs <url> <width> — every main > .section: y, height, padding, first text
import { chromium } from 'playwright';
const [url, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 600, hasTouch: +w < 600 });
await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('main > .section')].map((s) => { const r = s.getBoundingClientRect(); const c = getComputedStyle(s); const inner = s.firstElementChild?.getBoundingClientRect(); return { cls: s.className.replace('section', '').trim(), y: Math.round(r.top + scrollY), h: Math.round(r.height), pt: c.paddingTop, pb: c.paddingBottom, innerY: inner ? Math.round(inner.top + scrollY) : null, innerH: inner ? Math.round(inner.height) : null, text: s.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) }; }))).replace(/},{/g, '},\n{'));
await b.close();
