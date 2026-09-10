/**
 * index.js — client for /query-index.json (built by the config-service index definition, see
 * stardust/query.yaml). Fetches all sheets pages once per session, caches in memory + sessionStorage.
 * Rows: { path, title, description, image, template, author, published, publishedTs, readtime, category, tags, lastModified }.
 */
const INDEX_URL = '/query-index.json';
const PAGE = 1000;
let cache = null;

async function fetchAll() {
  const key = 'synopsis:query-index';
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) { const parsed = JSON.parse(hit); if (Date.now() - parsed.t < 15 * 60 * 1000) return parsed.data; }
  } catch (e) { /* storage unavailable */ }
  const rows = [];
  let offset = 0; let total = Infinity;
  while (offset < total) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`${INDEX_URL}?offset=${offset}&limit=${PAGE}`);
    if (!res.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await res.json();
    total = json.total || 0;
    rows.push(...(json.data || []));
    offset += PAGE;
    if (!json.data || !json.data.length) break;
  }
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data: rows })); } catch (e) { /* quota */ }
  return rows;
}

export async function getIndex() {
  if (!cache) cache = fetchAll();
  return cache;
}

export const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const splitList = (s) => String(s || '').split(/,\s*/).map((x) => x.trim()).filter(Boolean);
export const isArticle = (row) => /^(article|glossary|listing)$/.test(row.template || '') || /^\/(blogs|articles|glossary)\//.test(row.path);
export const byDateDesc = (a, b) => (Number(b.publishedTs) || 0) - (Number(a.publishedTs) || 0);

/** family of a path: blogs | articles | glossary */
export function familyOf(path) {
  if (path.startsWith('/blogs/')) return 'blogs';
  if (path.startsWith('/articles')) return 'articles';
  if (path.startsWith('/glossary')) return 'glossary';
  return '';
}

/** rows that share at least one tag with `tags` (array), excluding `selfPath` */
export function related(rows, tags, selfPath, limit = 6) {
  const want = new Set(tags.map(slugify));
  return rows
    .filter((r) => r.path !== selfPath && isArticle(r) && splitList(r.tags).some((t) => want.has(slugify(t))))
    .map((r) => ({ r, score: splitList(r.tags).filter((t) => want.has(slugify(t))).length }))
    .sort((a, b) => b.score - a.score || byDateDesc(a.r, b.r))
    .slice(0, limit)
    .map((x) => x.r);
}

/** build a blog-style card cell (same markup the importer authors) from an index row */
export function cardMarkup(row, opts = {}) {
  const meta = [row.readtime, row.published].filter(Boolean).join(' / ');
  const label = (row.category || '').split(' / ')[0];
  const tags = splitList(row.tags);
  const img = row.image && !row.image.includes('synopsys-purple-bkgd-logo-social') ? `<picture><img src="${row.image}" alt="" loading="lazy"></picture>` : '';
  return `${img ? `<div>${img}</div>` : ''}<div>${label && opts.label !== false ? `<p><strong>${label}</strong></p>` : ''}${meta ? `<p>${meta}</p>` : ''}<h3><a href="${row.path}">${row.title.replace(/\s*\|\s*Synopsys.*$/, '')}</a></h3>${row.author ? `<p>By ${row.author}</p>` : ''}${tags.length ? `<p>Tags: ${tags.map((t) => `<a href="/${familyOf(row.path) === 'blogs' ? 'blogs/chip-design' : 'articles'}/category-${slugify(t)}">${t}</a>`).join(', ')}</p>` : ''}<p><a href="${row.path}">Read Article</a></p></div>`;
}
