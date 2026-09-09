import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
try { await p.locator('#onetrust-accept-btn-handler').click({ timeout: 8000 }); console.error('onetrust accepted'); } catch { console.error('no onetrust button'); }
await p.waitForTimeout(1500);
for (let i = 1; i <= 4; i++) { await p.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 4); await p.waitForTimeout(300); }
await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('#onetrust-consent-sdk').forEach((n) => n.remove()); });
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true });
console.error('saved', out);
await b.close();
