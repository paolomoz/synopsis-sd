import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://www.synopsys.com/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
console.log(JSON.stringify(await p.evaluate(() => {
  const hero = document.querySelector('[carousel-type="banner-carousel"]'); const items = [...hero.querySelectorAll('.cmp-carousel__item')];
  const heroInfo = { items: items.length, cloned: items.filter((i) => i.className.includes('clone')).length, itemClasses: items.map((i) => i.className.replace(/cmp-carousel__item/g, '').trim().slice(0, 40)), titleHtml: hero.querySelector('.cmp-carousel__item--active .title')?.innerHTML.trim().slice(0, 200), hiddenItemDisplay: items.filter((i) => !i.className.includes('active')).map((i) => getComputedStyle(i).display + '/' + getComputedStyle(i).position + '/' + Math.round(i.getBoundingClientRect().left)).slice(0, 4) };
  const news = document.querySelector('.carousel-holder .slick-track'); const cards = [...news.children];
  const newsInfo = { cards: cards.length, cloned: cards.filter((c) => c.className.includes('slick-cloned')).length, order: cards.map((c) => (c.className.includes('slick-cloned') ? 'C' : 'R')).join(''), trackX: Math.round(news.getBoundingClientRect().left), cardW: Math.round(cards[0].getBoundingClientRect().width), firstRealX: Math.round(cards.find((c) => !c.className.includes('slick-cloned')).getBoundingClientRect().left) };
  const lt = document.querySelector('.logo-carousel .slick-track'); const ls = [...lt.children];
  const logoInfo = { slides: ls.length, cloned: ls.filter((c) => c.className.includes('slick-cloned')).length, order: ls.map((c) => (c.className.includes('slick-cloned') ? 'C' : 'R')).join(''), slideW: Math.round(ls[0].getBoundingClientRect().width), slideHtml: ls.find((c) => !c.className.includes('slick-cloned')).outerHTML.replace(/\s+/g, ' ').slice(0, 300), trackX: Math.round(lt.getBoundingClientRect().left) };
  const pill = [...document.querySelectorAll('img')].filter((i) => i.getBoundingClientRect().width > 300 && i.getBoundingClientRect().top + scrollY > 950 && i.getBoundingClientRect().top + scrollY < 1100).map((i) => ({ cur: i.currentSrc.slice(-90), nat: [i.naturalWidth, i.naturalHeight], srcset: !!i.srcset }));
  return { heroInfo, newsInfo, logoInfo, pill };
}), null, 1)); await b.close();
