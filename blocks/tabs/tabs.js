/**
 * tabs — vertical tabs (source: .component-floating-tabs.vertical-tabs); accordion on mobile.
 * Rows: [p strong title][content]. Titles move into a sibling list (never inside a <button>, EW7);
 * the click target is the list item. Panels keep the authored content (EW1).
 */
export default async function decorate(block) {
  const nav = document.createElement('ul');
  nav.className = 'tabs-nav';
  nav.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'tabs-panels';
  const rows = [...block.children];
  rows.forEach((row, i) => {
    const [titleCell, bodyCell] = [...row.children];
    const li = document.createElement('li');
    li.setAttribute('role', 'tab');
    li.tabIndex = 0;
    li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    const t = document.createElement('div');
    t.className = 'tabs-title';
    if (titleCell) t.append(...titleCell.children);
    li.append(t);
    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.classList.toggle('tabs-panel-off', i !== 0); panel.setAttribute('aria-hidden', String(i !== 0));
    const head = document.createElement('div');
    head.className = 'tabs-panel-head';
    head.textContent = t.textContent.trim();
    panel.append(head);
    if (bodyCell) panel.append(...bodyCell.children);
    // products variant (DesignWare "Product Details"): each list item is "description · STARs link · Subscribe link" → a 3-column table row
    if (block.classList.contains('products')) {
      panel.querySelectorAll(':scope > ul').forEach((ul) => {
        const table = document.createElement('table'); table.className = 'tabs-products-table';
        [...ul.children].forEach((li) => {
          const tr = document.createElement('tr'); const links = [...li.querySelectorAll('a')];
          const desc = document.createElement('td'); desc.textContent = [...li.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim() || li.textContent.trim();
          tr.append(desc);
          links.forEach((a) => { const td = document.createElement('td'); td.append(a); tr.append(td); });
          table.append(tr);
        });
        ul.replaceWith(table);
      });
    }
    const select = () => {
      [...nav.children].forEach((n, j) => n.setAttribute('aria-selected', j === i ? 'true' : 'false'));
      [...panels.children].forEach((p, j) => { p.classList.toggle('tabs-panel-off', j !== i); p.setAttribute('aria-hidden', String(j !== i)); });
    };
    li.addEventListener('click', select);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
    head.addEventListener('click', () => { if (window.innerWidth <= 729) panel.classList.toggle('collapsed'); });
    nav.append(li);
    panels.append(panel);
  });
  block.replaceChildren(nav, panels);
}
