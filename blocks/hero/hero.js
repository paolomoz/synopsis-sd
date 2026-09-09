/**
 * hero — synopsys.com "skinny banner": full-bleed purple gradient band with a centered
 * title and one white outlined CTA. Variant `connect` = the site-wide "Connect with Us"
 * band above the footer (title authored as <h2>, smaller type).
 *
 * Schema: stardust/eds-schema/vcs.json § hero (heading + cta). Template-slotted (#95):
 * the prototype's band DOM is held as empty slot containers and the authored elements
 * are MOVED into them (EW1/EW3).
 *
 * Authoring (one cell, DA-flattened):
 *   <h1>Page title</h1>            (h2 on the `connect` variant)
 *   <p><em><a href="…">Datasheet</a></em></p>   → a.button.secondary (white)
 */
function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

export default async function decorate(block) {
  const heading = block.querySelector('h1, h2, h3');
  const ctas = [...block.querySelectorAll('a')].map((a) => a.closest('p') || a);
  const extra = [...block.querySelectorAll('p')].filter((p) => !p.querySelector('a') && p.textContent.trim());

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  const container = document.createElement('div');
  container.className = 'hero-container-inner';
  const wrap = document.createElement('div');
  wrap.className = 'hero-text';
  if (heading) wrap.append(wrapNode(heading, 'hero-title'));
  extra.forEach((p) => wrap.append(wrapNode(p, 'hero-sub')));
  const sub = document.createElement('div');
  sub.className = 'hero-subtitle';
  wrap.append(sub);
  if (ctas.length) {
    const actions = document.createElement('div');
    actions.className = 'hero-actions';
    ctas.forEach((p) => actions.append(p));
    wrap.append(actions);
  }
  container.append(wrap);
  overlay.append(container);
  block.replaceChildren(overlay);
}
