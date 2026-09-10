/**
 * logos — partner logo row (source: .cmp-logo-carousel). Rows: one image (optionally linked) per row.
 */
export default async function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const pic = row.querySelector('picture, img');
    const link = row.querySelector('a');
    if (link && pic) { link.replaceChildren(pic); li.append(link); } else if (pic) li.append(pic);
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => { img.setAttribute('loading', 'lazy'); });
  block.replaceChildren(ul);
}
