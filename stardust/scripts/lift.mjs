#!/usr/bin/env node
/**
 * lift.mjs — per-element computed-style + geometry lift for replica recreation.
 * Usage: node stardust/scripts/lift.mjs <url> <width> <out.json> [--selectors a,b,c]
 * Captures, for each selector (all matches, capped 12), rect (after settle, at scroll 0 with
 * absolute y) and the computed properties the gate measures.
 */
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const [url, widthArg, out, ...rest] = process.argv.slice(2);
const width = +widthArg;
const selArg = rest.indexOf('--selectors') >= 0 ? rest[rest.indexOf('--selectors') + 1] : null;
const DEFAULT = ['body', '.pre-header', '.pre-header a', '.pre-header .utility-nav__promo-card', '.component-nav-top', '.nav-top-wrapper', 'nav.main-nav', 'nav.main-nav > ul > li > a', 'nav.main-nav a.logo', 'nav.main-nav a.logo svg', '.component-nav-top .component-button', '.component-nav-top .search-header', '.breadcrumb', '.component-breadcrumb', '.component-breadcrumb a', '.component-breadcrumb li', '.componentSkinnyBanner', '.componentSkinnyBanner .desktop-wrapper', '.componentSkinnyBanner .text-overlay', '.componentSkinnyBanner .content-wrapper', '.componentSkinnyBanner h1', '.componentSkinnyBanner .component-text', '.componentSkinnyBanner .component-button a', '.componentSkinnyBanner .component-button', '.table-of-contents-product-layout', '.table-of-contents-product-layout ul', '.table-of-contents-product-layout li', '.table-of-contents-product-layout a', '.table-of-contents-product-layout .component-button', '.background-component', '.background-component .container', '.component-textcomp', '.component-textcomp .title', '.component-textcomp .component-text', '.component-textcomp .component-text p', '.component-textcomp .component-text ul', '.component-textcomp .component-text li', '.component-textcomp .component-text a', '.component-textcomp .component-text strong', '.component-column', '.component-column > div', '.cmp-key-benefits', '.cmp-key-benefits__wrapper', '.cmp-key-benefits__img-wrapper', '.cmp-key-benefits__img-wrapper img', '.cmp-key-benefits__title', '.cmp-key-benefits__description', '.component-image img', '.cmp-carousel', '.cmp-carousel__content', '.slick-list', '.slick-track', '.slick-slide', '.component-assetcard', '.component-assetcard .card-text', '.component-assetcard .label-wrapper', '.component-assetcard .label-wrapper span', '.component-assetcard .label-wrapper *', '.component-assetcard .heading', '.component-assetcard .heading-desc-wrapper', '.component-assetcard a', '.component-assetcard .cta-wrapper', '.slick-arrow', '.slick-dots', '.slick-dots li', '.slick-dots button', '.component-banner.connect-with-us', '.component-banner .text-overlay h2', '.component-banner .text-overlay .component-text', '.component-banner .component-button a', '.site-footer', '.site-footer .container', '.site-footer h3', '.site-footer ul', '.site-footer li', '.site-footer li a', '.site-footer .global-footer-dropdown', '.site-footer .global-footer-dropdown button', '.site-footer .social-icons', '.site-footer .social-icons a', '.site-footer .social-icons svg', '.site-footer .footer-logo img', '.site-footer .copyright', '.site-footer .footer-bottom', '.site-footer .footer-bottom a', '.site-footer hr', 'footer .row', 'footer .col-sm-3', 'footer .col-md-3', 'footer img'];
const sels = selArg ? selArg.split(',') : DEFAULT;
const PROPS = ['display', 'position', 'top', 'zIndex', 'width', 'height', 'maxWidth', 'minHeight', 'margin', 'padding', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'border', 'borderBottom', 'borderRadius', 'boxShadow', 'opacity', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'gridTemplateColumns', 'textDecoration', 'textRendering', 'webkitFontSmoothing', 'overflow', 'transform', 'verticalAlign', 'whiteSpace', 'flex', 'flexWrap', 'listStyle', 'textWrap'];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
try { await p.locator('#onetrust-accept-btn-handler').click({ timeout: 6000 }); } catch { /* none */ }
await p.waitForTimeout(1500);
for (let i = 1; i <= 4; i++) { await p.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 4); await p.waitForTimeout(300); }
await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('#onetrust-consent-sdk').forEach((n) => n.remove()); });
await p.mouse.move(width - 2, 899);
await p.waitForTimeout(800);
const data = await p.evaluate(({ sels, PROPS }) => {
  const res = { docHeight: document.documentElement.scrollHeight, selectors: {} };
  for (const s of sels) {
    let els; try { els = Array.from(document.querySelectorAll(s)); } catch { continue; }
    if (!els.length) continue;
    res.selectors[s] = els.slice(0, 12).map((el) => {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const o = { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120), text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) } };
      for (const k of PROPS) o[k] = cs[k];
      if (el.tagName === 'IMG') { o.src = el.currentSrc || el.src; o.natural = [el.naturalWidth, el.naturalHeight]; }
      return o;
    });
  }
  return res;
}, { sels, PROPS });
await writeFile(out, JSON.stringify({ url, width, capturedAt: new Date().toISOString(), ...data }, null, 2));
console.error(`[lift] ${url} @${width}: docHeight=${data.docHeight}, ${Object.keys(data.selectors).length} selectors matched → ${out}`);
await b.close();
