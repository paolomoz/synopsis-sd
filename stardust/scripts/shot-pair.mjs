import { chromium } from 'playwright';
const b = await chromium.launch(); 
for (const [name, url] of [['live','https://www.synopsys.com/articles/category-automotive.html'],['eds','https://main--synopsis-sd--paolomoz.aem.live/articles/category-automotive']]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(3000);
  await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(800);
  await p.screenshot({ path: `/tmp/cat-${name}.png`, clip: { x: 0, y: 0, width: 1280, height: 900 } }); await p.close();
}
await b.close();
