import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 120)); });
await p.goto('http://localhost:8961/index-proposed.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/proto-top.png', fullPage: true }); console.log(await p.evaluate(() => document.documentElement.scrollHeight)); await b.close();
