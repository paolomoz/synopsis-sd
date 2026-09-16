/**
 * blog-subnav — the "Silicon to Systems Blog · Search Blogs · Topics" bar the source injects (client-side) on every
 * /blogs/ page; auto-built by scripts.js. Title links to the blog hub, the search posts to /search, Topics opens a
 * menu of the category pages read from the index.
 */
export default async function decorate(block) {
  const title = document.createElement('a'); title.className = 'blog-subnav-title'; title.href = '/blogs/chip-design'; title.textContent = 'Silicon to Systems Blog';
  const form = document.createElement('form'); form.className = 'blog-subnav-search'; form.action = '/search'; form.method = 'get';
  const btn = document.createElement('button'); btn.type = 'submit'; btn.setAttribute('aria-label', 'Search');
  btn.innerHTML = '<svg viewBox="0 0 512 512" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>';
  const input = document.createElement('input'); input.type = 'search'; input.name = 'q'; input.placeholder = 'Search Blogs'; input.setAttribute('aria-label', 'Search Blogs');
  form.append(btn, input);
  const topics = document.createElement('div'); topics.className = 'blog-subnav-topics';
  const tb = document.createElement('button'); tb.type = 'button'; tb.setAttribute('aria-expanded', 'false'); tb.textContent = 'Topics';
  const menu = document.createElement('ul'); menu.className = 'blog-subnav-menu';
  tb.addEventListener('click', async () => {
    const open = tb.getAttribute('aria-expanded') === 'true'; tb.setAttribute('aria-expanded', String(!open));
    if (!open && !menu.children.length) {
      try {
        const { getIndex } = await import('../../scripts/index.js');
        (await getIndex()).filter((r) => /\/blogs\/chip-design\/category-/.test(r.path)).sort((a, b) => a.title.localeCompare(b.title))
          .forEach((r) => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = r.path; a.textContent = r.title.replace(/\s*\|.*$/, ''); li.append(a); menu.append(li); });
      } catch (e) { /* index unavailable: button stays inert */ }
    }
  });
  topics.append(tb, menu);
  block.replaceChildren(title, form, topics);
}
