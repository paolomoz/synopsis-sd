import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const b = await chromium.launch();
const props = ['position','top','left','width','height','backgroundColor','color','fontSize','fontWeight','lineHeight','padding','margin','borderRadius','boxShadow','border','borderBottom','display','gap','flexDirection','gridTemplateColumns','opacity','textTransform','letterSpacing','zIndex','maxWidth','alignItems','justifyContent'];
async function styles(p, sels) {
  return p.evaluate(({ sels, props }) => Object.fromEntries(sels.map((s) => {
    const els = [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0).slice(0, 3);
    return [s, els.map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const o = { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: e.textContent.trim().slice(0, 40) }; props.forEach((k) => { o[k] = cs[k]; }); return o; })];
  })), { sels, props });
}
const out = {};
// desktop live: rest + Products open + search open
let ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
let p = await ctx.newPage(); await p.goto('https://www.synopsys.com/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await p.waitForTimeout(1500); const ot = await p.$('#onetrust-accept-btn-handler'); if (ot) { await ot.click().catch(() => {}); await p.waitForTimeout(500); }
out.rest = await styles(p, ['.component-nav-top', '.component-nav-top .logo svg path', '.main-nav-item-header', '.header-cta a, .nav-top-wrapper a.cta, .nav-top-wrapper .btn', '.nav-top-wrapper [class*=search]', '.utility-nav, .utility-bar, [class*=utility]']);
await p.hover('.main-nav-item[data-menu="Products"]'); await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/live-menu-products.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
out.products = await styles(p, ['.dropdown[data-menu="Products"]', '.dropdown[data-menu="Products"] > .aem-Grid', '.dropdown[data-menu="Products"] .component-subnav', '.dropdown[data-menu="Products"] .left-col', '.dropdown[data-menu="Products"] .middle-right-col', '.dropdown[data-menu="Products"] .middle-right-col .col', '.dropdown[data-menu="Products"] .header-item', '.dropdown[data-menu="Products"] .header-item img', '.dropdown[data-menu="Products"] .nav-list', '.dropdown[data-menu="Products"] .nav-list li', '.dropdown[data-menu="Products"] .nav-item-title', '.dropdown[data-menu="Products"] .nav-item-subtitle', '.dropdown[data-menu="Products"] .sub-nav-footer', '.dropdown[data-menu="Products"] .left-col .header-item', '.dropdown[data-menu="Products"] .left-col .nav-list', '.main-nav-item[data-menu="Products"] .main-nav-item-header', '.main-nav-item[data-menu="Products"]::after']);
out.productsHtmlClasses = await p.evaluate(() => [...document.querySelectorAll('.dropdown[data-menu="Products"] [class]')].map((e) => e.className).filter((c, i, a) => a.indexOf(c) === i).slice(0, 60));
for (const m of ['Why Synopsys', 'Solutions', 'Support & Training', 'Resources']) {
  await p.hover(`.main-nav-item[data-menu="${m}"]`).catch(() => {}); await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/live-menu-${m.replace(/[^a-z]/gi, '')}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  out[`menu_${m}`] = await styles(p, [`.dropdown[data-menu="${m}"]`, `.dropdown[data-menu="${m}"] .component-subnav`, `.dropdown[data-menu="${m}"] .col`, `.dropdown[data-menu="${m}"] .promo, .dropdown[data-menu="${m}"] [class*=promo], .dropdown[data-menu="${m}"] [class*=featured], .dropdown[data-menu="${m}"] .image`]);
}
await p.mouse.move(700, 600); await p.waitForTimeout(600);
const search = await p.$('.nav-top-wrapper [class*=search] a, .nav-top-wrapper [class*=search] button, .nav-top-wrapper [class*=search]');
if (search) { await search.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200); await p.screenshot({ path: '/tmp/live-search.png', clip: { x: 0, y: 0, width: 1440, height: 600 } }); out.search = await styles(p, ['[class*=search-overlay], [class*=searchbox], .search-container, [class*=search] input, form[role=search], input[type=search], input[type=text][placeholder]']); }
await ctx.close();
// mobile live: open menu, then a section
ctx = await b.newContext({ viewport: { width: 360, height: 800 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', isMobile: true, hasTouch: true });
p = await ctx.newPage(); await p.goto('https://www.synopsys.com/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await p.waitForTimeout(1500); const ot2 = await p.$('#onetrust-accept-btn-handler'); if (ot2) { await ot2.click().catch(() => {}); await p.waitForTimeout(500); }
await p.screenshot({ path: '/tmp/live-m-rest.png', clip: { x: 0, y: 0, width: 360, height: 800 } });
out.mobileRest = await styles(p, ['.component-nav-top', '.hamburger, [class*=hamburger], [class*=menu-toggle], .navbar-toggle', '.component-nav-top .logo svg', '.utility-nav, [class*=utility]']);
const ham = await p.$('.hamburger, [class*=hamburger], [class*=menu-toggle], .navbar-toggle, button[aria-label*=enu]');
if (ham) { await ham.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1000); await p.screenshot({ path: '/tmp/live-m-open.png', clip: { x: 0, y: 0, width: 360, height: 800 } });
  out.mobileOpen = await styles(p, ['.main-nav', '.main-nav-item', '.main-nav-item-header', '.mobile-menu, [class*=mobile-menu], [class*=mobile-nav]', '.header-cta a, .nav-top-wrapper a.cta', '.main-nav-item.has-dropdown::after']);
  const prod = await p.$('.main-nav-item[data-menu="Products"]'); if (prod) { await prod.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1000); await p.screenshot({ path: '/tmp/live-m-products.png', clip: { x: 0, y: 0, width: 360, height: 800 } }); out.mobileProducts = await styles(p, ['.dropdown[data-menu="Products"]', '.dropdown[data-menu="Products"] .header-item', '.dropdown[data-menu="Products"] .nav-list', '[class*=back], .mobile-back, .sub-nav-back']); } }
await ctx.close(); await b.close();
writeFileSync('/tmp/live-menu.json', JSON.stringify(out, null, 1)); console.log('probe done', Object.keys(out));
