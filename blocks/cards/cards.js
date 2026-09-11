/**
 * cards — Block Collection cards with synopsys.com variants:
 *   benefits  icon + title tiles (3-up)                rows: [img][p title (+ p desc)]
 *   asset     resource cards (type chip, title, link)  rows: [img?][p strong type · h3 · p · p a]
 *   blog      image cards (date/read · h3 a · By … · Tags · cta)
 *   news      content tiles (image left, type · title · date)
 *   pillars   4-up image tiles with overlay label      rows: [img][h3 · p · p a]
 *   people    portrait grid (photo · h3 name · role · links)
 *   tiles     generic default-content tiles
 *   rail      right-rail flag cards
 * Every authored element is MOVED (EW1); the card is a link when its body carries exactly one link
 * and the variant is tile-like (pillars/news) — the inner anchor is unwrapped (EW6).
 */
async function enrichAuthor(block) {
  // the author archive is a paged feed on the source; list every indexed post by this author, merged with the
  // authored rows (the server-rendered snapshot also lists non-article pages such as webinars) — union by path, newest first
  const name = (document.querySelector('.author .author-name h2, .author .author-name h1, .author h2')?.textContent || '').trim();
  if (!name) return;
  // snapshot the authored rows synchronously: decorate() moves them into <li>s as soon as this function yields
  const authoredRows = [...block.querySelectorAll(':scope > div')].map((row) => ({ href: row.querySelector('h3 a, a[href]')?.getAttribute('href') || '', text: row.textContent, html: row.innerHTML }));
  try {
    const { getIndex, cardMarkup } = await import('../../scripts/index.js');
    const rows = (await getIndex()).filter((r) => (r.author || '').split(/,\s*/).includes(name));
    if (!rows.length) return;
    // authored rows win for the paths they cover: the source card title is a CMS field (glossary rows use the short
    // "What is X?" form, not the page title the index carries); the index only adds posts the snapshot did not list
    const seen = new Set();
    const items = [];
    authoredRows.forEach((row) => {
      const path = row.href.replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0];
      if (!path || seen.has(path)) return;
      seen.add(path);
      const m = row.text.match(/\b([A-Z][a-z]{2} \d{1,2}, \d{4})\b/);
      items.push({ ts: m ? Date.parse(m[1]) / 1000 : 0, html: row.html });
    });
    rows.forEach((r) => { if (seen.has(r.path)) return; seen.add(r.path); items.push({ ts: Number(r.publishedTs) || 0, html: cardMarkup(r) }); });
    items.sort((a, b) => b.ts - a.ts);
    const ul = document.createElement('ul');
    items.forEach((it) => { const li = document.createElement('li'); li.innerHTML = it.html; [...li.children].forEach((d) => { d.className = d.querySelector('picture, img') && !d.textContent.trim() ? 'cards-card-image' : 'cards-card-body'; }); const last = li.querySelector('.cards-card-body > p:last-child'); const lastA = last && last.querySelector('a'); if (lastA && last.textContent.trim() === lastA.textContent.trim()) last.classList.add('cards-card-cta'); /* a lone link is a CTA; the source's trailing "Tags: …" line is not */ ul.append(li); });
    ul.querySelectorAll('li').forEach(shapeAuthorRow);
    block.replaceChildren(ul);
    block.dataset.indexed = String(rows.length); block.dataset.total = String(items.length);
  } catch (e) { /* index unavailable: keep authored rows */ }
}

function shapeAuthorRow(li) {
  // source .cmp-blogsdev__mra-item-container: thumb + date/read-time on the left, label · title · byline · tags on the right (no CTA)
  const img = li.querySelector('.cards-card-image'); const body = li.querySelector('.cards-card-body');
  if (!img || !body) return;
  const meta = [...body.querislectorAll?.('x') || body.querySelectorAll('p')].find((p) => /\bmin read\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b \d{1,2}, \d{4}/.test(p.textContent) && !p.querySelector('a'));
  if (meta) { meta.className = 'cards-card-meta'; img.append(meta); }
  const cta = body.querySelector('.cards-card-cta'); if (cta) cta.remove();
}

export default async function decorate(block) {
  if (block.classList.contains('author')) enrichAuthor(block);
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      const media = div.querySelector('picture, img');
      if (media && div.textContent.trim() === '') div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    // chip: a leading <p><strong>…</strong></p> in the body
    const body = li.querySelector('.cards-card-body');
    if (body) {
      const first = body.querySelector(':scope > p:first-child');
      if (first && first.children.length === 1 && first.firstElementChild.tagName === 'STRONG' && first.textContent.trim().length < 40) first.parentElement.insertBefore(Object.assign(document.createElement('div'), { className: 'cards-card-label' }), first).append(first);
      const links = [...body.querySelectorAll('a')];
      const last = links[links.length - 1];
      if (last && last.closest('p') && last.closest('p') === body.lastElementChild) last.closest('p').classList.add('cards-card-cta');
    }
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => { img.setAttribute('loading', 'lazy'); });
  if (block.classList.contains('author')) ul.querySelectorAll('li').forEach(shapeAuthorRow);
  block.replaceChildren(ul);
}
