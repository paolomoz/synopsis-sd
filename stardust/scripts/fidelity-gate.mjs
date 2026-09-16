// fidelity-gate — run the live-vs-deployed parity instrument over a page list; per-page JSON + ranked summary.
// usage: node stardust/scripts/fidelity-gate.mjs (--paths list.txt | --sample sample.json) [--map stardust/path-map.json] [--widths 1440,360] [--concurrency 3] [--out qa/fidelity/roundN] [--resume]
// synopsys: live URLs differ from EDS paths (.html suffix, DesignWare php) → resolved through path-map.json; the sample file is [[template, path, liveUrl], ...]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { LIVE, DEP, slug, capture, compare } from './fidelity-core.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('--out', 'qa/fidelity'); const WIDTHS = arg('--widths', '1440,360,1920').split(',').map(Number); const CONC = +arg('--concurrency', 2); /* synopsys.com closes connections above ~2 parallel sessions */ const RESUME = process.argv.includes('--resume');
const MAP = JSON.parse(readFileSync(arg('--map', 'stardust/path-map.json'), 'utf8'));
const sample = arg('--sample') ? JSON.parse(readFileSync(arg('--sample'), 'utf8')) : null;
const paths = sample ? sample.map((s) => s[1]) : arg('--paths') ? readFileSync(arg('--paths'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : process.argv.slice(2).filter((a) => a.startsWith('/'));
const templateOf = (p) => (sample ? sample.find((s) => s[1] === p)?.[0] : MAP[p]?.template) || '?';
const liveOf = (p) => (sample ? sample.find((s) => s[1] === p)?.[2] : MAP[p]?.live) || `${LIVE}${p}.html`;
mkdirSync(`${OUT}/pages`, { recursive: true });
const depOf = (p) => `${DEP}${p === '/index' ? '/' : p}`;

function classify(f) {
  // deterministic severity: what would block a page from shipping
  const mainGeo = f.geometry.filter((g) => g.region === 'main' && Math.abs(g.local) > 8);
  const styleHard = f.style.filter((s) => s.diffs.some((x) => /^(face|size|weight|color|bg|transform)/.test(x)));
  const errors = [];
  const mainMissing = f.missingText.filter((m) => !m.startsWith('footer') && !m.startsWith('header')); const chromeMissing = f.missingText.length - mainMissing.length;
  if (mainMissing.length) errors.push(`missing text ×${mainMissing.length}`);
  if (f.images.some((i) => /BROKEN|zero-size/.test(i))) errors.push(`broken images ×${f.images.filter((i) => /BROKEN|zero-size/.test(i)).length}`);
  if (Math.abs(f.heights[0] - f.heights[1]) > 16) errors.push(`height Δ ${f.heights[1] - f.heights[0]}`);
  if (mainGeo.length) errors.push(`geometry ×${mainGeo.length} (first: ${f.firstDivergence})`);
  if (styleHard.length) errors.push(`style ×${styleHard.length}`);
  if (f.dyn.some((x) => /sprinklr|video/.test(x))) errors.push('dynamics'); // iframe counts are tag/consent noise, reported but not graded
  const warns = [];
  if (f.extraText.length) warns.push(`extra text ×${f.extraText.length}`);
  if (chromeMissing) warns.push(`chrome text ×${chromeMissing}`);
  if (f.images.some((i) => /missing|extra|size|aspect/.test(i))) warns.push(`images ×${f.images.length}`);
  if (f.bands.some((b) => b.flag && b.pct > 5)) warns.push(`bands >5% ×${f.bands.filter((b) => b.flag && b.pct > 5).length}`);
  if (f.states && f.states.length) warns.push(`states ×${f.states.length}`);
  if (f.hosts.length) warns.push(`live-only hosts ×${f.hosts.length}`);
  if (f.dyn.some((x) => /page errors/.test(x))) warns.push('page errors');
  if (f.mergedText && f.mergedText.length) warns.push(`merged text ×${f.mergedText.length}`);
  return { errors, warns };
}

const browser = await chromium.launch();
const queue = [...paths]; const results = {};
const t0 = Date.now();
async function worker() {
  while (queue.length) {
    const p = queue.shift(); const s = slug(p); const file = `${OUT}/pages/${s}.json`;
    if (RESUME && existsSync(file)) { results[p] = JSON.parse(readFileSync(file, 'utf8')); continue; }
    const rec = { path: p, template: templateOf(p), widths: {}, error: null };
    for (const w of WIDTHS) {
      try {
        const once = () => Promise.all([capture(browser, liveOf(p), w, w === 1440), capture(browser, depOf(p), w, w === 1440)]);
        const [L, D] = await once().catch(async (e) => { if (/TIMED_OUT|CONNECTION_CLOSED|Timeout/.test(String(e))) { await new Promise((r) => setTimeout(r, 8000)); return once(); } throw e; }); // one retry on transport errors (live bot management, slow origin)
        const f = compare(L, D, w, `${OUT}/crops/${s}-${w}`);
        delete f.stateEvidence; rec.widths[w] = { ...f, ...classify(f) };
      } catch (e) {
        rec.widths[w] = { error: String(e.message || e).slice(0, 200), status: e.status || null };
        if (e.name === 'LiveHTTPError' || e.status) { rec.error = `HTTP ${e.status || '?'}: ${String(e.message).slice(0, 120)}`; break; }
      }
    }
    results[p] = rec; writeFileSync(file, JSON.stringify(rec, null, 1));
    const errs = Object.values(rec.widths).flatMap((x) => x.errors || []); const done = Object.keys(results).length;
    appendFileSync(`${OUT}/progress.log`, `${new Date().toISOString()} ${done}/${paths.length} ${p} ${rec.error ? 'ERR ' + rec.error : errs.length ? 'FAIL ' + errs.join('; ') : 'ok'}\n`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
await browser.close();

// ---- summary
const rows = paths.map((p) => { const r = results[p]; if (!r) return null; const errs = [...new Set(Object.entries(r.widths).flatMap(([w, x]) => (x.errors || []).map((e) => `@${w} ${e}`)))]; const warns = [...new Set(Object.entries(r.widths).flatMap(([w, x]) => (x.warns || []).map((e) => `@${w} ${e}`)))]; return { path: p, status: (r.error || Object.values(r.widths).some((x) => x.error)) ? 'unavailable' : errs.length ? 'fail' : warns.length ? 'warn' : 'pass', errs, warns, note: r.error }; }).filter(Boolean);
const count = (s) => rows.filter((r) => r.status === s).length;
const md = [`# Fidelity gate — ${rows.length} pages, widths ${WIDTHS.join('/')}, ${Math.round((Date.now() - t0) / 60000)} min`, '', `pass ${count('pass')} · warn ${count('warn')} · fail ${count('fail')} · unavailable ${count('unavailable')}`, '', '## Failures', ...rows.filter((r) => r.status === 'fail').map((r) => `- \`${r.path}\` — ${r.errs.join('; ')}`), '', '## Unavailable (live or deployed did not serve the page)', ...rows.filter((r) => r.status === 'unavailable').map((r) => `- \`${r.path}\` — ${r.note}`), '', '## Warnings only', ...rows.filter((r) => r.status === 'warn').map((r) => `- \`${r.path}\` — ${r.warns.join('; ')}`)];
const cls = {}; for (const r of rows) { for (const e of [...r.errs, ...r.warns]) { const k = e.replace(/^@\d+ /, '').replace(/ ×\d+.*| \(first:.*| -?\d+$/, ''); (cls[k] ||= { pages: 0, byT: {} }); cls[k].pages += 1; cls[k].byT[results[r.path].template] = (cls[k].byT[results[r.path].template] || 0) + 1; } }
md.push('', '## Finding classes ranked by pages affected', ...Object.entries(cls).sort((a, b) => b[1].pages - a[1].pages).map(([k, v]) => `- **${k}** — ${v.pages} pages (${Object.entries(v.byT).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ')})`));
const byT = {}; for (const r of rows) { const t = results[r.path].template; (byT[t] ||= { pass: 0, warn: 0, fail: 0, unavailable: 0 })[r.status] += 1; }
md.push('', '## By template', '| template | pass | warn | fail | unavailable |', '|---|---|---|---|---|', ...Object.entries(byT).map(([t, v]) => `| ${t} | ${v.pass} | ${v.warn} | ${v.fail} | ${v.unavailable} |`));
writeFileSync(`${OUT}/summary.md`, md.join('\n')); writeFileSync(`${OUT}/summary.json`, JSON.stringify(rows, null, 1));
console.log(md.slice(0, 3).join('\n'));
