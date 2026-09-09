import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * header — synopsys.com chrome, template-slotted (#95) from the authored /nav document.
 *
 * /nav sections (fixed contract):
 *   0. utility bar: <p><a>Synopsys</a></p><p><a>Ansys</a></p><ul>languages</ul><p><a>Ask</a></p>
 *   1. brand:       <p><a href="/">Synopsys</a></p>
 *   2. sections:    <ul><li>Item<ul><li><a>…</a></li></ul></li>…</ul>  (mega-menu links)
 *   3. tools:       <p><a>Search Synopsys.com</a></p><p><strong><a>Contact Sales</a></strong></p>
 * Authored elements are MOVED into the slots (EW1/EW3). Brand wordmarks, search and menu glyphs are
 * fixed brand assets inlined here. Scroll-state: the nav row pins to the top once the utility bar has
 * scrolled away (mirrors the source), honoring prefers-reduced-motion (no animation involved).
 *
 * @ew-exempt <p> utility "Ask" and language list — rendered as buttons (EW7); text-as-control
 */

const isDesktop = window.matchMedia('(min-width: 1130px)');
const SVG = {
  wordmark: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 276.32 60.13\" role=\"img\" aria-label=\"Synopsys\"> <g data-name=\"logo\"> <path d=\"M19.24 7c0-1.84-.92-3.23-5-3.23s-5 1.39-5 3.23v5a5.43 5.43 0 0 0 2 4.28L25 28.18A7.75 7.75 0 0 1 28.2 34v7.52c0 4.48-5.27 7-14 7C4.61 48.47 0 46.3 0 41.49V35h8.7v6.26c0 2.25 1.71 3.56 5.53 3.56 3.56 0 5.27-1.31 5.27-3.56v-6.69c0-1.65-.66-2.9-2.51-4.55L4.22 18.88c-2.37-2-3.69-3.62-3.69-6.06V7.09c0-4.68 4.88-7 13.7-7C24 .1 27.94 2.41 27.94 6.76v6.06h-8.7ZM103.13 8c0-4.68 3.55-8 15.29-8s15.28 3.36 15.28 8v32.33c0 4.68-3.56 8-15.29 8s-15.29-3.36-15.29-8Zm8.69 32.15c0 2.64 1.06 4.49 6.59 4.49s6.59-1.81 6.59-4.45v-32c0-2.64-1-4.48-6.58-4.48s-6.6 1.84-6.6 4.48ZM138.51.39h13.84c11.21 0 14.5 1.85 14.5 7.25v11.67c0 5.4-3.3 7.25-14.5 7.25h-5.14V48h-8.7Zm12.92 22.47c3.95 0 6.72-.52 6.72-3V7.05c0-2.44-2.77-3-6.72-3h-4.22v18.81ZM188.57 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.8 7.8 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.23-2.18-14.23-7v-6.51H178v6.26c0 2.24 1.71 3.56 5.53 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.65-2.9-2.5-4.54l-12.75-11.14c-2.38-2-3.69-3.62-3.69-6.06V7c0-4.68 4.87-7 13.71-7 9.75 0 13.7 2.3 13.7 6.66v6.06h-8.7ZM252.76 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.77 7.77 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.24-2.18-14.24-7v-6.51h8.71v6.26c0 2.24 1.72 3.56 5.54 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.66-2.9-2.5-4.54l-12.81-11.14c-2.37-2-3.69-3.62-3.69-6.06V7c0-4.67 4.88-7 13.71-7 9.75 0 13.71 2.31 13.71 6.66v6.06h-8.7ZM55.12.4h8.71L44.77 60.13h-8.71L55.12.4zM41.38 37.5 29.6.5h8.71l7.42 23.33-4.35 13.67zM224.35.4h8.71L214 60.13h-8.71L224.35.4zM210.66 37.39 198.87.4h8.71l7.43 23.32-4.35 13.67zM97.76 48V7.65c0-5.4-3.3-7.25-14.5-7.25H66.54V48h8.7V4.1h7.16c4 0 6.72.52 6.72 3V48ZM265.1 6.27a5.61 5.61 0 1 1 5.63 5.56 5.53 5.53 0 0 1-5.63-5.56Zm5.63 4.63a4.47 4.47 0 0 0 4.48-4.63 4.5 4.5 0 1 0-9 0 4.48 4.48 0 0 0 4.52 4.63Zm-1.18-1.42h-1V3.09H271c1.51 0 2.26.56 2.26 1.82a1.67 1.67 0 0 1-1.66 1.76l1.82 2.81h-1.08l-1.69-2.77h-1.12Zm1.16-3.59c.82 0 1.56-.06 1.56-1 0-.79-.72-.94-1.39-.94h-1.33v2Z\"> </path> </g> </svg>",
  ansys: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"51\" height=\"16\" viewBox=\"0 0 51 16\" fill=\"none\"> <path d=\"M23.3035 4.56832C23.8231 5.1848 24.075 6.11744 24.075 7.35041V12.6617H21.3825V7.47687C21.3825 6.87619 21.2723 6.44939 21.0518 6.16486C20.8314 5.89613 20.485 5.75387 20.0284 5.75387C19.4615 5.75387 19.0207 5.92775 18.6743 6.29132C18.3279 6.65489 18.1704 7.12911 18.1704 7.72979V12.6617H15.4779V3.87279H18.0917V5.12157C18.4066 4.64735 18.8002 4.28378 19.3041 4.03087C19.7922 3.77795 20.359 3.65149 20.9731 3.65149C22.0123 3.65149 22.7996 3.96764 23.3035 4.56832Z\" fill=\"white\"></path> <path d=\"M27.0351 12.5352C26.3581 12.3455 25.7755 12.0767 25.2874 11.7448L25.9959 9.87952C26.4683 10.1957 27.0036 10.4486 27.5705 10.6383C28.1373 10.8122 28.7199 10.907 29.3025 10.907C29.7119 10.907 30.0425 10.8438 30.2787 10.7015C30.5149 10.5592 30.6251 10.3696 30.6251 10.1324C30.6251 9.91114 30.5464 9.75307 30.3889 9.62661C30.2315 9.50015 29.9323 9.4053 29.4914 9.31046L28.0586 8.99431C27.2083 8.80463 26.5942 8.50429 26.1849 8.1091C25.7912 7.71392 25.5865 7.16066 25.5865 6.46514C25.5865 5.91188 25.744 5.43766 26.0589 5.01086C26.3738 4.59987 26.8147 4.26792 27.3973 4.03081C27.9799 3.7937 28.6254 3.66724 29.3655 3.66724C29.9953 3.66724 30.6094 3.76208 31.2077 3.95177C31.806 4.14146 32.3414 4.41018 32.8137 4.75794L32.1052 6.54417C31.1762 5.89607 30.263 5.57993 29.3497 5.57993C28.9403 5.57993 28.6097 5.65896 28.3735 5.80123C28.1373 5.94349 28.0113 6.14899 28.0113 6.41771C28.0113 6.6074 28.0901 6.76548 28.2318 6.86032C28.3735 6.97097 28.6254 7.06582 28.9876 7.16066L30.4677 7.50842C31.3652 7.71392 32.0107 8.01426 32.4201 8.42525C32.8295 8.83624 33.0342 9.3895 33.0342 10.1008C33.0342 10.9544 32.7035 11.6183 32.0265 12.0926C31.3494 12.5826 30.4204 12.8197 29.2552 12.8197C28.4522 12.8197 27.7122 12.7248 27.0351 12.5352Z\" fill=\"white\"></path> <path d=\"M45.0009 12.5352C44.3239 12.3455 43.7413 12.0767 43.2532 11.7448L43.9617 9.87952C44.4341 10.1957 44.9694 10.4486 45.5363 10.6383C46.1031 10.8122 46.6857 10.907 47.2683 10.907C47.6777 10.907 48.0083 10.8438 48.2445 10.7015C48.4807 10.5592 48.5909 10.3696 48.5909 10.1324C48.5909 9.91114 48.5122 9.75307 48.3547 9.62661C48.1973 9.50015 47.8981 9.4053 47.4572 9.31046L46.0244 8.99431C45.1741 8.80463 44.5601 8.50429 44.1507 8.1091C43.757 7.71392 43.5523 7.16066 43.5523 6.46514C43.5523 5.91188 43.7098 5.43766 44.0247 5.01086C44.3396 4.59987 44.7805 4.26792 45.3631 4.03081C45.9457 3.7937 46.5912 3.66724 47.3313 3.66724C47.9611 3.66724 48.5752 3.76208 49.1735 3.95177C49.7718 4.14146 50.3072 4.41018 50.7796 4.75794L50.071 6.54417C49.142 5.89607 48.2288 5.57993 47.3155 5.57993C46.9062 5.57993 46.5755 5.65896 46.3393 5.80123C46.1031 5.94349 45.9772 6.14899 45.9772 6.41771C45.9772 6.6074 46.0559 6.76548 46.1976 6.86032C46.3393 6.97097 46.5912 7.06582 46.9534 7.16066L48.4335 7.50842C49.331 7.71392 49.9765 8.01426 50.3859 8.42525C50.7953 8.83624 51 9.3895 51 10.1008C51 10.9544 50.6693 11.6183 49.9923 12.0926C49.3152 12.5826 48.3862 12.8197 47.2211 12.8197C46.418 12.8197 45.678 12.7248 45.0009 12.5352Z\" fill=\"white\"></path> <path d=\"M5.3535 0L0 12.6617H3.65298L8.81754 0H5.3535Z\" fill=\"white\"></path> <path d=\"M9.44735 0.411011L7.71533 4.66319L10.9747 12.6617H14.6434L9.44735 0.411011Z\" fill=\"white\"></path> <path d=\"M40.5449 3.8728L38.3405 9.07342L36.1361 3.8728H33.4751L37.0179 12.2033L35.4433 15.9022H38.1043L43.2059 3.8728H40.5449Z\" fill=\"white\"></path> </svg>",
  logo: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 276.32 60.13\" width=\"166\" role=\"img\" aria-label=\"Synopsys\"><g data-name=\"logo\"><path d=\"M19.24 7c0-1.84-.92-3.23-5-3.23s-5 1.39-5 3.23v5a5.43 5.43 0 0 0 2 4.28L25 28.18A7.75 7.75 0 0 1 28.2 34v7.52c0 4.48-5.27 7-14 7C4.61 48.47 0 46.3 0 41.49V35h8.7v6.26c0 2.25 1.71 3.56 5.53 3.56 3.56 0 5.27-1.31 5.27-3.56v-6.69c0-1.65-.66-2.9-2.51-4.55L4.22 18.88c-2.37-2-3.69-3.62-3.69-6.06V7.09c0-4.68 4.88-7 13.7-7C24 .1 27.94 2.41 27.94 6.76v6.06h-8.7ZM103.13 8c0-4.68 3.55-8 15.29-8s15.28 3.36 15.28 8v32.33c0 4.68-3.56 8-15.29 8s-15.29-3.36-15.29-8Zm8.69 32.15c0 2.64 1.06 4.49 6.59 4.49s6.59-1.81 6.59-4.45v-32c0-2.64-1-4.48-6.58-4.48s-6.6 1.84-6.6 4.48ZM138.51.39h13.84c11.21 0 14.5 1.85 14.5 7.25v11.67c0 5.4-3.3 7.25-14.5 7.25h-5.14V48h-8.7Zm12.92 22.47c3.95 0 6.72-.52 6.72-3V7.05c0-2.44-2.77-3-6.72-3h-4.22v18.81ZM188.57 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.8 7.8 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.23-2.18-14.23-7v-6.51H178v6.26c0 2.24 1.71 3.56 5.53 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.65-2.9-2.5-4.54l-12.75-11.14c-2.38-2-3.69-3.62-3.69-6.06V7c0-4.68 4.87-7 13.71-7 9.75 0 13.7 2.3 13.7 6.66v6.06h-8.7ZM252.76 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.77 7.77 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.24-2.18-14.24-7v-6.51h8.71v6.26c0 2.24 1.72 3.56 5.54 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.66-2.9-2.5-4.54l-12.81-11.14c-2.37-2-3.69-3.62-3.69-6.06V7c0-4.67 4.88-7 13.71-7 9.75 0 13.71 2.31 13.71 6.66v6.06h-8.7ZM55.12.4h8.71L44.77 60.13h-8.71L55.12.4zM41.38 37.5 29.6.5h8.71l7.42 23.33-4.35 13.67zM224.35.4h8.71L214 60.13h-8.71L224.35.4zM210.66 37.39 198.87.4h8.71l7.43 23.32-4.35 13.67zM97.76 48V7.65c0-5.4-3.3-7.25-14.5-7.25H66.54V48h8.7V4.1h7.16c4 0 6.72.52 6.72 3V48ZM265.1 6.27a5.61 5.61 0 1 1 5.63 5.56 5.53 5.53 0 0 1-5.63-5.56Zm5.63 4.63a4.47 4.47 0 0 0 4.48-4.63 4.5 4.5 0 1 0-9 0 4.48 4.48 0 0 0 4.52 4.63Zm-1.18-1.42h-1V3.09H271c1.51 0 2.26.56 2.26 1.82a1.67 1.67 0 0 1-1.66 1.76l1.82 2.81h-1.08l-1.69-2.77h-1.12Zm1.16-3.59c.82 0 1.56-.06 1.56-1 0-.79-.72-.94-1.39-.94h-1.33v2Z\"></path></g></svg>",
  search: "<svg aria-hidden=\"true\" aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" data-fa-i2svg=\"\"><path fill=\"currentColor\" d=\"M368 208A160 160 0 1 0 48 208a160 160 0 1 0 320 0zM337.1 371.1C301.7 399.2 256.8 416 208 416C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208c0 48.8-16.8 93.7-44.9 129.1L505 471c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L337.1 371.1z\"></path></svg>",
  burger: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"16\" viewBox=\"0 0 14 16\" fill=\"none\"> <path d=\"M0 2.75C0 2.33437 0.334375 2 0.75 2H13.25C13.6656 2 14 2.33437 14 2.75C14 3.16562 13.6656 3.5 13.25 3.5H0.75C0.334375 3.5 0 3.16562 0 2.75ZM0 7.75C0 7.33437 0.334375 7 0.75 7H13.25C13.6656 7 14 7.33437 14 7.75C14 8.16563 13.6656 8.5 13.25 8.5H0.75C0.334375 8.5 0 8.16563 0 7.75ZM14 12.75C14 13.1656 13.6656 13.5 13.25 13.5H0.75C0.334375 13.5 0 13.1656 0 12.75C0 12.3344 0.334375 12 0.75 12H13.25C13.6656 12 14 12.3344 14 12.75Z\" fill=\"white\"></path> </svg>",
  close: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" viewBox=\"0 0 10 10\" fill=\"none\"> <path d=\"M9.14062 9.84688C9.33438 10.0406 9.65312 10.0406 9.84688 9.84688C10.0406 9.65312 10.0406 9.33438 9.84688 9.14062L5.70625 5L9.84688 0.859375C10.0406 0.665625 10.0406 0.346875 9.84688 0.153125C9.65312 -0.040625 9.33438 -0.040625 9.14062 0.153125L5 4.29375L0.859375 0.153125C0.665625 -0.040625 0.346875 -0.040625 0.153125 0.153125C-0.040625 0.346875 -0.040625 0.665625 0.153125 0.859375L4.29375 5L0.153125 9.14062C-0.040625 9.33438 -0.040625 9.65312 0.153125 9.84688C0.346875 10.0406 0.665625 10.0406 0.859375 9.84688L5 5.70625L9.14062 9.84688Z\" fill=\"black\"></path> </svg>",
  globe: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" width=\"16\" height=\"16\"><circle cx=\"8\" cy=\"8\" r=\"6.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M1.5 8h13M8 1.5c-3 3.5-3 9.5 0 13M8 1.5c3 3.5 3 9.5 0 13\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"/></svg>",
};

function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup;
  return t.content.firstElementChild;
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll(':scope > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  const navDrops = navSections ? navSections.querySelectorAll('.nav-drop') : [];
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }
  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

function buildUtilityBar(section) {
  const bar = document.createElement('div');
  bar.className = 'utility-bar';
  const brands = document.createElement('div');
  brands.className = 'utility-brands';
  const links = [...section.querySelectorAll('p a')];
  const [synopsys, ansys, ask] = [links[0], links[1], links[links.length - 1]];
  if (synopsys) { synopsys.replaceChildren(svg(SVG.wordmark)); synopsys.setAttribute('aria-label', 'Synopsys'); brands.append(synopsys); }
  const divider = document.createElement('span');
  divider.className = 'utility-divider';
  brands.append(divider);
  if (ansys) { ansys.replaceChildren(svg(SVG.ansys)); ansys.setAttribute('aria-label', 'Ansys'); brands.append(ansys); }
  bar.append(brands);
  const tools = document.createElement('div');
  tools.className = 'utility-tools';
  const langs = section.querySelector('ul');
  if (langs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'utility-lang';
    btn.append(svg(SVG.globe), document.createTextNode(langs.querySelector('li')?.textContent.trim() || 'English'));
    btn.setAttribute('aria-haspopup', 'listbox');
    tools.append(btn);
  }
  if (ask && ask !== ansys && ask !== synopsys) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'utility-ask';
    btn.textContent = ask.textContent.trim();
    tools.append(btn);
  }
  bar.append(tools);
  return bar;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const sections = [...fragment.children].map((s) => s.querySelector('.default-content-wrapper') || s);
  const hasUtility = sections.length >= 4;
  const [utility, brandSec, navSec, toolsSec] = hasUtility ? sections : [null, ...sections];

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  if (utility) wrapper.append(buildUtilityBar(utility));

  const row = document.createElement('div');
  row.className = 'nav-row';
  const nav = document.createElement('nav');
  nav.id = 'nav';

  // brand: keep the authored link (editable text moves inside, visually hidden), inline the logo
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const brandLink = brandSec && brandSec.querySelector('a');
  if (brandLink) {
    const text = document.createElement('span');
    text.className = 'nav-brand-text';
    text.append(...brandLink.childNodes);
    brandLink.append(svg(SVG.logo), text);
    brand.append(brandLink);
  }
  nav.append(brand);

  // sections (mega menu)
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  const list = navSec && navSec.querySelector('ul');
  if (list) {
    list.querySelectorAll(':scope > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
    navSections.append(list);
  }
  nav.append(navSections);

  // tools: search glyph link + Contact Sales button + hamburger
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (toolsSec) {
    [...toolsSec.querySelectorAll('p')].forEach((p) => {
      const a = p.querySelector('a');
      if (!a) return;
      if (a.classList.contains('button')) { p.classList.add('nav-cta'); tools.append(p); return; }
      const txt = document.createElement('span');
      txt.className = 'nav-search-text';
      txt.append(...a.childNodes);
      a.append(svg(SVG.search), txt);
      p.classList.add('nav-search');
      tools.append(p);
    });
  }
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-controls', 'nav');
  btn.setAttribute('aria-label', 'Open navigation');
  const open = svg(SVG.burger); open.classList.add('hamburger-open');
  const close = svg(SVG.close); close.classList.add('hamburger-close');
  btn.append(open, close);
  btn.addEventListener('click', () => toggleMenu(nav, navSections));
  hamburger.append(btn);
  tools.append(hamburger);
  nav.append(tools);
  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  row.append(nav);
  wrapper.append(row);
  block.append(wrapper);

  // pin the nav row once the utility bar has scrolled away (source: fixed nav after 53px)
  const update = () => {
    const threshold = isDesktop.matches ? (wrapper.querySelector('.utility-bar')?.getBoundingClientRect().height || 53) : 0;
    row.classList.toggle('is-pinned', window.scrollY >= threshold && threshold > 0);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
