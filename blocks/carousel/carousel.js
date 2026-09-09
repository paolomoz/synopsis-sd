/**
 * carousel — Block Collection carousel; the `resources` variant is synopsys.com's
 * asset-card rail (type chip · title · link), 3 cards per view on desktop, 1 on mobile,
 * with prev/next arrows and page indicators.
 *
 * Schema: stardust/eds-schema/vcs.json § carousel (15 units incl. clones on the source;
 * authored here as the 6 real cards). Reconstructive: one row per card, one cell:
 *   <p><strong>White Paper</strong></p>   (type chip — leading preserved tag)
 *   <h3>Card title</h3>
 *   <p><a href="…">Download</a></p>       (plain link, not a button)
 * All authored elements are MOVED (EW1/EW3). Controls are generated; no authored text
 * lives inside a <button> (EW7).
 */
export default async function decorate(block) {
  const rows = [...block.children];
  const list = document.createElement('div');
  list.className = 'carousel-list';
  const track = document.createElement('div');
  track.className = 'carousel-track';
  rows.forEach((row) => {
    const card = document.createElement('div');
    card.className = 'carousel-card';
    const body = document.createElement('div');
    body.className = 'carousel-card-text';
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const ps = [...row.querySelectorAll('p')];
    const label = ps.find((p) => p.querySelector('strong') && !p.querySelector('a'));
    const link = ps.find((p) => p.querySelector('a'));
    const others = ps.filter((p) => p !== label && p !== link);
    if (label) { const l = document.createElement('div'); l.className = 'carousel-label'; l.append(label); body.append(l); }
    const hd = document.createElement('div');
    hd.className = 'carousel-card-body';
    if (heading) hd.append(heading);
    others.forEach((p) => hd.append(p));
    body.append(hd);
    if (link) { const c = document.createElement('div'); c.className = 'carousel-cta'; c.append(link); body.append(c); }
    card.append(body);
    track.append(card);
  });
  list.append(track);

  const dots = document.createElement('ul');
  dots.className = 'carousel-dots';
  dots.setAttribute('role', 'tablist');
  const prev = document.createElement('button');
  prev.type = 'button'; prev.className = 'carousel-arrow carousel-prev'; prev.setAttribute('aria-label', 'Previous');
  const next = document.createElement('button');
  next.type = 'button'; next.className = 'carousel-arrow carousel-next'; next.setAttribute('aria-label', 'Next');
  block.replaceChildren(list, dots, prev, next);

  const cards = [...track.children];
  let page = 0;
  const per = () => (window.innerWidth <= 729 ? 1 : 3);
  const pages = () => Math.max(1, Math.ceil(cards.length / per()));
  const slot = () => (cards[0] ? cards[0].getBoundingClientRect().width + 10 : 380);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render() {
    if (page > pages() - 1) page = pages() - 1;
    track.style.transition = reduce ? 'none' : 'transform .5s ease';
    track.style.transform = `translate3d(${-page * per() * slot()}px,0,0)`;
    const n = pages();
    if (dots.children.length !== n) {
      dots.replaceChildren(...Array.from({ length: n }, (_, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'presentation');
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `${i + 1} of ${n}`);
        b.addEventListener('click', () => { page = i; render(); });
        li.append(b);
        return li;
      }));
    }
    [...dots.children].forEach((li, i) => {
      li.classList.toggle('active', i === page);
      li.firstElementChild.setAttribute('aria-selected', i === page ? 'true' : 'false');
    });
  }
  prev.addEventListener('click', () => { page = (page - 1 + pages()) % pages(); render(); });
  next.addEventListener('click', () => { page = (page + 1) % pages(); render(); });
  window.addEventListener('resize', render);
  render();
}
