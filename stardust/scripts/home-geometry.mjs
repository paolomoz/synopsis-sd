import { chromium } from 'playwright';
const b = await chromium.launch();
async function probe(url, sel) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(3500);
  await p.addStyleTag({ content: '#onetrust-consent-sdk,.onetrust-pc-dark-filter{display:none!important} *{animation:none!important;transition:none!important}' });
  const r = await p.evaluate((sel) => {
    const rect = (e) => { const r = e.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; };
    const secs = [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().height > 40).map((e) => ({ ...rect(e), cls: e.className.slice(0, 50), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) }));
    const heroT = [...document.querySelectorAll('h1,h2,h3,p')].find((e) => /Introducing Synopsys Physical AI/.test(e.textContent) && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().width > 100);
    const cs = heroT ? getComputedStyle(heroT) : {};
    const hero = heroT ? { tag: heroT.tagName, ...rect(heroT), fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ff: cs.fontFamily.slice(0, 40) } : null;
    const learn = [...document.querySelectorAll('a')].find((a) => /Learn More/i.test(a.textContent) && a.getBoundingClientRect().width > 0); 
    const connect = [...document.querySelectorAll('h1,h2,h3')].find((e) => /Connect with Us/.test(e.textContent)); const cc = connect ? getComputedStyle(connect) : {};
    const logos = [...document.querySelectorAll('img')].filter((i) => /nvidia|tsmc|samsung|sifive|tower|foundry|arm|umc|imagination|globalfoundries/i.test(i.src + ' ' + i.alt) && i.getBoundingClientRect().top + scrollY > 2000 && i.getBoundingClientRect().height > 0);
    const news = [...document.querySelectorAll('img')].filter((i) => /Q3 FY26|earnings|Re-Engineering/i.test(i.alt + ' ' + i.src) || (i.closest('[class*=card]') && i.getBoundingClientRect().top + scrollY > 2900 && i.getBoundingClientRect().top + scrollY < 3500));
    return { sections: secs, hero, learn: learn ? rect(learn) : null, connect: connect ? { tag: connect.tagName, ...rect(connect), fs: cc.fontSize, fw: cc.fontWeight } : null, logos: logos.map((i) => ({ ...rect(i), src: i.src.split('/').pop().slice(0, 25) })).slice(0, 12), news: news.map((i) => rect(i)).slice(0, 3) };
  }, sel);
  await p.close(); return r;
}
const L = await probe('https://www.synopsys.com/', '.root > .aem-Grid > .aem-GridColumn, .root .aem-Grid > .aem-GridColumn > .background-component');
const B = await probe('https://main--synopsis-sd--paolomoz.aem.live/', 'main > .section');
await b.close();
console.log('LIVE'); console.log(JSON.stringify(L, null, 0).replace(/},{/g, '},\n{'));
console.log('BUILD'); console.log(JSON.stringify(B, null, 0).replace(/},{/g, '},\n{'));
