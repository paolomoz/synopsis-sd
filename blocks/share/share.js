/**
 * share — social share row (source: .cmp-socialshare in the article left rail: X, LinkedIn, Facebook, email).
 * Links are built from the page URL and title at runtime; icons are inlined brand glyphs (no authored text).
 * Auto-blocked on article pages by scripts.js (the source component sits on every blog/article page).
 */
const ICONS = {
  x: '<svg aria-hidden="true" viewBox="0 0 512 512"><path fill="currentColor" d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z"/></svg>',
  linkedin: '<svg aria-hidden="true" viewBox="0 0 448 512"><path fill="currentColor" d="M100.3 448H7.4V148.9h92.9zM53.8 108.1C24.1 108.1 0 83.5 0 53.8a53.8 53.8 0 0 1 107.6 0c0 29.7-24.1 54.3-53.8 54.3M447.9 448h-92.7V302.4c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7V448h-92.8V148.9h89.1v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3V448z"/></svg>',
  facebook: '<svg aria-hidden="true" viewBox="0 0 512 512"><path fill="currentColor" d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256c0 120 82.7 220.8 194.2 248.5V334.2h-52.8V256h52.8v-33.7c0-87.1 39.4-127.5 125-127.5 16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256"/></svg>',
  email: '<svg aria-hidden="true" viewBox="0 0 512 512"><path fill="currentColor" d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4 0-26.5-21.5-48-48-48zM0 176v208c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V176L294.4 339.2a63.9 63.9 0 0 1-76.8 0z"/></svg>',
};

export default function decorate(block) {
  const url = window.location.href.split('#')[0];
  const title = (document.querySelector('meta[property="og:title"]')?.content || document.title || '').trim();
  const u = encodeURIComponent(url); const t = encodeURIComponent(title);
  const links = [
    ['x', 'Share on X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
    ['linkedin', 'Share on LinkedIn', `https://www.linkedin.com/shareArticle?mini=true&url=${u}&title=${t}`],
    ['facebook', 'Share on Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['email', 'Share by email', `mailto:?subject=${t}&body=${u}`],
  ];
  const ul = document.createElement('ul');
  ul.className = 'share-links';
  links.forEach(([key, label, href]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href; a.className = `share-link share-${key}`; a.setAttribute('aria-label', label); a.title = label;
    if (key !== 'email') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.innerHTML = ICONS[key];
    li.append(a); ul.append(li);
  });
  block.replaceChildren(ul);
}
