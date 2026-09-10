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
  // the author archive is a paged feed on the source; list every indexed post by this author
  const name = (document.querySelector('.author .author-name h2, .author .author-name h1, .author h2')?.textContent || '').trim();
  if (!name) return;
  try {
    const { getIndex, byDateDesc, cardMarkup } = await import('../../scripts/index.js');
    const rows = (await getIndex()).filter((r) => (r.author || '').split(/,\s*/).includes(name)).sort(byDateDesc);
    const authored = block.querySelectorAll(':scope > ul > li').length;
    if (rows.length <= authored) return;
    const ul = document.createElement('ul');
    rows.forEach((r) => { const li = document.createElement('li'); li.innerHTML = cardMarkup(r); [...li.children].forEach((d) => { d.className = d.querySelector('picture') && !d.textContent.trim() ? 'cards-card-image' : 'cards-card-body'; }); const last = li.querySelector('.cards-card-body > p:last-child'); if (last) last.classList.add('cards-card-cta'); ul.append(li); });
    block.replaceChildren(ul);
    block.dataset.indexed = String(rows.length);
  } catch (e) { /* index unavailable: keep authored rows */ }
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
  block.replaceChildren(ul);
}
