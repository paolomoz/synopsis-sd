// landmarks2.mjs — y of section anchors (visible h2/h3 + first pillar/logo/news image + footer) live vs build
import { chromium } from 'playwright';
const [live, build, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch();
async function probe(url) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 600, hasTouch: +w < 600 });
  await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(3500);
  await p.addStyleTag({ content: '#onetrust-consent-sdk,.onetrust-pc-dark-filter{display:none!important} *{animation:none!important;transition:none!important}' });
  const r = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 50 && r.height > 0 && r.left >= 0 && r.left < 1440; };
    const y = (e) => (e ? Math.round(e.getBoundingClientRect().top + scrollY) : null);
    const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const h = (re) => hs.find((e) => re.test(e.textContent.trim()));
    const imgs = [...document.querySelectorAll('img')].filter(vis);
    const img = (pred) => imgs.find(pred);
    const out = { height: document.documentElement.scrollHeight };
    out['hero title'] = y(hs.find((e) => /Introducing Synopsys Physical AI/.test(e.textContent)) || [...document.querySelectorAll('.title')].find((e) => vis(e) && /Introducing/.test(e.textContent)));
    out['Powering h2'] = y(h(/^Powering the Era/)); out['Powering sub'] = y([...document.querySelectorAll('p,div')].find((e) => vis(e) && /^Supercharge Productivity/.test(e.textContent.trim()) && e.children.length === 0));
    out['pillar img'] = y(img((i) => i.getBoundingClientRect().width > 250 && i.getBoundingClientRect().top + scrollY > 900 && i.getBoundingClientRect().top + scrollY < 1200));
    out['pillar label'] = y([...document.querySelectorAll('span,h3')].find((e) => vis(e) && e.textContent.trim() === 'Synopsys.ai'));
    out['Design h2'] = y(h(/^Design the Future Today/)); out['Industry h2'] = y(h(/^Industry$/)); out['Technology h2'] = y(h(/^Technology$/));
    out['kb1 title'] = y([...document.querySelectorAll('div,p,strong,h3,h4')].find((e) => vis(e) && e.textContent.trim() === 'AI Chip Development' && e.children.length <= 1));
    out['kb1 desc'] = y([...document.querySelectorAll('div,p')].find((e) => vis(e) && /^Achieve first-pass silicon/.test(e.textContent.trim()) && e.children.length === 0));
    out['kb6 desc'] = y([...document.querySelectorAll('div,p')].find((e) => vis(e) && /^Unleash bandwidth/.test(e.textContent.trim()) && e.children.length === 0));
    out['Ecosystem h2'] = y(h(/^Ecosystem Partners$/)); out['logo'] = y(img((i) => Math.round(i.getBoundingClientRect().height) === 100 && i.getBoundingClientRect().top + scrollY > 2400));
    out["What's New h2"] = y(h(/^What's New$/)); out['news img'] = y(img((i) => Math.round(i.getBoundingClientRect().width) === 370)); out['news title'] = y(h(/^Synopsys Posts Financial Results/));
    out['news learn'] = y([...document.querySelectorAll('a')].find((a) => vis(a) && /^Learn more/i.test(a.textContent.trim()) && a.getBoundingClientRect().top + scrollY > 2900));
    out['news dots'] = y([...document.querySelectorAll('.slick-dots')].find((e) => e.getBoundingClientRect().top + scrollY > 2900));
    out['Support h2'] = y(h(/^Support & Services$/)); out['Support cta'] = y([...document.querySelectorAll('a,span')].find((e) => vis(e) && /^View Support/.test(e.textContent.trim()) && e.children.length <= 1));
    out['Connect title'] = y([...document.querySelectorAll('div,h2,h3,p')].find((e) => vis(e) && e.textContent.trim() === 'Connect with Us' && e.children.length === 0));
    out['Connect cta'] = y([...document.querySelectorAll('a')].find((a) => vis(a) && /^Contact Sales/.test(a.textContent.trim()) && a.getBoundingClientRect().top + scrollY > 3500));
    out.footer = y(document.querySelector('footer'));
    return out;
  });
  await p.close(); return r;
}
const L = await probe(live); const B = await probe(build); await b.close();
for (const k of Object.keys(L)) { const d = (B[k] ?? NaN) - (L[k] ?? NaN); console.log(k.padEnd(16), String(L[k]).padStart(6), String(B[k]).padStart(6), 'Δ', String(Number.isNaN(d) ? '?' : d).padStart(5)); }
