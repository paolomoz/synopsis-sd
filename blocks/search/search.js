/**
 * search — site search over /query-index.json (source: /search.html, Coveo-backed: dark "Search Synopsys.com"
 * band with the query box, content-type facet on the left, results with type badge · title · url · description · tags).
 * Query in ?q=, content type in ?type=. All tokens must match (title, description, tags, path); falls back to any.
 * Authored h1 is MOVED into the band (EW1); the input and results are generated.
 */
import { getIndex, splitList, byDateDesc, categoryPath, familyOf } from '../../scripts/index.js';

const PAGE = 10;
const TYPE_LABEL = { article: 'Article', glossary: 'Glossary', program: 'Product Page', static: 'Page', listing: 'Listing', form: 'Form', author: 'Author', landing: 'Home' };
const label = (t) => TYPE_LABEL[t] || 'Page';
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const tokens = (q) => norm(q).split(/[^a-z0-9+.-]+/).filter((t) => t.length > 1);

function score(row, toks) {
  const title = norm(row.title); const desc = norm(row.description); const tags = norm(splitList(row.tags).join(' ')); const path = norm(row.path);
  let total = 0; let matched = 0;
  toks.forEach((t) => {
    let s = 0;
    if (title.includes(t)) s += 3;
    if (tags.includes(t)) s += 2;
    if (desc.includes(t)) s += 1;
    if (path.includes(t)) s += 1;
    if (s) matched += 1;
    total += s;
  });
  return { total, matched };
}

function rank(rows, q) {
  const toks = tokens(q);
  if (!toks.length) return [];
  const scored = rows.map((r) => ({ r, ...score(r, toks) })).filter((x) => x.matched);
  const all = scored.filter((x) => x.matched === toks.length);
  return (all.length ? all : scored).sort((a, b) => b.total - a.total || byDateDesc(a.r, b.r)).map((x) => x.r);
}

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

function resultItem(row) {
  const li = el('li', 'search-result');
  li.append(el('span', 'search-result-type', label(row.template)));
  const h3 = el('h3'); const a = el('a'); a.href = row.path; a.textContent = row.title || row.path; h3.append(a); li.append(h3);
  li.append(el('p', 'search-result-url', `${window.location.origin}${row.path}`));
  if (row.description) li.append(el('p', 'search-result-desc', row.description));
  const tags = splitList(row.tags);
  if (tags.length) {
    const p = el('p', 'search-result-tags'); p.append(el('strong', '', 'Tags: '));
    tags.forEach((t, i) => { const href = categoryPath(familyOf(row.path) || 'articles', t); if (href) { const ta = el('a', '', t); ta.href = href; p.append(ta); } else p.append(t); if (i < tags.length - 1) p.append(', '); });
    li.append(p);
  }
  return li;
}

export default async function decorate(block) {
  const authored = [...block.querySelectorAll('h1, h2')];
  const band = el('div', 'search-band');
  const inner = el('div', 'search-band-inner');
  const heading = authored[0] || el('h1', '', 'Search Synopsys.com');
  inner.append(heading);
  const form = el('form', 'search-form'); form.setAttribute('role', 'search'); form.action = window.location.pathname; form.method = 'get';
  const input = el('input'); input.type = 'search'; input.name = 'q'; input.placeholder = 'Search'; input.setAttribute('aria-label', 'Search Synopsys.com');
  form.append(input); inner.append(form); band.append(inner);
  const body = el('div', 'search-body');
  const facets = el('aside', 'search-facets');
  const main = el('div', 'search-main');
  const summary = el('p', 'search-summary');
  const list = el('ul', 'search-results');
  const more = el('button', 'search-more button secondary', 'Load more'); more.type = 'button'; more.hidden = true;
  main.append(summary, list, more); body.append(facets, main);
  block.replaceChildren(band, body);

  const params = new URLSearchParams(window.location.search);
  let q = params.get('q') || ''; let type = params.get('type') || '';
  input.value = q;
  let rows = null; let hits = []; let shown = 0;

  const render = () => {
    list.replaceChildren(); shown = 0; facets.replaceChildren();
    if (!tokens(q).length) { summary.textContent = 'Enter a search term to find products, articles, blogs and glossary entries.'; more.hidden = true; block.dataset.results = '0'; return; }
    const ranked = rank(rows, q);
    const counts = new Map();
    ranked.forEach((r) => counts.set(r.template || 'static', (counts.get(r.template || 'static') || 0) + 1));
    hits = type ? ranked.filter((r) => (r.template || 'static') === type) : ranked;
    block.dataset.results = String(hits.length);
    const fh = el('h2', 'search-facet-title', 'Content type'); facets.append(fh);
    const ul = el('ul', 'search-facet');
    const mk = (key, name, n) => { const li = el('li'); const b = el('button', key === type ? 'is-active' : '', ''); b.type = 'button'; b.append(el('span', '', name), el('span', 'search-facet-count', String(n))); b.addEventListener('click', () => { type = type === key ? '' : key; const u = new URL(window.location.href); if (type) u.searchParams.set('type', type); else u.searchParams.delete('type'); window.history.replaceState({}, '', u); render(); }); li.append(b); ul.append(li); };
    [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => mk(k, label(k), n));
    facets.append(ul);
    const append = () => {
      hits.slice(shown, shown + PAGE).forEach((r) => list.append(resultItem(r)));
      shown = Math.min(shown + PAGE, hits.length);
      summary.textContent = hits.length ? `Results 1-${shown} of ${hits.length.toLocaleString()} for “${q}”` : `No results for “${q}”`;
      more.hidden = shown >= hits.length;
    };
    more.onclick = append; append();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault(); q = input.value.trim(); type = '';
    const u = new URL(window.location.href); u.searchParams.set('q', q); u.searchParams.delete('type'); window.history.pushState({}, '', u); render();
  });
  summary.textContent = 'Loading…';
  try { rows = (await getIndex()).filter((r) => !/\/category-/.test(r.path) && r.path !== window.location.pathname); } catch (e) { summary.textContent = 'Search is unavailable right now.'; return; }
  render();
}
