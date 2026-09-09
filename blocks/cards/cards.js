/**
 * cards — Block Collection cards; the `benefits` variant is synopsys.com's "Key Benefits"
 * tile row (purple line icon + title, 3-up).
 *
 * Authoring: one row per card — cell 1: <img>/<picture> icon, cell 2: <p>Title</p>.
 * Both cells are MOVED into the list item (EW1); no picture re-creation for SVG icons
 * (the media pipeline's raster renditions would break a vector).
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
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => { img.setAttribute('loading', 'lazy'); });
  block.replaceChildren(ul);
}
