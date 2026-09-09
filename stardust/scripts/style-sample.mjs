#!/usr/bin/env node
/**
 * style-sample.mjs — computed-style + font-file sampler for stardust:extract Phase 3.
 *
 * The bundled crawl.mjs captures content/media/tokens but not per-element computed
 * styles or @font-face files. This script renders a page list live (same viewport,
 * reduced motion, consent dismissal) and records, per page:
 *   - color frequency tables (background / text / border), weighted by element area
 *   - font-family / size / weight / line-height per heading level and body
 *   - border-radius + box-shadow frequency (element-count weighted)
 *   - button specs (primary/secondary), container widths, section paddings
 *   - landmark fingerprints (header/footer/nav heading + CTA sequences)
 *   - @font-face rules + intercepted font files saved under assets/fonts/
 *   - logo candidates (header img/svg)
 * Output: <out>/_style-samples.json (+ assets/fonts/*)
 *
 * Usage: node style-sample.mjs --pages url1,url2 --out stardust/current [--concurrency 3]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = { pages: [], out: 'stardust/current', concurrency: 3 };
for (let i = 2; i < process.argv.length; i += 1) {
  const k = process.argv[i];
  if (k === '--pages') args.pages = process.argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
  else if (k === '--out') args.out = process.argv[++i];
  else if (k === '--concurrency') args.concurrency = +process.argv[++i] || 3;
}
if (!args.pages.length) { console.error('need --pages'); process.exit(2); }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const CONSENT = ['#onetrust-accept-btn-handler', 'button#truste-consent-button', '[aria-label="Accept all"]', 'button:has-text("Accept All")', 'button:has-text("Accept all cookies")'];

async function sample(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const isTransparent = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
    const toHex = (c) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return c;
      if (m[4] !== undefined && +m[4] < 0.05) return null;
      return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
    };
    const bump = (tbl, key, w, sel) => {
      if (!key) return;
      const e = (tbl[key] ||= { n: 0, area: 0, selectors: {} });
      e.n += 1; e.area += w;
      if (sel) e.selectors[sel] = (e.selectors[sel] || 0) + 1;
    };
    const selOf = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    const bg = {}, fg = {}, bd = {}, radius = {}, shadow = {}, families = {}, gradients = {};
    const all = Array.from(document.querySelectorAll('body *')).filter(vis).slice(0, 6000);
    for (const el of all) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const area = Math.min(r.width * r.height, 1440 * 900);
      const b = toHex(cs.backgroundColor); if (!isTransparent(cs.backgroundColor) && b) bump(bg, b, area, selOf(el));
      const t = toHex(cs.color); if (t && el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) bump(fg, t, area, selOf(el));
      if (cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0) { const c = toHex(cs.borderTopColor); if (c && !isTransparent(cs.borderTopColor)) bump(bd, c, 1, selOf(el)); }
      if (cs.borderRadius && cs.borderRadius !== '0px' && r.width > 8) bump(radius, cs.borderTopLeftRadius, 1, selOf(el));
      if (cs.boxShadow && cs.boxShadow !== 'none') bump(shadow, cs.boxShadow, 1, selOf(el));
      if (cs.backgroundImage && /gradient/.test(cs.backgroundImage)) bump(gradients, cs.backgroundImage, 1, selOf(el));
      if (Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) bump(families, cs.fontFamily, 1, el.tagName.toLowerCase());
    }
    const typo = {};
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'a', 'button', 'label', 'small']) {
      const els = Array.from(document.querySelectorAll(tag)).filter(vis).slice(0, 40);
      if (!els.length) continue;
      typo[tag] = els.map((el) => { const cs = getComputedStyle(el); return { ff: cs.fontFamily, fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing, tt: cs.textTransform, color: toHex(cs.color), text: (el.innerText || '').trim().slice(0, 60) }; });
    }
    const buttons = Array.from(document.querySelectorAll('a.btn, a.button, button, .btn, .button, a[class*="btn"], a[class*="button"], a[class*="cta"]')).filter(vis).slice(0, 60).map((el) => {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { sel: selOf(el), text: (el.innerText || '').trim().slice(0, 40), bg: toHex(cs.backgroundColor), color: toHex(cs.color), border: cs.border, radius: cs.borderRadius, padding: cs.padding, fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily, h: Math.round(r.height), tt: cs.textTransform, ls: cs.letterSpacing };
    });
    const containers = {};
    for (const el of all) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (cs.maxWidth && cs.maxWidth !== 'none' && /px/.test(cs.maxWidth) && r.width > 600) bump(containers, cs.maxWidth, 1, selOf(el)); }
    const sections = Array.from(document.querySelectorAll('main section, main > div, body > div > section, section')).filter(vis).slice(0, 40).map((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { sel: selOf(el), pt: cs.paddingTop, pb: cs.paddingBottom, bg: toHex(cs.backgroundColor), bgImage: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 200) : null, h: Math.round(r.height), y: Math.round(r.y + scrollY) }; });
    const landmark = (root) => {
      if (!root) return null;
      const heads = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*="title"],[class*="heading"]')).map((h) => (h.innerText || '').trim()).filter(Boolean).slice(0, 30);
      const ctas = Array.from(root.querySelectorAll('a,button')).map((a) => (a.innerText || '').trim()).filter((t) => t && t.length < 40).slice(0, 80);
      const cs = getComputedStyle(root); const r = root.getBoundingClientRect();
      return { tag: root.tagName.toLowerCase(), cls: root.className && typeof root.className === 'string' ? root.className.slice(0, 120) : '', heads, ctas, bg: toHex(cs.backgroundColor), color: toHex(cs.color), h: Math.round(r.height), position: cs.position };
    };
    const header = document.querySelector('header, [role="banner"], .header, #header');
    const footer = document.querySelector('footer, [role="contentinfo"], .footer, #footer');
    const navs = Array.from(document.querySelectorAll('nav')).filter(vis).slice(0, 6).map(landmark);
    const logos = Array.from((header || document).querySelectorAll('img, svg')).filter(vis).slice(0, 10).map((el) => ({ tag: el.tagName.toLowerCase(), src: el.getAttribute('src') || el.getAttribute('data-src') || null, alt: el.getAttribute('alt'), cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '', w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), inlineSvg: el.tagName.toLowerCase() === 'svg' ? el.outerHTML.slice(0, 4000) : null }));
    const fontFaces = [];
    for (const ss of Array.from(document.styleSheets)) {
      let rules; try { rules = ss.cssRules; } catch { continue; }
      for (const rule of Array.from(rules || [])) if (rule instanceof CSSFontFaceRule) fontFaces.push({ css: rule.cssText.slice(0, 600), href: ss.href });
    }
    const hero = (() => {
      const cands = Array.from(document.querySelectorAll('main h1, h1')).filter(vis);
      if (!cands.length) return null;
      const h1 = cands[0]; const r = h1.getBoundingClientRect();
      let sec = h1; while (sec.parentElement && sec.getBoundingClientRect().width < 1000) sec = sec.parentElement;
      const cs = getComputedStyle(sec); const sr = sec.getBoundingClientRect();
      const vid = sec.querySelector('video'); const img = sec.querySelector('img');
      return { text: h1.innerText.trim().slice(0, 200), y: Math.round(r.y + scrollY), sectionSel: selOf(sec), sectionH: Math.round(sr.height), bg: toHex(cs.backgroundColor), bgImage: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 300) : null, video: vid ? { src: vid.currentSrc || vid.src, poster: vid.poster } : null, img: img ? { src: img.currentSrc || img.src, alt: img.alt } : null };
    })();
    const top = (tbl, k = 12) => Object.entries(tbl).sort((a, b) => b[1].area - a[1].area || b[1].n - a[1].n).slice(0, k).map(([v, e]) => ({ value: v, n: e.n, area: Math.round(e.area), selectors: Object.entries(e.selectors).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]) }));
    return {
      colors: { background: top(bg), text: top(fg), border: top(bd, 8) },
      radius: top(radius, 10), shadow: top(shadow, 6), gradients: top(gradients, 6), families: top(families, 6),
      typo, buttons, containers: top(containers, 6), sections, header: landmark(header), footer: landmark(footer), navs, logos, fontFaces, hero,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
}

async function main() {
  await mkdir(path.join(args.out, 'assets/fonts'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const fonts = new Map();
  const results = {};
  const queue = [...args.pages];
  const worker = async () => {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'en-US' });
    ctx.on('response', async (res) => {
      const u = res.url();
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(u) && res.ok()) {
        const name = path.basename(new URL(u).pathname);
        if (fonts.has(u)) return;
        try { const buf = await res.body(); fonts.set(u, { url: u, file: `assets/fonts/${name}`, bytes: buf.length }); if (!existsSync(path.join(args.out, 'assets/fonts', name))) await writeFile(path.join(args.out, 'assets/fonts', name), buf); } catch { /* ignore */ }
      }
    });
    while (queue.length) {
      const url = queue.shift();
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2500);
        for (const s of CONSENT) { try { const b = page.locator(s).first(); if (await b.isVisible({ timeout: 300 })) { await b.click({ timeout: 1000 }); await page.waitForTimeout(400); break; } } catch { /* none */ } }
        for (let i = 1; i <= 4; i += 1) { await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 4); await page.waitForTimeout(300); }
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
        results[url] = await sample(page);
        console.error(`[style] OK ${url}`);
      } catch (e) { results[url] = { error: String(e).slice(0, 200) }; console.error(`[style] FAIL ${url} ${e}`); }
      await page.close();
    }
    await ctx.close();
  };
  await Promise.all(Array.from({ length: Math.min(args.concurrency, args.pages.length) }, worker));
  await browser.close();
  await writeFile(path.join(args.out, '_style-samples.json'), JSON.stringify({ _provenance: { writtenBy: 'stardust:extract/style-sample.mjs', writtenAt: new Date().toISOString(), renderedBy: 'playwright', viewport: '1440x900' }, pages: results, fonts: Array.from(fonts.values()) }, null, 2));
  console.error(`[style] wrote ${Object.keys(results).length} samples, ${fonts.size} font files`);
}
main().catch((e) => { console.error(e); process.exit(1); });
