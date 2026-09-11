// landmarks.mjs — y positions of headings/landmarks live vs build at a width (offset navigation instrument)
import { chromium } from 'playwright';
const [live, build, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch();
const LM = ['Powering the Era', 'Design the Future Today', 'Industry', 'Ecosystem Partners', "What's New", 'Support & Services', 'Connect with Us'];
async function probe(url) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '#onetrust-consent-sdk,.onetrust-pc-dark-filter{display:none!important} *{animation:none!important;transition:none!important}' });
  const r = await p.evaluate((LM) => {
    const out = { height: document.documentElement.scrollHeight };
    const els = [...document.querySelectorAll('h1,h2,h3,h4,p,strong,a')];
    LM.forEach((t) => { const e = els.find((x) => x.textContent.trim().startsWith(t) && x.getBoundingClientRect().height > 0); if (e) { const r = e.getBoundingClientRect(); out[t] = { y: Math.round(r.top + scrollY), h: Math.round(r.height), fs: getComputedStyle(e).fontSize, fw: getComputedStyle(e).fontWeight, tag: e.tagName }; } });
    const h1 = document.querySelector('h1, .cmp-carousel h2, .hero h2'); if (h1) { const r = h1.getBoundingClientRect(); out.heroTitle = { y: Math.round(r.top + scrollY), h: Math.round(r.height), fs: getComputedStyle(h1).fontSize, fw: getComputedStyle(h1).fontWeight, ff: getComputedStyle(h1).fontFamily.slice(0, 30), text: h1.textContent.trim().slice(0, 40) }; }
    const footer = document.querySelector('footer'); if (footer) out.footer = { y: Math.round(footer.getBoundingClientRect().top + scrollY), h: Math.round(footer.getBoundingClientRect().height) };
    const logos = [...document.querySelectorAll('img')].filter((i) => /nvidia|tsmc|samsung|sifive|tower/i.test(i.src + i.alt)); out.logos = { count: logos.length, ys: [...new Set(logos.map((i) => Math.round(i.getBoundingClientRect().top + scrollY)))].slice(0, 4), h: logos[0] ? Math.round(logos[0].getBoundingClientRect().height) : null };
    return out;
  }, LM);
  await p.close(); return r;
}
const L = await probe(live); const B = await probe(build); await b.close();
const keys = [...new Set([...Object.keys(L), ...Object.keys(B)])];
keys.forEach((k) => { const l = L[k]; const bb = B[k]; if (l && bb && typeof l === 'object' && 'y' in l) console.log(k.padEnd(26), 'live y', String(l.y).padStart(5), 'build y', String(bb.y).padStart(5), 'Δ', String(bb.y - l.y).padStart(5), '| h', l.h, bb.h, '| fs', l.fs, bb.fs, '| fw', l.fw, bb.fw, l.tag !== bb.tag ? `| tag ${l.tag}/${bb.tag}` : ''); else console.log(k.padEnd(26), JSON.stringify(l), JSON.stringify(bb)); });
