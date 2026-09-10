/**
 * spotlight — framed callout (source: .component-spotlight.spotlight-header-indented, glossary "Definition").
 * Rows: [title] [body…]. The title is moved into a header that sits on the top border (EW1: moves only).
 */
export default function decorate(block) {
  const rows = [...block.children];
  const title = rows.shift();
  if (title) {
    title.className = 'spotlight-title';
    const h = title.querySelector('h1, h2, h3, h4, p');
    if (h && h.tagName === 'P') { const s = document.createElement('span'); s.append(...h.childNodes); h.replaceWith(s); }
  }
  rows.forEach((r) => { r.className = 'spotlight-body'; });
}
