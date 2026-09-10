/**
 * box-links — grouped product link boxes (source: .component-boxLink), 3 boxes per row.
 * Rows: [p strong label][ul of links]. Authored elements are MOVED (EW1).
 */
export default async function decorate(block) {
  const grid = document.createElement('div');
  grid.className = 'box-links-grid';
  [...block.children].forEach((row) => {
    const box = document.createElement('div');
    box.className = 'box-links-box';
    const [labelCell, listCell] = [...row.children];
    if (labelCell) { const l = document.createElement('div'); l.className = 'box-links-label'; l.append(...labelCell.children); box.append(l); }
    if (listCell) { const l = document.createElement('div'); l.className = 'box-links-list'; l.append(...listCell.children); box.append(l); }
    grid.append(box);
  });
  block.replaceChildren(grid);
}
