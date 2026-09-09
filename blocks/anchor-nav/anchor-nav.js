/**
 * anchor-nav — the in-page "table of contents" strip on product/solution pages
 * (Overview · Key Benefits · Features · Resources + a dark "Get Started" button).
 *
 * Authoring (one cell):
 *   <ul><li><a href="#overview">Overview</a></li>…</ul>
 *   <p><strong><a href="/contact-sales">Get Started</a></strong></p>
 * Target sections declare `anchor: <id>` in their section-metadata; decorate() gives the
 * matching section that id so the hash links work.
 *
 * Scroll-state chrome (mirrors the source): once the strip's natural top scrolls under the
 * pinned site nav it becomes position:fixed at the nav's height, and its wrapper keeps a
 * 42px placeholder (the source's min-height) — so document height changes by -12px in the
 * pinned state exactly like the live site. Mobile shows the first row only.
 */
export default async function decorate(block) {
  const list = block.querySelector('ul, ol');
  const cta = block.querySelector('a.button, p a');
  const strip = document.createElement('div');
  strip.className = 'anchor-nav-strip';
  const container = document.createElement('div');
  container.className = 'anchor-nav-container-inner';
  if (list) {
    const first = document.createElement('li');
    first.className = 'anchor-nav-init';
    // mobile-only collapsed label; an <a> like the source's `li.init a` (role parity, no navigation)
    const span = document.createElement('a');
    span.setAttribute('role', 'presentation');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = list.querySelector('li')?.textContent.trim() || 'Overview';
    first.append(span);
    list.prepend(first);
    [...list.children].forEach((li) => { if (li !== first) li.classList.add('anchor-nav-item'); });
    container.append(list);
  }
  if (cta) {
    const btn = document.createElement('div');
    btn.className = 'anchor-nav-cta';
    btn.append(cta.closest('p') || cta);
    container.append(btn);
  }
  strip.append(container);
  block.replaceChildren(strip);

  // resolve hash targets to sections carrying data-anchor
  const main = block.closest('main');
  block.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const target = main && main.querySelector(`.section[data-anchor="${id}"]`);
    if (target && !target.id) target.id = id;
  });

  // pinned state
  const wrapper = block.parentElement;
  const header = document.querySelector('header');
  const update = () => {
    const navRow = header ? header.querySelector('.nav-row') : null;
    const navH = navRow ? navRow.getBoundingClientRect().height : 80;
    const fixed = window.scrollY >= wrapper.offsetTop - navH;
    block.classList.toggle('is-fixed', fixed);
    block.style.top = fixed ? `${navH}px` : '';
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
