// fidelity-core — live-vs-deployed FIDELITY parity instrument (deploy-flow gate). Method: stardust/fidelity-gate-method.md
// Ported from the coca-cola replica (2026-09-16); synopsys.com specifics: live URLs come from stardust/path-map.json, Roboto face, Ask/chat overlays.
// Noise found on this site: the Ask launcher (#floating-icon) and its confirm overlay drop to static flow below <body> once other overlays are purged and add 171px to the live scrollHeight — purge them too.
// Exports: capture(browser, url, width, withStates, opts) → inventory+shot; compare(live, dep, width, dir) → findings.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { mkdirSync, writeFileSync } from 'fs';
import { newLiveContext, gotoLive, dismissOverlays } from '../../scripts/diff/live-session.mjs';

export const LIVE = process.env.FID_LIVE || 'https://www.synopsys.com';
export const DEP = process.env.FID_DEP || 'https://main--synopsis-sd--paolomoz.aem.live';
export const TOL = 4; // px
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const slug = (p) => p.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home';

const INVENTORY = () => {
  const norm = (s) => s.replace(/[\u00a0\u200b]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const keyOf = (s) => norm(s).replace(/[|,;:·•/\\()\[\]\-–—]+/g, ' ').replace(/\s+/g, ' ').trim(); // separators the source renders as text nodes ('| | |', 'Tags: , , ,') are layout, not content
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!(r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.opacity !== '0')) return false; if (r.right < 0 || r.left > innerWidth || r.bottom + scrollY < 0) return false; /* accessibility-only copies are positioned off-canvas (source hero h1 at left:-33554280) */ for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).opacity === '0') return false; return true; };
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; };
  const cvs = document.createElement('canvas').getContext('2d');
  const fam = (cs) => { // rendered face: the first family in the stack whose glyph advance equals the full stack's (canvas width probe)
    const fams = cs.fontFamily.split(',').map((x) => x.replace(/["']/g, '').trim()); const probe = 'Hamburgefonstiv 0123 &';
    cvs.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const w0 = cvs.measureText(probe).width;
    for (const f of fams) { cvs.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} "${f}", monospace`; if (Math.abs(cvs.measureText(probe).width - w0) < 0.5) return f; }
    return `?${fams[0]}`;
  };
  const fixedOverlay = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.tagName === 'HEADER' || e.closest('header')) return false; if (getComputedStyle(e).position === 'fixed') return true; } return false; };
  const skip = (el) => el.closest('script,style,noscript,svg,#onetrust-consent-sdk,.onetrust-pc-dark-filter,[id^="QSI"],[class*="QSI"],[role="dialog"],#ask-synopsys,#askSynopsys,[class*="ask-synopsys"],[id*="chat" i],[class*="chatbot" i],template,.is-clone,.splide__slide--clone,.swiper-slide-duplicate');
  const texts = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (skip(el)) continue;
    const own = keyOf([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
    if (own.length < 2 || !vis(el) || fixedOverlay(el)) continue;
    const cs = getComputedStyle(el);
    const ctl = el.closest('a, button'); // any text inside a control reports the control's box (live span vs deployed p inside the same button)
    texts.push({ key: own, tag: el.tagName.toLowerCase(), box: box(ctl || el), region: el.closest('header, .sticky-nav, .experiencefragment.sticky-nav, .utility-nav, .nav-top-wrapper, [class*="navigation"], .header-wrapper, #utility-nav-bar, .pre-header, #topNav, .component-nav-top, .cmp-experiencefragment--topnav, .topNav') ? 'header' : el.closest('footer, .siteFooter, .footer-wrapper, [class*="footer" i]') ? 'footer' : 'main',
      face: fam(cs), faceLoaded: !fam(cs).startsWith('?'), bg: /^(a|button)$/.test(el.tagName.toLowerCase()) ? cs.backgroundColor : null, size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, color: cs.color, align: cs.textAlign, transform: cs.textTransform });
  }
  const chrome = (el) => !!el.closest('header, .sticky-nav, .experiencefragment.sticky-nav, .utility-nav, #utility-nav-bar, .pre-header, #topNav, .component-nav-top, .cmp-experiencefragment--topnav, .topNav, footer, .siteFooter, .footer-wrapper');
  const images = [...document.images].filter((i) => !skip(i) && vis(i) && !chrome(i)).map((i) => { // main images only, rendered (mega-menu icons are visibility:hidden with a box)
    const src = (i.currentSrc || i.src || '').split('?')[0];
    const base = src.split('/').filter(Boolean).slice(-1)[0] || '';
    return { key: (i.alt || '').trim().toLowerCase() || base.toLowerCase(), src: src.slice(-70), box: box(i), loaded: i.naturalWidth > 0, rendered: i.clientWidth > 0, ratio: i.naturalWidth ? +(i.naturalWidth / i.naturalHeight).toFixed(2) : null };
  });
  const icons = [...document.querySelectorAll('[class*="icon"]')].filter((el) => !skip(el) && vis(el)).map((el) => { const b = getComputedStyle(el, '::before'); if (!b.content || b.content === 'none' || b.content === 'normal') return null; const f = fam(b); return { cls: el.className.toString().slice(0, 40), face: f, loaded: !f.startsWith('?'), w: Math.round(el.getBoundingClientRect().width) }; }).filter(Boolean);
  const links = [...document.querySelectorAll('a[href^="http"]')].filter((a) => !skip(a) && !/synopsys\.com|aem\.page|aem\.live/.test(a.host)).map((a) => ({ href: a.href.replace(/\/$/, ''), target: a.target || '', text: norm(a.textContent).slice(0, 40) }));
  const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && !e.closest('header, .sticky-nav, .experiencefragment.sticky-nav, .utility-nav, [class*="navigation"], #topNav, .cmp-experiencefragment--topnav'); }; // the source hides a promo <video> and tracking iframes in the mega-menu / body root
  const dyn = { video: [...document.querySelectorAll('video')].filter(shown).length, iframe: [...document.querySelectorAll('iframe:not([src*="onetrust"])')].filter(shown).length, sprinklr: [...document.querySelectorAll('.swe_embed, .cmp-embed__sprinklr-gallery')].map((e) => ({ kids: e.querySelectorAll('*').length, h: Math.round(e.getBoundingClientRect().height) })), onetrust: !!document.querySelector('#onetrust-consent-sdk, script[src*="otSDKStub"]') };
  const blockTexts = [...document.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, div, span, label, a')].filter((el) => !skip(el) && vis(el)).map((el) => norm(el.textContent)).filter((t) => t.length > 2);
  return { texts, images, icons, links, dyn, blockTexts, height: Math.round(document.documentElement.scrollHeight), title: document.title };
};

const PURGE = () => { document.querySelectorAll('#onetrust-consent-sdk, .onetrust-pc-dark-filter, [id^="QSI"], [class*="QSI"], [role="dialog"], #ask-synopsys, #askSynopsys, [class*="ask-synopsys"], [id*="chat" i], [class*="chatbot" i], #floating-icon, .confirm-overlay, [class*="border-gradient-ask"]').forEach((e) => e.remove()); [...document.body.children].forEach((e) => { if (e.tagName !== 'HEADER' && e.tagName !== 'MAIN' && e.tagName !== 'FOOTER' && e.getBoundingClientRect().height > 0 && getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height < innerHeight * 0.6) e.remove(); }); document.documentElement.style.overflow = ''; document.body.style.overflow = ''; document.body.classList.remove('ot-pc-open'); };
export async function states(page) {
  await page.evaluate(PURGE);
  const out = {};
  // nav hover: open first submenu, then traverse into it
  try {
    const trig = page.locator('header li:has(ul) > a').first();
    if (await trig.count()) {
      await trig.hover({ timeout: 5000 }); await sleep(700);
      const open = await page.evaluate(() => {
        const li = [...document.querySelectorAll('header li')].find((l) => l.querySelector('ul') && getComputedStyle(l.querySelector('ul')).display !== 'none' && l.querySelector('ul').getBoundingClientRect().height > 0);
        if (!li) return null; const a = li.querySelector('ul a'); const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
        const cv = document.createElement('canvas').getContext('2d'); const probe = 'Hamburgefonstiv 0123'; cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const w0 = cv.measureText(probe).width; const face = cs.fontFamily.split(',').map((x) => x.replace(/["']/g, '').trim()).find((f) => { cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} "${f}", monospace`; return Math.abs(cv.measureText(probe).width - w0) < 0.5; }) || '?';
        return { items: li.querySelectorAll('ul a').length, size: cs.fontSize, lh: cs.lineHeight, face, first: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
      });
      out.submenu = open;
      if (open) {
        await page.mouse.move(open.first[0] + open.first[2] / 2, open.first[1] + open.first[3] / 2, { steps: 8 }); await sleep(500);
        out.submenu.staysOpenOnTraverse = await page.evaluate(() => !![...document.querySelectorAll('header li ul')].find((u) => getComputedStyle(u).display !== 'none' && u.getBoundingClientRect().height > 0));
      }
      await page.mouse.move(5, 895); await sleep(400);
    } else out.submenu = 'no-nav';
  } catch (e) { out.submenu = `error ${String(e).slice(0, 60)}`; }
  // click-to-play on the first video control
  try {
    const btn = page.locator('main .embed__play, main [class*="__play" i], main [class*="play-button" i], main button[aria-label*="play" i]').first();
    if (await btn.count() && await btn.isVisible()) {
      await btn.scrollIntoViewIfNeeded(); await btn.click({ timeout: 3000 }); await sleep(5000);
      out.play = await page.evaluate(() => { const v = [...document.querySelectorAll('video')].find((x) => x.currentTime > 0 && !x.paused); const yt = document.querySelector('iframe[src*="youtube"][src*="autoplay=1"]'); return v ? `video playing t=${v.currentTime.toFixed(1)}` : yt ? 'youtube iframe autoplay' : 'nothing plays'; });
    } else out.play = 'no play control';
  } catch (e) { out.play = `error ${String(e).slice(0, 60)}`; }
  return out;
}

export async function capture(browser, url, width, withStates, { cookies = [] } = {}) {
  const ctx = await newLiveContext(browser, { viewport: { width, height: 900 } });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const hosts = new Set(); const errors = [];
  page.on('request', (r) => { try { hosts.add(new URL(r.url()).host); } catch { /* ignore */ } });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await gotoLive(page, url, { settleMs: 2500 });
  await dismissOverlays(page, { extra: ['button[aria-label*="lose"]'], lateWindowMs: 4000 });
  if (url.startsWith(DEP)) { await page.waitForFunction(() => { const s = [...document.querySelectorAll('main .section')]; return s.length && s.every((x) => x.dataset.sectionStatus === 'loaded') && document.querySelector('footer .footer, footer [data-block-status="loaded"]'); }, null, { timeout: 20000 }).catch(() => console.log('  (deployed decoration did not settle in 20s)')); }
  await sleep(3000); await page.evaluate(PURGE); await page.evaluate((fn) => { window.__purge = new Function(`return (${fn})()`); setInterval(window.__purge, 250); }, PURGE.toString());
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
  await sleep(1500); await page.evaluate(PURGE);
  // fonts: a live capture before the brand faces arrive reports the fallback face as rendered — wait for every declared face that started loading
  await page.waitForFunction(() => [...document.fonts].some((f) => /Roboto/i.test(f.family) && f.status === 'loaded'), null, { timeout: 10000 }).catch(() => console.log('  (corporate face never loaded)'));
  await page.waitForFunction(() => document.fonts.status === 'loaded' && ![...document.fonts].some((f) => f.status === 'loading'), null, { timeout: 10000 }).catch(() => console.log('  (fonts still loading after 10s)'));
  await sleep(500);
  const inv = await page.evaluate(INVENTORY);
  if (process.env.FID_DEBUG) { const tail = await page.evaluate(() => [...document.querySelectorAll('body, body > *, body > * > *, body > * > * > *')].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}#${e.id}.${[...e.classList].slice(0, 2).join('.')} top=${Math.round(r.top + scrollY)} h=${Math.round(r.height)} ${getComputedStyle(e).position} ${getComputedStyle(e).display}`; }).filter((x) => / h=(\d+)/.test(x) && +x.match(/ h=(\d+)/)[1] > 60)); const over = await page.evaluate(() => { const bh = document.body.getBoundingClientRect().bottom + scrollY; return [...document.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom + scrollY > bh + 5 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 8).map((e) => `${e.tagName.toLowerCase()}#${e.id}.${[...e.classList].slice(0, 2).join('.')} top=${Math.round(e.getBoundingClientRect().top + scrollY)} h=${Math.round(e.getBoundingClientRect().height)} ${getComputedStyle(e).position}`); }); console.log(`[debug] ${url}\n  ${tail.join('\n  ')}\n  beyond body: ${over.join(' | ') || 'none'} ; html scrollHeight ${inv.height}`); }
  const shot = PNG.sync.read(await page.screenshot({ fullPage: true, animations: 'disabled' }));
  const st = withStates ? await states(page) : null;
  await ctx.close();
  return { ...inv, hosts: [...hosts].sort(), errors, shot, states: st };
}

const d = (a, b) => Math.abs(a - b);
export function compare(L, D, width, dir) {
  const f = { width, missingText: [], extraText: [], geometry: [], style: [], images: [], icons: [], links: [], dyn: [], bands: [], hosts: [], states: [] };
  // ---- text pairing (by normalised own text, occurrence order)
  const byKey = (arr) => arr.reduce((m, t) => ((m[t.key] ||= []).push(t), m), {});
  const lk = byKey(L.texts); const dk = byKey(D.texts);
  const pairs = [];
  // same text in several places (sub-nav item + breadcrumb + heading): pair same-tag occurrences first, then the rest in order
  for (const [k, ls] of Object.entries(lk)) {
    const ds = [...(dk[k] || [])];
    const rest = [];
    ls.forEach((l) => { const i = ds.findIndex((x) => x.tag === l.tag && x.region === l.region); if (i > -1) pairs.push([l, ds.splice(i, 1)[0]]); else rest.push(l); });
    rest.forEach((l) => (ds.length ? pairs.push([l, ds.shift()]) : f.missingText.push(`${l.region} <${l.tag}> "${k.slice(0, 50)}"`)));
    ds.forEach((x) => f.extraText.push(`${x.region} <${x.tag}> "${k.slice(0, 50)}"`));
  }
  for (const [k, ds] of Object.entries(dk)) { if (!lk[k]) ds.forEach((x) => f.extraText.push(`${x.region} <${x.tag}> "${k.slice(0, 50)}"`)); }
  // wrapper granularity differs (live <p>text <span>note</span></p> vs one flat <p>): a text present inside a block on the other side is merged, not missing
  f.mergedText = [];
  f.missingText = f.missingText.filter((m) => { const k = m.replace(/^.*?"/, '').replace(/"$/, ''); if (D.blockTexts.some((t) => t !== k && t.includes(k))) { f.mergedText.push(m); return false; } return true; });
  f.extraText = f.extraText.filter((m) => { const k = m.replace(/^.*?"/, '').replace(/"$/, ''); if (L.blockTexts.some((t) => t !== k && t.includes(k))) { f.mergedText.push(m); return false; } return true; });
  pairs.sort((a, b) => a[0].box[1] - b[0].box[1]);
  let prev = null; let firstDiv = null;
  for (const [l, x] of pairs) {
    const dt = x.box[1] - l.box[1]; const dl = x.box[0] - l.box[0]; const dw = x.box[2] - l.box[2]; const dh = x.box[3] - l.box[3];
    // gap-to-previous delta → the module that introduced the shift; only meaningful against the previous pair in the SAME column
    // (two-column article layouts otherwise pair a rail item against a body item and report thousands of px)
    const sameCol = prev && Math.abs(prev[0].box[0] - l.box[0]) <= 60 && Math.abs(prev[1].box[0] - x.box[0]) <= 60;
    const local = sameCol ? (x.box[1] - prev[1].box[1]) - (l.box[1] - prev[0].box[1]) : 0;
    if (d(local, 0) > TOL || d(dl, 0) > TOL || d(dw, 0) > TOL || d(dh, 0) > TOL || d(dt, 0) > TOL) {
      f.geometry.push({ region: l.region, tag: l.tag, text: l.key.slice(0, 40), live: l.box, dep: x.box, dTop: dt, local, dLeft: dl, dW: dw, dH: dh });
      if (firstDiv === null && l.region === 'main' && d(local, 0) > 8) firstDiv = `${l.key.slice(0, 40)} (${local > 0 ? '+' : ''}${local})`; // first VERTICAL break in main (width/left deltas are not shifts)
    }
    const sd = [];
    if (l.face.toLowerCase().replace(/[-_ ]/g, '') !== x.face.toLowerCase().replace(/[-_ ]/g, '') && !l.face.startsWith('?') && !x.face.startsWith('?')) sd.push(`face ${l.face}→${x.face}`);
    if (!x.faceLoaded && l.faceLoaded) sd.push(`face not loaded (${x.face})`);
    if (l.size !== x.size) sd.push(`size ${l.size}→${x.size}`);
    if (l.weight !== x.weight) sd.push(`weight ${l.weight}→${x.weight}`);
    const clr = (c) => (/rgba\(.*, 0\)$/.test(c) ? 'transparent' : c);
    if (clr(l.color) !== clr(x.color)) sd.push(`color ${l.color}→${x.color}`);
    if (l.bg && x.bg && clr(l.bg) !== clr(x.bg)) sd.push(`bg ${l.bg}→${x.bg}`);
    if (!/^(a|button|span)$/.test(x.tag) && l.align !== x.align && !(l.align === 'start' && x.align === 'left') && !(l.align === 'left' && x.align === 'start')) sd.push(`align ${l.align}→${x.align}`);
    if (l.transform !== x.transform) sd.push(`transform ${l.transform}→${x.transform}`);
    if (sd.length) f.style.push({ region: l.region, tag: l.tag, text: l.key.slice(0, 40), diffs: sd, live: l.box, dep: x.box });
    prev = [l, x];
  }
  f.pairs = pairs.length; f.firstDivergence = firstDiv;
  // ---- images
  const li = byKey(L.images); const di = byKey(D.images);
  const usedD = new Set(); const near = (l) => D.images.find((x) => !usedD.has(x) && !(di[x.key] || []).some((y) => li[y.key]) && Math.abs(x.box[1] - l.box[1]) <= 40 && Math.abs(x.box[0] - l.box[0]) <= 40 && Math.abs(x.box[2] - l.box[2]) <= 40 && Math.abs(x.box[3] - l.box[3]) <= 40);
  for (const [k, ls] of Object.entries(li)) { const ds = di[k] || []; ls.forEach((l, i) => { let x = ds[i]; if (!x) { x = near(l); if (x) { usedD.add(x); f.imagesPairedByBox = (f.imagesPairedByBox || 0) + 1; return; } } if (!x) f.images.push(`missing on deployed: "${k.slice(0, 40)}"`); else { if (!x.loaded) f.images.push(`BROKEN on deployed: "${k.slice(0, 40)}" ${x.src}`); else if (!x.rendered) f.images.push(`zero-size on deployed: "${k.slice(0, 40)}"`); if (d(l.box[2], x.box[2]) > TOL || d(l.box[3], x.box[3]) > TOL) f.images.push(`size "${k.slice(0, 30)}" live ${l.box[2]}×${l.box[3]} dep ${x.box[2]}×${x.box[3]}`); if (l.ratio && x.ratio && d(l.ratio, x.ratio) > 0.05) f.images.push(`aspect "${k.slice(0, 30)}" ${l.ratio}→${x.ratio}`); } }); }
  for (const [k, ds] of Object.entries(di)) { const n = (li[k] || []).length; ds.slice(n).forEach((x) => { if (usedD.has(x)) return; f.images.push(`extra on deployed: "${k.slice(0, 40)}" ${x.loaded ? '' : 'BROKEN'}`); }); }
  D.images.filter((x) => !x.loaded).forEach((x) => { if (!f.images.some((s) => s.includes(x.src))) f.images.push(`BROKEN on deployed: ${x.src}`); });
  // ---- icons
  if (L.icons.length !== D.icons.length) f.icons.push(`count live ${L.icons.length} dep ${D.icons.length}`);
  D.icons.filter((i) => !i.loaded).forEach((i) => f.icons.push(`glyph font not loaded: .${i.cls} (${i.face})`));
  // ---- external links
  const lh = new Map(L.links.map((l) => [l.href, l]));
  for (const x of D.links) { const l = lh.get(x.href); if (l && l.target !== x.target) f.links.push(`${x.href.slice(0, 50)} target live "${l.target}" dep "${x.target}"`); }
  f.linkPairs = D.links.filter((x) => lh.has(x.href)).length;
  // ---- dynamics
  if (L.dyn.video !== D.dyn.video) f.dyn.push(`video elements live ${L.dyn.video} dep ${D.dyn.video}`);
  if (L.dyn.iframe !== D.dyn.iframe) f.dyn.push(`iframes live ${L.dyn.iframe} dep ${D.dyn.iframe}`);
  if (L.dyn.sprinklr.length || D.dyn.sprinklr.length) { const lk2 = L.dyn.sprinklr.map((s) => `${s.kids} nodes/${s.h}px`).join(', ') || 'none'; const dk2 = D.dyn.sprinklr.map((s) => `${s.kids} nodes/${s.h}px`).join(', ') || 'none'; if (lk2 !== dk2) f.dyn.push(`sprinklr gallery live [${lk2}] dep [${dk2}]`); }
  if (L.dyn.onetrust !== D.dyn.onetrust) f.dyn.push(`onetrust live ${L.dyn.onetrust} dep ${D.dyn.onetrust}`);
  if (D.errors.length) f.dyn.push(`page errors on deployed: ${D.errors.join(' | ')}`);
  const NOISE = /weborama|crwdcntrl|tidaltv|sc-static|gstatic|adoberesources|amazonaws|kargo|loopme|mediaplex|eyeota|smaato|media\.net|cognito|rum\.hlx|doubleclick|google|facebook|bing|tiktok|demdex|omtrdc|adobedtm|adsrvr|criteo|linkedin|pinterest|snapchat|scorecard|hotjar|krxd|rubicon|quantserve|yahoo|3lift|casalemedia|pubmatic|openx|taboola|outbrain|liadm|rlcdn|agkn|bluekai|everesttech|adnxs|amazon-adsystem|smartadserver|tapad|dotomi|clarity|onetrust|cookielaw|synopsys\.com|aem\.page|aem\.live|jsdelivr|coveo|marketo|mktoresp|demandbase|6sense|qualtrics|munchkin|openai|fontawesome|cloudflareinsights|licdn|usbrowserspeed|newscred|bttrack|d41\.co|drift|zoominfo|hubspot|contentsquare|brightcove|boltdns|zencdn|vimeo|youtube|ytimg|akamai|cloudfront|maze\.co|crazyegg|stackadapt|intentsify|experience\.adobe|bidr\.io|adsymptotic|rfihub|dpm\.demdex|tealium|segment|mixpanel|optimizely/;
  f.hosts = L.hosts.filter((h) => !D.hosts.includes(h) && !NOISE.test(h));
  f.heights = [L.height, D.height];
  // ---- per-band pixel crops between consecutive paired headings
  const anchors = pairs.filter(([l]) => /^h[1-4]$/.test(l.tag) && l.region === 'main');
  const cutsL = [0, ...anchors.map(([l]) => l.box[1]), L.shot.height]; const cutsD = [0, ...anchors.map(([, x]) => x.box[1]), D.shot.height];
  const labels = ['(top → first heading)', ...anchors.map(([l]) => l.key.slice(0, 40))];
  for (let i = 0; i < labels.length; i += 1) {
    const hL = cutsL[i + 1] - cutsL[i]; const hD = cutsD[i + 1] - cutsD[i]; const h = Math.min(hL, hD); if (h < 8 || hL <= 0 || hD <= 0) continue;
    const w = Math.min(L.shot.width, D.shot.width);
    const crop = (png, y0) => { const out = new PNG({ width: w, height: h }); PNG.bitblt(png, out, 0, Math.min(y0, png.height - h), w, h, 0, 0); return out; };
    const a = crop(L.shot, cutsL[i]); const b = crop(D.shot, cutsD[i]); const diff = new PNG({ width: w, height: h });
    const n = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 });
    const pct = +(100 * n / (w * h)).toFixed(2);
    const rec = { band: i, label: labels[i], liveH: hL, depH: hD, pct };
    if (pct > 2 || d(hL, hD) > TOL) { rec.flag = true; mkdirSync(dir, { recursive: true }); const side = new PNG({ width: w * 3, height: h }); PNG.bitblt(a, side, 0, 0, w, h, 0, 0); PNG.bitblt(b, side, 0, 0, w, h, w, 0); PNG.bitblt(diff, side, 0, 0, w, h, 2 * w, 0); rec.png = `${dir}/band-${i}.png`; writeFileSync(rec.png, PNG.sync.write(side)); }
    f.bands.push(rec);
  }
  // ---- states
  if (L.states && D.states) {
    const ls = L.states.submenu; const ds = D.states.submenu;
    if (typeof ls === 'object' && typeof ds === 'object' && ls && ds) { if (ls.items !== ds.items) f.states.push(`submenu items live ${ls.items} dep ${ds.items}`); if (ls.size !== ds.size || ls.lh !== ds.lh) f.states.push(`submenu type live ${ls.size}/${ls.lh} dep ${ds.size}/${ds.lh}`); if (ls.face !== ds.face) f.states.push(`submenu face ${ls.face}→${ds.face}`); if (ls.staysOpenOnTraverse !== ds.staysOpenOnTraverse) f.states.push(`submenu stays open on traverse: live ${ls.staysOpenOnTraverse} dep ${ds.staysOpenOnTraverse}`); if (d(ls.first[0], ds.first[0]) > TOL || d(ls.first[1], ds.first[1]) > TOL) f.states.push(`submenu first item pos live ${ls.first.slice(0, 2)} dep ${ds.first.slice(0, 2)}`); } else if (ls !== ds) f.states.push(`submenu live ${JSON.stringify(ls)} dep ${JSON.stringify(ds)}`);
    if (L.states.play !== D.states.play) f.states.push(`play: live "${L.states.play}" dep "${D.states.play}"`);
    f.stateEvidence = { live: L.states, dep: D.states };
  }
  return f;
}

