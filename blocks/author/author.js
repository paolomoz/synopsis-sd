/**
 * author — profile card (source: .component-author-profile): rows [photo] [name] [bio…] [follow links].
 * Elements are MOVED (EW1); social links get their network glyph by host.
 */
const GLYPH = {
  linkedin: '<svg aria-hidden="true" viewBox="0 0 448 512" width="20" height="20"><path fill="currentColor" d="M100.3 448H7.4V148.9h92.9zM53.8 108.1C24.1 108.1 0 83.5 0 53.8a53.8 53.8 0 0 1 107.6 0c0 29.7-24.1 54.3-53.8 54.3zM447.9 448h-92.7V302.4c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7V448h-92.8V148.9h89.1v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3V448z"/></svg>',
  x: '<svg aria-hidden="true" viewBox="0 0 512 512" width="20" height="20"><path fill="currentColor" d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/></svg>',
};

export default function decorate(block) {
  const rows = [...block.children];
  const card = document.createElement('div');
  card.className = 'author-card';
  rows.forEach((row) => {
    const cell = row.firstElementChild || row;
    if (cell.querySelector('picture, img') && !cell.textContent.trim()) { cell.className = 'author-photo'; card.append(cell); return; }
    if (cell.querySelector('h1, h2, h3') && !cell.querySelector('p')) { cell.className = 'author-name'; card.append(cell); return; }
    const links = [...cell.querySelectorAll('a')];
    if (links.length && links.every((a) => /linkedin|twitter|x\.com|facebook|youtube/.test(a.href)) && cell.textContent.trim().length < 80) {
      cell.className = 'author-follow';
      links.forEach((a) => {
        const host = new URL(a.href).hostname;
        const key = host.includes('linkedin') ? 'linkedin' : (host.includes('twitter') || host.includes('x.com')) ? 'x' : null;
        a.setAttribute('aria-label', a.textContent.trim() || key || 'Profile');
        if (key) { const t = document.createElement('template'); t.innerHTML = GLYPH[key]; a.replaceChildren(t.content.firstElementChild); }
      });
      card.append(cell); return;
    }
    cell.className = 'author-bio'; card.append(cell);
  });
  block.replaceChildren(card);
}
