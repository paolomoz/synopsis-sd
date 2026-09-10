/**
 * accordion — FAQ (source: .component-faq). Rows: [p strong question][answer].
 * The question moves into a clickable heading row (a div, not a <button>, EW7); the answer panel toggles.
 */
export default async function decorate(block) {
  [...block.children].forEach((row) => {
    const [qCell, aCell] = [...row.children];
    const item = document.createElement('div');
    item.className = 'accordion-item';
    const head = document.createElement('div');
    head.className = 'accordion-head';
    head.setAttribute('role', 'button');
    head.tabIndex = 0;
    head.setAttribute('aria-expanded', 'false');
    if (qCell) head.append(...qCell.children);
    const body = document.createElement('div');
    body.className = 'accordion-body';
    body.hidden = true;
    if (aCell) body.append(...aCell.children);
    const toggle = () => { const open = head.getAttribute('aria-expanded') === 'true'; head.setAttribute('aria-expanded', open ? 'false' : 'true'); body.hidden = open; };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    item.append(head, body);
    row.replaceWith(item);
  });
}
