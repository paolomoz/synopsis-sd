#!/usr/bin/env node
/**
 * skills/replica/scripts/chrome-states.mjs
 *
 * Chrome STATE-MATRIX probe. The resting header crop measures one cell of the
 * matrix {theme variant} × {rest, pinned} × {each trigger open} × {search open}
 * × {mobile closed, open, drilled}. Recorded (synopsys.com, 2026-09): a replica
 * passed the resting header crop at 99.6% while every other cell was wrong —
 * flat link lists instead of hover mega-menus, no transparent-over-hero theme,
 * a link where the source opens a search panel, a boilerplate accordion where
 * the source drills down with a Back bar. This instrument opens every cell on
 * the LIVE page (and optionally on the build) and writes per-state screenshots
 * plus the computed styles that decide how the opened chrome reads, so the
 * nav document model and the header block can be lifted rather than guessed.
 *
 * It also answers two questions the DOM alone hides:
 *   - which panel belongs to which trigger when the panel lives OUTSIDE the
 *     trigger's <li> (data-menu / aria-controls / id pairing, portal roots) —
 *     the trigger→panel association is printed per trigger;
 *   - whether the header has PER-PAGE THEME VARIANTS: pass several --page URLs
 *     (one per page type); the nav row's computed position / background /
 *     colour is compared across them and every distinct combination is a
 *     variant that needs its own resting-header crop and a page-level marker.
 *
 * Usage:
 *   node skills/replica/scripts/chrome-states.mjs <liveURL> [options]
 *     --build <url>         also probe the build/prototype and print side-by-side deltas
 *     --page <url>          extra live page for theme-variant detection (repeatable)
 *     --trigger <sel>       top-level trigger selector (default: auto — header nav
 *                           items whose text is short and that expand on hover/click)
 *     --panel <sel>         opened-panel selector (default: auto — the largest element
 *                           that became visible after the hover)
 *     --search <sel>        search control selector (default: auto — header control
 *                           whose text/aria-label matches /search/i)
 *     --toggle <sel>        mobile menu toggle (default: auto — header button ≥24px
 *                           visible at the mobile width)
 *     --width <px>          desktop width (default 1440)   --mobile <px> (default 360)
 *     --out <dir>           output directory (default stardust/replica/chrome-states)
 *     --consent <sel>       extra consent-accept selector
 *     --headed              headed Chrome (bot-managed origins)
 *   Exit 0 always (diagnostic, read-only).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const live = argv.find((a) => !a.startsWith('--') && /^https?:/.test(a));
if (!live) { console.error('usage: chrome-states.mjs <liveURL> [--build <url>] [--page <url>]… [--out <dir>]'); process.exit(0); }
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const opts = (k) => argv.map((a, i) => (a === k ? argv[i + 1] : null)).filter(Boolean);
const OUT = opt('--out', 'stardust/replica/chrome-states');
const W = Number(opt('--width', 1440)); const MW = Number(opt('--mobile', 360));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const MUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const CONSENT = ['#onetrust-accept-btn-handler', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', 'button[id*="accept"]', ...(opt('--consent') ? [opt('--consent')] : [])];
const PROPS = ['position', 'top', 'left', 'width', 'height', 'backgroundColor', 'color', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'margin', 'borderRadius', 'boxShadow', 'border', 'display', 'gap', 'gridTemplateColumns', 'opacity', 'zIndex', 'maxWidth'];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: !argv.includes('--headed') });

async function open(url, mobile = false) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: MW, height: 800 }, userAgent: MUA, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: W, height: 900 }, userAgent: UA });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  for (const sel of CONSENT) { const el = await page.$(sel); if (el) { await el.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); break; } }
  return { ctx, page };
}

const styleOf = (page, sels) => page.evaluate(({ sels, PROPS }) => Object.fromEntries(sels.map((s) => {
  let els = []; try { els = [...document.querySelectorAll(s)]; } catch (e) { return [s, []]; }
  return [s, els.filter((e) => e.getBoundingClientRect().width > 0).slice(0, 4).map((e) => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    const o = { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), cls: e.className };
    PROPS.forEach((k) => { o[k] = cs[k]; }); return o;
  })];
})), { sels, PROPS });

/* header + nav row identity: position/background/colour decide the theme variant */
const headerIdentity = (page) => page.evaluate(() => {
  const cands = [...document.querySelectorAll('header, [role="banner"], [class*="nav-top"], [class*="header"], nav')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > innerWidth * 0.8 && r.y < 200 && r.height > 40 && r.height < 200; });
  return cands.slice(0, 4).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const a = e.querySelector('a, span, li'); const logo = e.querySelector('svg path, img'); return { sel: `${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).slice(0, 2).join('.')}`, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], position: cs.position, background: cs.backgroundColor, color: a ? getComputedStyle(a).color : null, logoFill: logo ? (getComputedStyle(logo).fill || logo.currentSrc || '') : null }; });
});

/* triggers: header nav items that expand on hover/click */
async function findTriggers(page) {
  const sel = opt('--trigger');
  if (sel) return page.evaluate((s) => [...document.querySelectorAll(s)].map((e, i) => ({ i, text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) })), sel).then((r) => r.map((x) => ({ ...x, sel })));
  return page.evaluate(() => {
    const root = document.querySelector('header, [role="banner"]') || document.body;
    const items = [...root.querySelectorAll('nav li, [class*="nav"] li, [role="menubar"] > *')].filter((li) => { const r = li.getBoundingClientRect(); const t = li.textContent.trim(); return r.width > 30 && r.y < 160 && t.length > 1 && t.length < 32 && !li.querySelector('li'); });
    return items.map((li, i) => { li.setAttribute('data-cs-trigger', String(i)); return { i, sel: `[data-cs-trigger="${i}"]`, text: li.textContent.trim().replace(/\s+/g, ' '), assoc: { dataMenu: li.getAttribute('data-menu'), ariaControls: (li.querySelector('[aria-controls]') || li).getAttribute('aria-controls'), href: (li.querySelector('a') || {}).getAttribute?.('href') } }; });
  });
}

/* the panel that became visible after the hover: largest newly-visible element */
async function snapshotVisible(page) {
  return page.evaluate(() => { const set = new Set(); [...document.querySelectorAll('body *')].forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 200 && r.height > 80 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0') set.add(e); }); [...set].forEach((e, i) => e.setAttribute('data-cs-vis', '1')); return set.size; });
}
async function newlyVisiblePanel(page) {
  const sel = opt('--panel');
  if (sel) return sel;
  return page.evaluate(() => {
    const fresh = [...document.querySelectorAll('body *')].filter((e) => !e.hasAttribute('data-cs-vis') && !e.closest('[data-cs-vis] ~ *') && e.getBoundingClientRect().width > 200 && e.getBoundingClientRect().height > 80 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0');
    if (!fresh.length) return null;
    fresh.sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
    const top = fresh.find((e) => !fresh.some((o) => o !== e && o.contains(e) && o.getBoundingClientRect().width <= e.getBoundingClientRect().width + 2)) || fresh[0];
    top.setAttribute('data-cs-panel', '1'); return '[data-cs-panel="1"]';
  });
}

async function probeDesktop(url, label) {
  const { ctx, page } = await open(url);
  const out = { url, identity: await headerIdentity(page), states: {} };
  await page.screenshot({ path: join(OUT, `${label}-rest.png`), clip: { x: 0, y: 0, width: W, height: 200 } });
  const triggers = await findTriggers(page);
  out.triggers = triggers;
  for (const t of triggers) {
    await snapshotVisible(page);
    const el = await page.$(t.sel); if (!el) continue;
    await el.hover().catch(() => {}); await page.waitForTimeout(700);
    let panel = await newlyVisiblePanel(page);
    if (!panel) { await el.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(700); panel = await newlyVisiblePanel(page); t.opensOn = panel ? 'click' : 'none'; } else t.opensOn = 'hover';
    const name = t.text.replace(/\W+/g, '-').toLowerCase();
    if (panel) {
      await page.screenshot({ path: join(OUT, `${label}-open-${name}.png`), clip: { x: 0, y: 0, width: W, height: 900 } });
      const st = await styleOf(page, [panel, `${panel} > *`, `${panel} a`, `${panel} img, ${panel} svg`, `${panel} h2, ${panel} h3, ${panel} h4, ${panel} [class*="head"], ${panel} [class*="title"]`, `${panel} [class*="sub"], ${panel} small, ${panel} p`]);
      const cls = await page.evaluate((p) => [...document.querySelector(p).querySelectorAll('[class]')].map((e) => e.className).filter((c, i, a) => a.indexOf(c) === i).slice(0, 40), panel);
      out.states[`open:${t.text}`] = { panelRect: st[panel]?.[0]?.rect, styles: st, classes: cls };
      console.log(`[chrome-states] ${label} trigger "${t.text}" opens on ${t.opensOn} → panel ${JSON.stringify(st[panel]?.[0]?.rect)} assoc ${JSON.stringify(t.assoc)}`);
    } else console.log(`[chrome-states] ${label} trigger "${t.text}": no panel opened (plain link?)`);
    await page.mouse.move(W / 2, 700); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelectorAll('[data-cs-vis],[data-cs-panel]').forEach((e) => { e.removeAttribute('data-cs-vis'); e.removeAttribute('data-cs-panel'); }));
  }
  // search control
  const searchSel = opt('--search') || await page.evaluate(() => { const root = document.querySelector('header, [role="banner"]') || document.body; const el = [...root.querySelectorAll('button, a, [role="button"]')].find((e) => /search/i.test(`${e.textContent} ${e.getAttribute('aria-label')} ${e.className}`) && e.getBoundingClientRect().width > 0); if (!el) return null; el.setAttribute('data-cs-search', '1'); return '[data-cs-search="1"]'; });
  if (searchSel) {
    await snapshotVisible(page);
    await page.click(searchSel, { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(900);
    const panel = await newlyVisiblePanel(page);
    await page.screenshot({ path: join(OUT, `${label}-search.png`), clip: { x: 0, y: 0, width: W, height: 700 } });
    out.states.search = { opened: !!panel, styles: panel ? await styleOf(page, [panel, `${panel} input`, `${panel} button`]) : null };
    console.log(`[chrome-states] ${label} search control → ${panel ? `panel ${JSON.stringify(out.states.search.styles[panel]?.[0]?.rect)}` : 'navigates / no panel'}`);
    await page.keyboard.press('Escape').catch(() => {});
  }
  // pinned
  await page.evaluate(() => window.scrollTo(0, 400)); await page.waitForTimeout(700);
  out.states.pinned = await headerIdentity(page);
  await page.screenshot({ path: join(OUT, `${label}-pinned.png`), clip: { x: 0, y: 0, width: W, height: 160 } });
  await ctx.close();
  return out;
}

async function probeMobile(url, label) {
  const { ctx, page } = await open(url, true);
  const out = { url, identity: await headerIdentity(page), states: {} };
  await page.screenshot({ path: join(OUT, `${label}-m-rest.png`) });
  const toggle = opt('--toggle') || await page.evaluate(() => { const root = document.querySelector('header, [role="banner"]') || document.body; const el = [...root.querySelectorAll('button, [role="button"], a')].find((e) => { const r = e.getBoundingClientRect(); return r.width >= 24 && r.height >= 24 && r.width <= 90 && r.y < 120 && !/search|logo|home/i.test(`${e.textContent} ${e.getAttribute('aria-label')}`); }); if (!el) return null; el.setAttribute('data-cs-toggle', '1'); return '[data-cs-toggle="1"]'; });
  if (toggle) {
    await page.tap(toggle).catch(() => page.click(toggle, { force: true }).catch(() => {})); await page.waitForTimeout(1000);
    await page.screenshot({ path: join(OUT, `${label}-m-open.png`) });
    const items = await page.evaluate(() => [...document.querySelectorAll('header li, [role="banner"] li, nav li, [class*="nav"] li')].filter((li) => { const r = li.getBoundingClientRect(); return r.width > 200 && r.height > 30 && r.y >= 0 && r.y < innerHeight; }).slice(0, 12).map((li, i) => { li.setAttribute('data-cs-mitem', String(i)); const cs = getComputedStyle(li); const r = li.getBoundingClientRect(); return { i, text: li.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], padding: cs.padding, borderBottom: cs.borderBottom, font: `${cs.fontSize} ${cs.fontWeight}`, color: cs.color, bg: cs.backgroundColor }; }));
    out.states.open = { items };
    console.log(`[chrome-states] ${label} mobile menu: ${items.length} visible items`, items.slice(0, 3).map((i) => `${i.text} ${i.rect[3]}px`));
    const drill = items.find((i) => i.text.length < 30);
    if (drill) {
      await page.tap(`[data-cs-mitem="${drill.i}"]`).catch(() => page.click(`[data-cs-mitem="${drill.i}"]`, { force: true }).catch(() => {})); await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, `${label}-m-drilled.png`) });
      out.states.drilled = await page.evaluate(() => { const back = [...document.querySelectorAll('button, a, span')].find((e) => /^back$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0); const heads = [...document.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().width > 0 && e.children.length === 0 && e.textContent.trim().length && getComputedStyle(e).fontWeight >= 500 && e.getBoundingClientRect().y < innerHeight).slice(0, 8).map((e) => e.textContent.trim().slice(0, 30)); return { backBar: !!back, headings: heads }; });
      console.log(`[chrome-states] ${label} drilled into "${drill.text}": back bar ${out.states.drilled.backBar}`);
    }
  } else console.log(`[chrome-states] ${label} mobile: no toggle found (pass --toggle)`);
  await ctx.close();
  return out;
}

const report = { live: await probeDesktop(live, 'live'), liveMobile: await probeMobile(live, 'live'), variants: [] };
for (const [i, url] of opts('--page').entries()) {
  const { ctx, page } = await open(url);
  report.variants.push({ url, identity: await headerIdentity(page) });
  await page.screenshot({ path: join(OUT, `variant-${i + 1}-rest.png`), clip: { x: 0, y: 0, width: W, height: 200 } });
  await ctx.close();
}
const sig = (id) => JSON.stringify((id || []).map((h) => [h.position, h.background, h.color, h.logoFill]));
const sigs = new Map([[sig(report.live.identity), [live]]]);
report.variants.forEach((v) => { const s = sig(v.identity); sigs.set(s, [...(sigs.get(s) || []), v.url]); });
if (sigs.size > 1) { console.log(`[chrome-states] ${sigs.size} header THEME VARIANTS across the page sample — each needs its own resting crop and a page-level marker:`); [...sigs.entries()].forEach(([s, urls]) => console.log(`  ${s.slice(0, 120)} ← ${urls.join(', ')}`)); }
else console.log('[chrome-states] header identity consistent across the page sample');
if (opt('--build')) { report.build = await probeDesktop(opt('--build'), 'build'); report.buildMobile = await probeMobile(opt('--build'), 'build');
  const lt = Object.keys(report.live.states).filter((k) => k.startsWith('open:')); const bt = Object.keys(report.build.states).filter((k) => k.startsWith('open:'));
  console.log(`[chrome-states] open-state cells: live ${lt.length}, build ${bt.length}; missing on build: ${lt.filter((k) => !bt.includes(k)).join(', ') || 'none'}`);
  lt.forEach((k) => { const a = report.live.states[k].panelRect; const b = report.build.states[k]?.panelRect; if (a && b) console.log(`  ${k} live ${JSON.stringify(a)} build ${JSON.stringify(b)} Δ ${a.map((v, i) => v - b[i]).join('/')}`); });
}
writeFileSync(join(OUT, 'chrome-states.json'), JSON.stringify(report, null, 1));
console.log(`[chrome-states] wrote ${OUT}/chrome-states.json + per-state screenshots`);
await browser.close();
