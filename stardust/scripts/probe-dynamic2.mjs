// probe-dynamic2.mjs — gates 5-8: share links, language menu, third-party gate, form backend hook
import { chromium } from 'playwright';
const base = 'https://main--synopsis-sd--paolomoz.aem.live';
const [article, formPage] = process.argv.slice(2);
const b = await chromium.launch(); const out = {}; const third = [];
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('request', (r) => { if (/adobedtm|cookielaw|onetrust|demdex|omtrdc/.test(r.url())) third.push(r.url()); });
if (article !== '-') {
await p.goto(base + article, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
out.share = await p.evaluate(() => ({ links: [...document.querySelectorAll('.share .share-link')].map((a) => a.href), inRail: !!document.querySelector('.section.rail .share'), pageUrl: location.href }));
out.share.allContainPage = out.share.links.every((h) => h.includes(encodeURIComponent(out.share.pageUrl)) || h.includes(out.share.pageUrl));
await p.click('.utility-lang'); await p.waitForTimeout(300);
out.lang = await p.evaluate(() => ({ open: !document.querySelector('.utility-lang-menu')?.hidden, items: [...document.querySelectorAll('.utility-lang-menu a')].map((a) => [a.textContent, a.getAttribute('href')]) }));
out.thirdPartyRequests = third.length;
}
// form: with endpoint → POST payload; without → no request
for (const mode of ['httpbin', 'none']) {
  const f = await b.newPage(); const posts = [];
  await f.route('**/config/marketo-forms.json', async (route) => { const res = await route.fetch(); const json = await res.json(); if (mode === 'httpbin') json.endpoint = 'https://httpbin.org/post'; await route.fulfill({ response: res, body: JSON.stringify(json), headers: { ...res.headers(), 'content-type': 'application/json' } }); });
  await f.route('https://httpbin.org/post', async (route) => { posts.push(route.request().postDataJSON()); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await f.goto(base + formPage, { waitUntil: 'networkidle' }); await f.waitForTimeout(1500);
  const filled = await f.evaluate(() => { const form = document.querySelector('.form.block form'); if (!form) return 0; let n = 0; form.querySelectorAll('input, select').forEach((i) => { if (i.tagName === 'SELECT') { i.selectedIndex = i.options.length - 1; } else if (i.type === 'checkbox') i.checked = true; else if (i.type === 'email') i.value = 'probe@example.com'; else i.value = 'Probe'; n += 1; }); return n; });
  await f.click('.form.block form button[type="submit"]'); await f.waitForTimeout(2500);
  out[`form_${mode}`] = { filled, posts: posts.length, payload: posts[0] ? { formId: posts[0].formId, munchkinId: posts[0].munchkinId, fieldCount: Object.keys(posts[0].fields || {}).length } : null, thanks: await f.evaluate(() => document.querySelector('.form-thanks')?.textContent) };
  await f.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
