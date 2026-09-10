// probe-dynamic.mjs — step-2 gate probe: counts index-fed items on deployed pages
import { chromium } from 'playwright';
const base = 'https://main--synopsis-sd--paolomoz.aem.live';
const b = await chromium.launch(); const p = await b.newPage();
const out = {};
for (const path of process.argv.slice(2)) {
  await p.goto(base + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  out[path] = await p.evaluate(() => ({
    listing: document.querySelectorAll('.listing .listing-items > li').length,
    listingTotal: document.querySelector('.listing')?.dataset.total || null,
    authorCards: document.querySelectorAll('.cards.author > ul > li').length,
    authorIndexed: document.querySelector('.cards.author')?.dataset.indexed || null,
    carouselBlog: document.querySelectorAll('.carousel.blog .carousel-list > *').length,
    carouselIndexed: document.querySelector('.carousel.blog')?.dataset.indexed || null,
    authorName: document.querySelector('.author h2, .author h1')?.textContent.trim() || null,
    errors: [],
  }));
}
console.log(JSON.stringify(out, null, 1)); await b.close();
