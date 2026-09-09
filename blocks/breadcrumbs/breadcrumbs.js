/**
 * breadcrumbs — the trail row under the site nav (Home / … / Section / Page).
 *
 * Authoring (one cell): <ul><li><a href="/">Home</a></li><li><a href="/verification">…</a></li>…</ul>
 * The authored list is MOVED into the nav landmark (EW1). Mobile collapses the middle
 * items behind an ellipsis, like the source site.
 */
export default async function decorate(block) {
  const list = block.querySelector('ul, ol');
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  const container = document.createElement('div');
  container.className = 'breadcrumbs-container-inner';
  if (list) {
    const items = [...list.children];
    if (items.length > 3) {
      const ell = document.createElement('li');
      ell.className = 'breadcrumbs-ellipsis';
      ell.setAttribute('aria-hidden', 'true');
      ell.textContent = '...';
      items[0].after(ell);
      items.slice(1, items.length - 2).forEach((li) => li.classList.add('breadcrumbs-mid'));
    }
    const last = list.querySelector('li:last-child a');
    if (last) last.setAttribute('aria-current', 'page');
    container.append(list);
  }
  nav.append(container);
  block.replaceChildren(nav);
}
