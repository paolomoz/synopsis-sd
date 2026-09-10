/**
 * toc — article table of contents (source: .table-of-contents-article-layout). Authored row: the
 * "Table of Contents" label. The list is generated from the page's <h2>s at decorate time
 * (ids assigned when missing). @ew-exempt <p> label — rendered as the list heading
 */
export default async function decorate(block) {
  const label = block.textContent.trim() || 'Table of Contents';
  const main = block.closest('main');
  const heads = main ? [...main.querySelectorAll('.default-content-wrapper h2, .default-content-wrapper h3')].filter((h) => !h.closest('.hero') && !h.closest('.cards') && !h.closest('.section.tinted') && !h.closest('.section.rail') && !h.closest('.section.rail-right')) : [];
  const box = document.createElement('div');
  box.className = 'toc-box';
  const t = document.createElement('div'); t.className = 'toc-title'; t.textContent = label;
  t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0'); t.setAttribute('aria-expanded', 'false');
  const toggle = () => t.setAttribute('aria-expanded', t.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  t.addEventListener('click', toggle);
  t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  const ul = document.createElement('ul');
  heads.forEach((h, i) => {
    if (h.tagName !== 'H2') return;
    if (!h.id) h.id = `${h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${i}`;
    const li = document.createElement('li'); const a = document.createElement('a'); a.href = `#${h.id}`; a.textContent = h.textContent.trim(); li.append(a); ul.append(li);
  });
  box.append(t, ul);
  block.replaceChildren(box);
  if (!ul.children.length) block.closest('.section')?.classList.add('toc-empty');
}
