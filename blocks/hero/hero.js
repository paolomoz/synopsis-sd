/**
 * hero — synopsys.com banner family, template-slotted (#95). Variants (block classes):
 *   (none)     skinny purple gradient title band          rows: [text]
 *   black      skinny black gradient band                  rows: [text]
 *   light      skinny light-purple gradient band           rows: [text]
 *   image      photo banner (700px) with gradient wash     rows: [img] [text]
 *   video      video banner rendered with its poster       rows: [img] [text]
 *   blog       article banner: category · h1 · authors · date/read-time   rows: [img?] [text]
 *   carousel   home banner carousel, one row per slide     rows: [img] [text] × N
 *   connect    site-wide "Connect with Us" band            rows: [text]
 * Every authored element is MOVED into the slots (EW1/EW3); CTAs keep their <p>.
 */
function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

function buildSlide(rowCells, block, isFirst) {
  const slide = document.createElement('div');
  slide.className = 'hero-slide';
  const media = rowCells.find((c) => c.querySelector('picture, img') && !c.textContent.trim());
  const textCell = rowCells.find((c) => c !== media) || rowCells[0];
  if (media) {
    const pic = media.querySelector('picture, img');
    const img = pic.tagName === 'IMG' ? pic : pic.querySelector('img');
    if (img && isFirst) { img.setAttribute('loading', 'eager'); img.setAttribute('fetchpriority', 'high'); }
    slide.append(wrapNode(pic, 'hero-media'));
  }
  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  const inner = document.createElement('div');
  inner.className = 'hero-container-inner';
  const wrap = document.createElement('div');
  wrap.className = 'hero-text';
  if (textCell) {
    const heading = textCell.querySelector('h1, h2, h3, h4');
    const ps = [...textCell.querySelectorAll('p')];
    const ctas = ps.filter((p) => p.querySelector('a') && p.querySelector('a').classList.contains('button'));
    const cat = block.classList.contains('blog') ? ps.find((p) => p.querySelector('a') && !ctas.includes(p) && p.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
    const others = ps.filter((p) => !ctas.includes(p) && p !== cat);
    if (cat) wrap.append(wrapNode(cat, 'hero-eyebrow'));
    if (heading) wrap.append(wrapNode(heading, 'hero-title'));
    others.forEach((p) => {
      if (block.classList.contains('blog') && p.childNodes.length === 1 && / \/ /.test(p.textContent)) {
        const [a, b] = p.textContent.split(' / ');
        const sep = document.createElement('span'); sep.className = 'hero-sep'; sep.textContent = '/';
        p.replaceChildren(document.createTextNode(a.trim()), sep, document.createTextNode(b.trim()));
      }
      wrap.append(wrapNode(p, 'hero-sub'));
    });
    const sub = document.createElement('div');
    sub.className = 'hero-subtitle';
    wrap.append(sub);
    if (ctas.length) {
      const actions = document.createElement('div');
      actions.className = 'hero-actions';
      ctas.forEach((p) => actions.append(p));
      wrap.append(actions);
    }
    [...textCell.querySelectorAll('ul, ol')].forEach((l) => wrap.append(wrapNode(l, 'hero-list')));
  }
  inner.append(wrap);
  overlay.append(inner);
  slide.append(overlay);
  return slide;
}

export default async function decorate(block) {
  const rows = [...block.children].map((r) => [...r.children]);
  const isCarousel = block.classList.contains('carousel');
  const slides = [];
  if (isCarousel) {
    rows.forEach((cells, i) => slides.push(buildSlide(cells, block, i === 0)));
  } else {
    slides.push(buildSlide(rows.flat(), block, true));
  }
  const track = document.createElement('div');
  track.className = 'hero-track';
  slides.forEach((s, i) => { if (i === 0) s.classList.add('active'); track.append(s); });
  block.replaceChildren(track);
  if (isCarousel && slides.length > 1) {
    const dots = document.createElement('div');
    dots.className = 'hero-dots';
    dots.setAttribute('role', 'tablist');
    let current = 0;
    const show = (i) => {
      current = i;
      slides.forEach((s, j) => s.classList.toggle('active', j === i));
      [...dots.children].forEach((d, j) => d.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    };
    slides.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab');
      const title = s.querySelector('.hero-title')?.textContent.trim() || `Slide ${i + 1}`;
      b.setAttribute('aria-label', title); b.textContent = title;
      b.addEventListener('click', () => show(i));
      dots.append(b);
    });
    block.append(dots);
    show(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = setInterval(() => show((current + 1) % slides.length), 8000);
      const pause = document.createElement('button');
      pause.type = 'button'; pause.className = 'hero-pause'; pause.setAttribute('aria-label', 'Pause carousel');
      pause.addEventListener('click', () => { clearInterval(timer); pause.remove(); });
      block.append(pause);
    }
  }
}
