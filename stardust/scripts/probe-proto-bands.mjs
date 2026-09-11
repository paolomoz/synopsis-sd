import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.argv[2], { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
const rows = await p.evaluate(() => [...document.querySelectorAll('.band-text, .band-text .image, .band-text .component-textcomp, .band-text .promo, .cmp-blogsdev, .band-title, .cmp-blogbanner, .two2575PinnedLeft, .cmp-tableofcontents, .cmp-subscription-form, .cmp-socialshare')].map((e) => { const r = e.getBoundingClientRect(); return `${e.className.split(' ').slice(0, 2).join('.')} y${Math.round(r.top + scrollY)} h${Math.round(r.height)} x${Math.round(r.left)} w${Math.round(r.width)} | ${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)}`; }));
console.log(rows.join('\n')); await b.close();
