/**
 * quote — customer quote (source: .component-quote). Rows: [p quote · p attribution] [img logo]?
 * Authored paragraphs move into the quote figure (EW1).
 */
export default async function decorate(block) {
  const fig = document.createElement('figure');
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const text = cells.find((c) => !c.querySelector('img') || c.textContent.trim());
  const media = cells.find((c) => c.querySelector('picture, img') && !c.textContent.trim());
  if (text) {
    const ps = [...text.querySelectorAll('p')];
    const q = document.createElement('blockquote');
    if (ps[0]) q.append(ps[0]);
    fig.append(q);
    const cap = document.createElement('figcaption');
    ps.slice(1).forEach((p) => cap.append(p));
    if (cap.children.length) fig.append(cap);
  }
  if (media) { const m = document.createElement('div'); m.className = 'quote-logo'; m.append(media.querySelector('picture, img')); fig.append(m); }
  block.replaceChildren(fig);
}
