/**
 * listing — index-fed post list (source: .cmp-blogsdev categoryPage / most-recent feeds, JS-paged).
 * Authored rows (the server-rendered snapshot) are shown until /query-index.json answers, then replaced.
 * Filter: on /<family>/category-<slug> pages the tag(s) come from the page h1 ("HPC, Data Center") with the URL slug
 * as fallback (source slugs drop spaces: category-verificationip); compared on tagKey. /articles, /glossary → every
 * post of that family. Pages of 12, "Load more".
 */
import { getIndex, tagKey, splitList, byDateDesc, familyOf, cardMarkup } from '../../scripts/index.js';

const PAGE = 12;

function renderRows(block, rows) {
  const ul = document.createElement('ul');
  ul.className = 'listing-items';
  rows.forEach((row) => {
    const li = document.createElement('li');
    li.innerHTML = cardMarkup(row);
    [...li.children].forEach((div) => { div.className = div.querySelector('picture') && !div.textContent.trim() ? 'listing-item-image' : 'listing-item-body'; });
    ul.append(li);
  });
  return ul;
}

function decorateAuthored(block) {
  const ul = document.createElement('ul');
  ul.className = 'listing-items';
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => { div.className = div.querySelector('picture, img') && !div.textContent.trim() ? 'listing-item-image' : 'listing-item-body'; });
    ul.append(li);
  });
  return ul;
}

export default async function decorate(block) {
  const authored = decorateAuthored(block);
  block.replaceChildren(authored);
  const path = window.location.pathname;
  const family = familyOf(path) || (path.startsWith('/blogs') ? 'blogs' : '');
  const m = path.match(/category-([a-z0-9-]+)$/);
  const wanted = new Set();
  if (m) {
    const h1 = (document.querySelector('main h1')?.textContent || '').trim();
    splitList(h1).map(tagKey).filter(Boolean).forEach((k) => wanted.add(k));
    wanted.add(tagKey(m[1]));
  }
  let rows;
  try {
    const all = await getIndex();
    rows = all
      .filter((r) => r.template !== 'listing' && r.template !== 'author' && !/category-/.test(r.path))
      .filter((r) => (family ? familyOf(r.path) === family : /^\/(blogs|articles|glossary)\//.test(r.path)))
      .filter((r) => (wanted.size ? splitList(r.tags).some((t) => wanted.has(tagKey(t))) : true))
      .sort(byDateDesc);
  } catch (e) { return; }
  if (!rows.length) return;
  block.dataset.total = String(rows.length);
  let shown = 0;
  const list = document.createElement('ul');
  list.className = 'listing-items';
  const more = document.createElement('button');
  more.type = 'button'; more.className = 'listing-more button secondary'; more.textContent = 'Load more';
  const count = document.createElement('p'); count.className = 'listing-count';
  const append = () => {
    const chunk = rows.slice(shown, shown + PAGE);
    [...renderRows(block, chunk).children].forEach((li) => list.append(li));
    shown += chunk.length;
    count.textContent = `Showing ${shown} of ${rows.length}`;
    more.hidden = shown >= rows.length;
  };
  more.addEventListener('click', append);
  block.replaceChildren(list, count, more);
  append();
}
