/**
 * table — Block Collection table: block rows → <table>. Variant `header` renders the first row as <thead>.
 * Cells are MOVED (EW1).
 */
export default function decorate(block) {
  const table = document.createElement('table');
  const header = block.classList.contains('header') || !block.classList.contains('no-header');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  [...block.children].forEach((row, i) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((cell) => {
      const el = document.createElement(header && i === 0 ? 'th' : 'td');
      if (header && i === 0) el.setAttribute('scope', 'col');
      el.append(...cell.childNodes);
      // unwrap the single paragraph the pipeline puts around plain cells
      if (el.children.length === 1 && el.firstElementChild.tagName === 'P') el.firstElementChild.replaceWith(...el.firstElementChild.childNodes);
      tr.append(el);
    });
    (header && i === 0 ? thead : tbody).append(tr);
  });
  if (thead.children.length) table.append(thead);
  table.append(tbody);
  block.replaceChildren(table);
}
