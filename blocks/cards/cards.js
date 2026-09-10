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
export default async function decorate(block) {
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
