/**
 * tags — page tag chips (source: .cmp-blogsdev__pagetags-container at the end of an article). Authored: one cell with a
 * list (or comma-joined links) of tag links. Authored anchors are MOVED into the chip list (EW1).
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'tags-list';
  block.querySelectorAll('a').forEach((a) => { const li = document.createElement('li'); li.append(a); ul.append(li); });
  block.replaceChildren(ul);
}
