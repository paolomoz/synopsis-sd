import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * footer — synopsys.com site footer, template-slotted (#95) from the authored /footer document.
 *
 * /footer sections (fixed contract, in order):
 *   0-3. link columns: <h3>Column title</h3><ul><li><a>…</a></li></ul>
 *   4.   language list: <ul><li>English</li>…</ul>             (rendered as a <select>)
 *   5.   social links:  <ul><li><a href="https://x.com/…">X</a></li>…</ul> (glyph by host)
 *   6.   legal:         <p>©2026 …</p><ul><li><a>Privacy</a></li>…</ul>
 * Authored headings/lists/paragraphs are MOVED (EW1). On mobile the columns collapse into an
 * accordion (heading click toggles the list — the click lands on a wrapper, not a <button>, EW7).
 *
 * @ew-exempt <ul> languages (section 4) — rendered as <select> options; text-as-control
 * @ew-exempt <a> social labels (section 5) — replaced by brand glyphs, label kept visually hidden
 */

const SOCIAL = {
  "x.com": "<svg aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" data-fa-i2svg=\"\"><path fill=\"currentColor\" d=\"M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z\"></path></svg>",
  "linkedin": "<svg aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 448 512\" data-fa-i2svg=\"\"><path fill=\"currentColor\" d=\"M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z\"></path></svg>",
  "facebook": "<svg aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" data-fa-i2svg=\"\"><path fill=\"currentColor\" d=\"M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z\"></path></svg>",
  "youtube": "<svg aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 576 512\" data-fa-i2svg=\"\"><path fill=\"currentColor\" d=\"M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z\"></path></svg>",
  "instagram": "<svg aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 448 512\" data-fa-i2svg=\"\"><path fill=\"currentColor\" d=\"M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z\"></path></svg>"
};
const WORDMARK = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 276.32 60.13\" role=\"img\" aria-label=\"Synopsys\"> <g data-name=\"logo\"> <path d=\"M19.24 7c0-1.84-.92-3.23-5-3.23s-5 1.39-5 3.23v5a5.43 5.43 0 0 0 2 4.28L25 28.18A7.75 7.75 0 0 1 28.2 34v7.52c0 4.48-5.27 7-14 7C4.61 48.47 0 46.3 0 41.49V35h8.7v6.26c0 2.25 1.71 3.56 5.53 3.56 3.56 0 5.27-1.31 5.27-3.56v-6.69c0-1.65-.66-2.9-2.51-4.55L4.22 18.88c-2.37-2-3.69-3.62-3.69-6.06V7.09c0-4.68 4.88-7 13.7-7C24 .1 27.94 2.41 27.94 6.76v6.06h-8.7ZM103.13 8c0-4.68 3.55-8 15.29-8s15.28 3.36 15.28 8v32.33c0 4.68-3.56 8-15.29 8s-15.29-3.36-15.29-8Zm8.69 32.15c0 2.64 1.06 4.49 6.59 4.49s6.59-1.81 6.59-4.45v-32c0-2.64-1-4.48-6.58-4.48s-6.6 1.84-6.6 4.48ZM138.51.39h13.84c11.21 0 14.5 1.85 14.5 7.25v11.67c0 5.4-3.3 7.25-14.5 7.25h-5.14V48h-8.7Zm12.92 22.47c3.95 0 6.72-.52 6.72-3V7.05c0-2.44-2.77-3-6.72-3h-4.22v18.81ZM188.57 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.8 7.8 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.23-2.18-14.23-7v-6.51H178v6.26c0 2.24 1.71 3.56 5.53 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.65-2.9-2.5-4.54l-12.75-11.14c-2.38-2-3.69-3.62-3.69-6.06V7c0-4.68 4.87-7 13.71-7 9.75 0 13.7 2.3 13.7 6.66v6.06h-8.7ZM252.76 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.77 7.77 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.24-2.18-14.24-7v-6.51h8.71v6.26c0 2.24 1.72 3.56 5.54 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.66-2.9-2.5-4.54l-12.81-11.14c-2.37-2-3.69-3.62-3.69-6.06V7c0-4.67 4.88-7 13.71-7 9.75 0 13.71 2.31 13.71 6.66v6.06h-8.7ZM55.12.4h8.71L44.77 60.13h-8.71L55.12.4zM41.38 37.5 29.6.5h8.71l7.42 23.33-4.35 13.67zM224.35.4h8.71L214 60.13h-8.71L224.35.4zM210.66 37.39 198.87.4h8.71l7.43 23.32-4.35 13.67zM97.76 48V7.65c0-5.4-3.3-7.25-14.5-7.25H66.54V48h8.7V4.1h7.16c4 0 6.72.52 6.72 3V48ZM265.1 6.27a5.61 5.61 0 1 1 5.63 5.56 5.53 5.53 0 0 1-5.63-5.56Zm5.63 4.63a4.47 4.47 0 0 0 4.48-4.63 4.5 4.5 0 1 0-9 0 4.48 4.48 0 0 0 4.52 4.63Zm-1.18-1.42h-1V3.09H271c1.51 0 2.26.56 2.26 1.82a1.67 1.67 0 0 1-1.66 1.76l1.82 2.81h-1.08l-1.69-2.77h-1.12Zm1.16-3.59c.82 0 1.56-.06 1.56-1 0-.79-.72-.94-1.39-.94h-1.33v2Z\"> </path> </g> </svg>";

function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup;
  return t.content.firstElementChild;
}

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const sections = [...fragment.children].map((s) => s.querySelector('.default-content-wrapper') || s);
  const root = document.createElement('div');

  const logoTop = document.createElement('a');
  logoTop.className = 'footer-logo-top';
  logoTop.href = '/';
  logoTop.setAttribute('aria-label', 'Synopsys');
  logoTop.append(svg(WORDMARK));
  root.append(logoTop);

  const links = document.createElement('div');
  links.className = 'footer-links';
  const cols = sections.filter((s) => s.querySelector('h2, h3, h4') && s.querySelector('ul'));
  cols.forEach((s) => {
    const col = document.createElement('nav');
    col.className = 'footer-col';
    const h = s.querySelector('h2, h3, h4');
    col.setAttribute('aria-label', h.textContent.trim());
    col.append(h, s.querySelector('ul'));
    h.addEventListener('click', () => { if (window.innerWidth <= 992) col.classList.toggle('is-open'); });
    links.append(col);
  });
  const rest = sections.filter((s) => !cols.includes(s));
  const langSec = rest.find((s) => s.querySelector('ul') && !s.querySelector('a'));
  const socialSec = rest.find((s) => s.querySelector('ul a[href^="http"]') && !s.querySelector('p'));
  const legalSec = rest.find((s) => s.querySelector('p') && s !== socialSec && s !== langSec);

  const lang = document.createElement('div');
  lang.className = 'footer-col footer-lang';
  if (langSec) {
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Language');
    [...langSec.querySelectorAll('li')].forEach((li) => {
      const o = document.createElement('option');
      o.textContent = li.textContent.trim();
      select.append(o);
    });
    lang.append(select, langSec.querySelector('ul'));
  }
  links.append(lang);
  root.append(links);

  const social = document.createElement('div');
  social.className = 'footer-social';
  if (socialSec) {
    const ul = socialSec.querySelector('ul');
    ul.querySelectorAll('a').forEach((a) => {
      const key = Object.keys(SOCIAL).find((k) => a.href.includes(k));
      const label = document.createElement('span');
      label.className = 'footer-social-text';
      label.append(...a.childNodes);
      if (key) a.prepend(svg(SOCIAL[key]));
      a.append(label);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
    social.append(ul);
  }
  const logoBottom = document.createElement('a');
  logoBottom.className = 'footer-logo-bottom';
  logoBottom.href = '/';
  logoBottom.setAttribute('aria-label', 'Synopsys');
  logoBottom.append(svg(WORDMARK));
  social.append(logoBottom);
  root.append(social);

  const legal = document.createElement('div');
  legal.className = 'footer-legal';
  if (legalSec) legal.append(...[...legalSec.children]);
  root.append(legal);

  block.append(root);
}
