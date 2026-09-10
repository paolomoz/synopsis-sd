import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * header — synopsys.com chrome, template-slotted (#95) from the authored /nav document.
 *
 * /nav sections (fixed contract):
 *   0. utility bar: <p><a>Synopsys</a></p><p><a>Ansys</a></p><ul>languages</ul><p><a>Ask</a></p>
 *   1. brand:       <p><a href="/">Synopsys</a></p>
 *   2. sections:    <ul><li>Trigger<ul>groups</ul></li>…</ul>   (mega menu, see model below)
 *   3. tools:       <p><a>Search Synopsys.com</a></p><p><strong><a>Contact Sales</a></strong></p>
 *
 * Mega-menu model (section 2, default content only — lifted from the source .dropdown[data-menu]):
 *   group  <li><a><img>Header</a><ul>items</ul></li>  column; header link + icon optional, or text-only
 *   item   <li><a><img?>Title</a><em>Subtitle</em></li>  icon and subtitle optional; external host → glyph
 *   promo  <li><img><a>Title</a><em>Description</em><a>CTA</a></li>   (image, no nested list) → grey card
 *   footer <li><strong><a>View all …</a></strong></li>   panel footer link
 * Panels: white 16px card + caret under the trigger, left = min(trigger.left, centered); open on
 * hover/focus (desktop), tap-to-drill with Back (mobile). A text-only group next to icon-header groups
 * renders as the "By Function" strip under the grey product card (source: Products panel).
 *
 * Theme: page metadata `header-theme: dark` (source: .component-nav-top[data-color-theme=dark]) makes
 * the unpinned nav row transparent over the hero with white brand/links; pinned row is always white.
 * Search: the source opens a right-hand search panel (Coveo); replicated as a UI panel posting to the
 * live search endpoint. Authored elements are MOVED into the slots (EW1/EW3); glyphs are inlined brand assets.
 *
 * @ew-exempt <p> utility "Ask" and language list — rendered as buttons (EW7); text-as-control
 */

const isDesktop = window.matchMedia('(min-width: 1130px)');
const SVG = {
  wordmark: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 276.32 60.13\" role=\"img\" aria-label=\"Synopsys\"> <g data-name=\"logo\"> <path d=\"M19.24 7c0-1.84-.92-3.23-5-3.23s-5 1.39-5 3.23v5a5.43 5.43 0 0 0 2 4.28L25 28.18A7.75 7.75 0 0 1 28.2 34v7.52c0 4.48-5.27 7-14 7C4.61 48.47 0 46.3 0 41.49V35h8.7v6.26c0 2.25 1.71 3.56 5.53 3.56 3.56 0 5.27-1.31 5.27-3.56v-6.69c0-1.65-.66-2.9-2.51-4.55L4.22 18.88c-2.37-2-3.69-3.62-3.69-6.06V7.09c0-4.68 4.88-7 13.7-7C24 .1 27.94 2.41 27.94 6.76v6.06h-8.7ZM103.13 8c0-4.68 3.55-8 15.29-8s15.28 3.36 15.28 8v32.33c0 4.68-3.56 8-15.29 8s-15.29-3.36-15.29-8Zm8.69 32.15c0 2.64 1.06 4.49 6.59 4.49s6.59-1.81 6.59-4.45v-32c0-2.64-1-4.48-6.58-4.48s-6.6 1.84-6.6 4.48ZM138.51.39h13.84c11.21 0 14.5 1.85 14.5 7.25v11.67c0 5.4-3.3 7.25-14.5 7.25h-5.14V48h-8.7Zm12.92 22.47c3.95 0 6.72-.52 6.72-3V7.05c0-2.44-2.77-3-6.72-3h-4.22v18.81ZM188.57 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.8 7.8 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.23-2.18-14.23-7v-6.51H178v6.26c0 2.24 1.71 3.56 5.53 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.65-2.9-2.5-4.54l-12.75-11.14c-2.38-2-3.69-3.62-3.69-6.06V7c0-4.68 4.87-7 13.71-7 9.75 0 13.7 2.3 13.7 6.66v6.06h-8.7ZM252.76 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.77 7.77 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.24-2.18-14.24-7v-6.51h8.71v6.26c0 2.24 1.72 3.56 5.54 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.66-2.9-2.5-4.54l-12.81-11.14c-2.37-2-3.69-3.62-3.69-6.06V7c0-4.67 4.88-7 13.71-7 9.75 0 13.71 2.31 13.71 6.66v6.06h-8.7ZM55.12.4h8.71L44.77 60.13h-8.71L55.12.4zM41.38 37.5 29.6.5h8.71l7.42 23.33-4.35 13.67zM224.35.4h8.71L214 60.13h-8.71L224.35.4zM210.66 37.39 198.87.4h8.71l7.43 23.32-4.35 13.67zM97.76 48V7.65c0-5.4-3.3-7.25-14.5-7.25H66.54V48h8.7V4.1h7.16c4 0 6.72.52 6.72 3V48ZM265.1 6.27a5.61 5.61 0 1 1 5.63 5.56 5.53 5.53 0 0 1-5.63-5.56Zm5.63 4.63a4.47 4.47 0 0 0 4.48-4.63 4.5 4.5 0 1 0-9 0 4.48 4.48 0 0 0 4.52 4.63Zm-1.18-1.42h-1V3.09H271c1.51 0 2.26.56 2.26 1.82a1.67 1.67 0 0 1-1.66 1.76l1.82 2.81h-1.08l-1.69-2.77h-1.12Zm1.16-3.59c.82 0 1.56-.06 1.56-1 0-.79-.72-.94-1.39-.94h-1.33v2Z\"> </path> </g> </svg>",
  ansys: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"51\" height=\"16\" viewBox=\"0 0 51 16\" fill=\"none\"> <path d=\"M23.3035 4.56832C23.8231 5.1848 24.075 6.11744 24.075 7.35041V12.6617H21.3825V7.47687C21.3825 6.87619 21.2723 6.44939 21.0518 6.16486C20.8314 5.89613 20.485 5.75387 20.0284 5.75387C19.4615 5.75387 19.0207 5.92775 18.6743 6.29132C18.3279 6.65489 18.1704 7.12911 18.1704 7.72979V12.6617H15.4779V3.87279H18.0917V5.12157C18.4066 4.64735 18.8002 4.28378 19.3041 4.03087C19.7922 3.77795 20.359 3.65149 20.9731 3.65149C22.0123 3.65149 22.7996 3.96764 23.3035 4.56832Z\" fill=\"white\"></path> <path d=\"M27.0351 12.5352C26.3581 12.3455 25.7755 12.0767 25.2874 11.7448L25.9959 9.87952C26.4683 10.1957 27.0036 10.4486 27.5705 10.6383C28.1373 10.8122 28.7199 10.907 29.3025 10.907C29.7119 10.907 30.0425 10.8438 30.2787 10.7015C30.5149 10.5592 30.6251 10.3696 30.6251 10.1324C30.6251 9.91114 30.5464 9.75307 30.3889 9.62661C30.2315 9.50015 29.9323 9.4053 29.4914 9.31046L28.0586 8.99431C27.2083 8.80463 26.5942 8.50429 26.1849 8.1091C25.7912 7.71392 25.5865 7.16066 25.5865 6.46514C25.5865 5.91188 25.744 5.43766 26.0589 5.01086C26.3738 4.59987 26.8147 4.26792 27.3973 4.03081C27.9799 3.7937 28.6254 3.66724 29.3655 3.66724C29.9953 3.66724 30.6094 3.76208 31.2077 3.95177C31.806 4.14146 32.3414 4.41018 32.8137 4.75794L32.1052 6.54417C31.1762 5.89607 30.263 5.57993 29.3497 5.57993C28.9403 5.57993 28.6097 5.65896 28.3735 5.80123C28.1373 5.94349 28.0113 6.14899 28.0113 6.41771C28.0113 6.6074 28.0901 6.76548 28.2318 6.86032C28.3735 6.97097 28.6254 7.06582 28.9876 7.16066L30.4677 7.50842C31.3652 7.71392 32.0107 8.01426 32.4201 8.42525C32.8295 8.83624 33.0342 9.3895 33.0342 10.1008C33.0342 10.9544 32.7035 11.6183 32.0265 12.0926C31.3494 12.5826 30.4204 12.8197 29.2552 12.8197C28.4522 12.8197 27.7122 12.7248 27.0351 12.5352Z\" fill=\"white\"></path> <path d=\"M45.0009 12.5352C44.3239 12.3455 43.7413 12.0767 43.2532 11.7448L43.9617 9.87952C44.4341 10.1957 44.9694 10.4486 45.5363 10.6383C46.1031 10.8122 46.6857 10.907 47.2683 10.907C47.6777 10.907 48.0083 10.8438 48.2445 10.7015C48.4807 10.5592 48.5909 10.3696 48.5909 10.1324C48.5909 9.91114 48.5122 9.75307 48.3547 9.62661C48.1973 9.50015 47.8981 9.4053 47.4572 9.31046L46.0244 8.99431C45.1741 8.80463 44.5601 8.50429 44.1507 8.1091C43.757 7.71392 43.5523 7.16066 43.5523 6.46514C43.5523 5.91188 43.7098 5.43766 44.0247 5.01086C44.3396 4.59987 44.7805 4.26792 45.3631 4.03081C45.9457 3.7937 46.5912 3.66724 47.3313 3.66724C47.9611 3.66724 48.5752 3.76208 49.1735 3.95177C49.7718 4.14146 50.3072 4.41018 50.7796 4.75794L50.071 6.54417C49.142 5.89607 48.2288 5.57993 47.3155 5.57993C46.9062 5.57993 46.5755 5.65896 46.3393 5.80123C46.1031 5.94349 45.9772 6.14899 45.9772 6.41771C45.9772 6.6074 46.0559 6.76548 46.1976 6.86032C46.3393 6.97097 46.5912 7.06582 46.9534 7.16066L48.4335 7.50842C49.331 7.71392 49.9765 8.01426 50.3859 8.42525C50.7953 8.83624 51 9.3895 51 10.1008C51 10.9544 50.6693 11.6183 49.9923 12.0926C49.3152 12.5826 48.3862 12.8197 47.2211 12.8197C46.418 12.8197 45.678 12.7248 45.0009 12.5352Z\" fill=\"white\"></path> <path d=\"M5.3535 0L0 12.6617H3.65298L8.81754 0H5.3535Z\" fill=\"white\"></path> <path d=\"M9.44735 0.411011L7.71533 4.66319L10.9747 12.6617H14.6434L9.44735 0.411011Z\" fill=\"white\"></path> <path d=\"M40.5449 3.8728L38.3405 9.07342L36.1361 3.8728H33.4751L37.0179 12.2033L35.4433 15.9022H38.1043L43.2059 3.8728H40.5449Z\" fill=\"white\"></path> </svg>",
  logo: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 276.32 60.13\" width=\"166\" role=\"img\" aria-label=\"Synopsys\"><g data-name=\"logo\"><path d=\"M19.24 7c0-1.84-.92-3.23-5-3.23s-5 1.39-5 3.23v5a5.43 5.43 0 0 0 2 4.28L25 28.18A7.75 7.75 0 0 1 28.2 34v7.52c0 4.48-5.27 7-14 7C4.61 48.47 0 46.3 0 41.49V35h8.7v6.26c0 2.25 1.71 3.56 5.53 3.56 3.56 0 5.27-1.31 5.27-3.56v-6.69c0-1.65-.66-2.9-2.51-4.55L4.22 18.88c-2.37-2-3.69-3.62-3.69-6.06V7.09c0-4.68 4.88-7 13.7-7C24 .1 27.94 2.41 27.94 6.76v6.06h-8.7ZM103.13 8c0-4.68 3.55-8 15.29-8s15.28 3.36 15.28 8v32.33c0 4.68-3.56 8-15.29 8s-15.29-3.36-15.29-8Zm8.69 32.15c0 2.64 1.06 4.49 6.59 4.49s6.59-1.81 6.59-4.45v-32c0-2.64-1-4.48-6.58-4.48s-6.6 1.84-6.6 4.48ZM138.51.39h13.84c11.21 0 14.5 1.85 14.5 7.25v11.67c0 5.4-3.3 7.25-14.5 7.25h-5.14V48h-8.7Zm12.92 22.47c3.95 0 6.72-.52 6.72-3V7.05c0-2.44-2.77-3-6.72-3h-4.22v18.81ZM188.57 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.8 7.8 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.23-2.18-14.23-7v-6.51H178v6.26c0 2.24 1.71 3.56 5.53 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.65-2.9-2.5-4.54l-12.75-11.14c-2.38-2-3.69-3.62-3.69-6.06V7c0-4.68 4.87-7 13.71-7 9.75 0 13.7 2.3 13.7 6.66v6.06h-8.7ZM252.76 6.92c0-1.85-.92-3.23-5-3.23s-5 1.38-5 3.23v5a5.45 5.45 0 0 0 2 4.28l13.84 11.86a7.77 7.77 0 0 1 3.16 5.8v7.51c0 4.49-5.27 7-14 7-9.62 0-14.24-2.18-14.24-7v-6.51h8.71v6.26c0 2.24 1.72 3.56 5.54 3.56 3.56 0 5.27-1.32 5.27-3.56v-6.66c0-1.64-.66-2.9-2.5-4.54l-12.81-11.14c-2.37-2-3.69-3.62-3.69-6.06V7c0-4.67 4.88-7 13.71-7 9.75 0 13.71 2.31 13.71 6.66v6.06h-8.7ZM55.12.4h8.71L44.77 60.13h-8.71L55.12.4zM41.38 37.5 29.6.5h8.71l7.42 23.33-4.35 13.67zM224.35.4h8.71L214 60.13h-8.71L224.35.4zM210.66 37.39 198.87.4h8.71l7.43 23.32-4.35 13.67zM97.76 48V7.65c0-5.4-3.3-7.25-14.5-7.25H66.54V48h8.7V4.1h7.16c4 0 6.72.52 6.72 3V48ZM265.1 6.27a5.61 5.61 0 1 1 5.63 5.56 5.53 5.53 0 0 1-5.63-5.56Zm5.63 4.63a4.47 4.47 0 0 0 4.48-4.63 4.5 4.5 0 1 0-9 0 4.48 4.48 0 0 0 4.52 4.63Zm-1.18-1.42h-1V3.09H271c1.51 0 2.26.56 2.26 1.82a1.67 1.67 0 0 1-1.66 1.76l1.82 2.81h-1.08l-1.69-2.77h-1.12Zm1.16-3.59c.82 0 1.56-.06 1.56-1 0-.79-.72-.94-1.39-.94h-1.33v2Z\"></path></g></svg>",
  search: "<svg aria-hidden=\"true\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M368 208A160 160 0 1 0 48 208a160 160 0 1 0 320 0zM337.1 371.1C301.7 399.2 256.8 416 208 416C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208c0 48.8-16.8 93.7-44.9 129.1L505 471c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L337.1 371.1z\"></path></svg>",
  burger: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"16\" viewBox=\"0 0 14 16\" fill=\"none\"> <path d=\"M0 2.75C0 2.33437 0.334375 2 0.75 2H13.25C13.6656 2 14 2.33437 14 2.75C14 3.16562 13.6656 3.5 13.25 3.5H0.75C0.334375 3.5 0 3.16562 0 2.75ZM0 7.75C0 7.33437 0.334375 7 0.75 7H13.25C13.6656 7 14 7.33437 14 7.75C14 8.16563 13.6656 8.5 13.25 8.5H0.75C0.334375 8.5 0 8.16563 0 7.75ZM14 12.75C14 13.1656 13.6656 13.5 13.25 13.5H0.75C0.334375 13.5 0 13.1656 0 12.75C0 12.3344 0.334375 12 0.75 12H13.25C13.6656 12 14 12.3344 14 12.75Z\" fill=\"white\"></path> </svg>",
  close: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" viewBox=\"0 0 10 10\" fill=\"none\"> <path d=\"M9.14062 9.84688C9.33438 10.0406 9.65312 10.0406 9.84688 9.84688C10.0406 9.65312 10.0406 9.33438 9.84688 9.14062L5.70625 5L9.84688 0.859375C10.0406 0.665625 10.0406 0.346875 9.84688 0.153125C9.65312 -0.040625 9.33438 -0.040625 9.14062 0.153125L5 4.29375L0.859375 0.153125C0.665625 -0.040625 0.346875 -0.040625 0.153125 0.153125C-0.040625 0.346875 -0.040625 0.665625 0.153125 0.859375L4.29375 5L0.153125 9.14062C-0.040625 9.33438 -0.040625 9.65312 0.153125 9.84688C0.346875 10.0406 0.665625 10.0406 0.859375 9.84688L5 5.70625L9.14062 9.84688Z\" fill=\"black\"></path> </svg>",
  globe: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" width=\"16\" height=\"16\"><circle cx=\"8\" cy=\"8\" r=\"6.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M1.5 8h13M8 1.5c-3 3.5-3 9.5 0 13M8 1.5c3 3.5 3 9.5 0 13\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"/></svg>",
  external: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" width=\"12\" height=\"12\"><path fill=\"currentColor\" d=\"M352 0c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9L370.7 96 201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L416 141.3l41.4 41.4c9.2 9.2 22.9 11.9 34.9 6.9S512 172.9 512 160V32c0-17.7-14.3-32-32-32H352zM80 32C35.8 32 0 67.8 0 112V432c0 44.2 35.8 80 80 80H400c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32V432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16H192c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z\"/></svg>",
  chevron: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 512\" width=\"8\" height=\"12\"><path fill=\"currentColor\" d=\"M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z\"/></svg>",
};

function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup;
  return t.content.firstElementChild;
}

function isExternal(a) {
  try {
    const u = new URL(a.getAttribute('href'), window.location.href);
    return u.hostname !== window.location.hostname && !u.hostname.endsWith('aem.page') && !u.hostname.endsWith('aem.live') && u.hostname !== 'www.synopsys.com';
  } catch (e) { return false; }
}

/* ---------- mega-menu panel builder (moves authored nodes) ---------- */

/* the pipeline renders mixed <li> content as paragraphs (loose list) and turns <strong><a> into a button:
   restore the authored model before classifying */
function unwrapParagraphs(li) {
  li.querySelectorAll(':scope > p, :scope > div.button-container, :scope > p.button-container').forEach((p) => {
    while (p.firstChild) li.insertBefore(p.firstChild, p);
    p.remove();
  });
  li.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  return li;
}

function classifyGroup(li) {
  if (li.querySelector(':scope > ul')) return 'group';
  if (li.querySelector(':scope > strong > a')) return 'footer';
  if (li.querySelector(':scope > picture, :scope > img, :scope > p > picture, :scope > p > img')) return 'promo';
  return 'group';
}

function buildItem(li) {
  li.className = 'menu-item';
  const a = li.querySelector(':scope > a');
  const em = li.querySelector(':scope > em');
  if (a) {
    a.className = 'menu-item-link';
    const icon = a.querySelector('picture, img');
    const title = document.createElement('span');
    title.className = 'menu-item-title';
    [...a.childNodes].forEach((n) => { if (n !== icon) title.append(n); });
    if (icon) { const wrap = document.createElement('span'); wrap.className = 'menu-item-icon'; wrap.append(icon); a.append(wrap); }
    a.append(title);
    if (isExternal(a)) { a.classList.add('is-external'); title.append(svg(SVG.external)); }
  }
  if (em) { em.className = 'menu-item-subtitle'; if (a) a.append(em); }
  return li;
}

function buildGroup(li) {
  li.className = 'menu-group';
  const list = li.querySelector(':scope > ul');
  const header = document.createElement('div');
  header.className = 'menu-group-header';
  const headerLink = li.querySelector(':scope > a');
  const headNodes = [...li.childNodes].filter((n) => n !== list);
  if (headerLink) {
    const icon = headerLink.querySelector('picture, img');
    if (icon) { const w = document.createElement('span'); w.className = 'menu-group-icon'; w.append(icon); headerLink.prepend(w); li.classList.add('has-icon'); }
    header.append(headerLink);
    headNodes.filter((n) => n !== headerLink && n.nodeType === Node.TEXT_NODE && !n.textContent.trim()).forEach((n) => n.remove());
  } else {
    const span = document.createElement('span');
    headNodes.forEach((n) => span.append(n));
    header.append(span);
    li.classList.add('text-header');
  }
  if (header.textContent.trim()) li.prepend(header); else header.remove();
  if (list) { list.className = 'menu-list'; [...list.children].forEach(buildItem); li.append(list); }
  return li;
}

function buildPromo(li) {
  li.className = 'menu-promo';
  const media = li.querySelector('picture, img');
  const links = [...li.querySelectorAll(':scope > a, :scope > p > a')];
  const em = li.querySelector('em');
  const card = document.createElement('a');
  card.className = 'menu-promo-card';
  if (links[0]) card.href = links[0].getAttribute('href');
  if (media) { const m = document.createElement('span'); m.className = 'menu-promo-media'; m.append(media.closest('picture') || media); card.append(m); }
  if (links[0]) { const t = document.createElement('span'); t.className = 'menu-promo-title'; t.append(...links[0].childNodes); card.append(t); links[0].remove(); }
  if (em) { em.className = 'menu-promo-desc'; card.append(em); }
  if (links[1]) { const c = document.createElement('span'); c.className = 'menu-promo-cta'; c.append(...links[1].childNodes, svg(SVG.chevron)); card.append(c); links[1].remove(); }
  li.replaceChildren(card);
  return li;
}

function buildFooter(li) {
  li.className = 'menu-footer';
  const a = li.querySelector('a');
  if (a) { a.className = 'menu-footer-link'; a.append(svg(SVG.chevron)); li.replaceChildren(a); }
  return li;
}

function buildPanel(trigger) {
  const list = trigger.querySelector(':scope > ul');
  if (!list) return null;
  const panel = document.createElement('div');
  panel.className = 'menu-panel';
  const inner = document.createElement('div');
  inner.className = 'menu-panel-inner';
  const groups = []; let promo = null; let footer = null; const textGroups = [];
  [...list.children].forEach((li) => {
    unwrapParagraphs(li);
    li.querySelectorAll(':scope > ul > li').forEach(unwrapParagraphs);
    const kind = classifyGroup(li);
    if (kind === 'promo') promo = buildPromo(li);
    else if (kind === 'footer') footer = buildFooter(li);
    else { const g = buildGroup(li); (g.classList.contains('text-header') ? textGroups : groups).push(g); }
  });
  // Products layout: icon-header groups inside a grey card, text-header group(s) as the strip beneath
  const productLayout = groups.some((g) => g.classList.contains('has-icon')) && textGroups.length > 0;
  const columns = document.createElement('div');
  columns.className = 'menu-columns';
  if (productLayout) {
    panel.classList.add('is-product');
    const card = document.createElement('div'); card.className = 'menu-card';
    groups.forEach((g) => card.append(g));
    columns.append(card);
    const strip = document.createElement('div'); strip.className = 'menu-strip';
    textGroups.forEach((g) => strip.append(g));
    if (footer) strip.append(footer);
    inner.append(columns, strip);
  } else {
    [...groups, ...textGroups].forEach((g) => columns.append(g));
    if (footer) { const first = columns.firstElementChild; if (first) first.append(footer); else columns.append(footer); }
    inner.append(columns);
    if (promo) inner.append(promo);
  }
  if (productLayout && promo) inner.append(promo);
  panel.style.setProperty('--menu-cols', String(Math.max(1, groups.length + textGroups.length * (productLayout ? 0 : 1))));
  panel.append(inner);
  list.remove();
  return panel;
}

/* ---------- open/close ---------- */

function positionPanel(trigger, row) {
  const panel = trigger.querySelector(':scope > .menu-panel');
  if (!panel || !isDesktop.matches) return;
  panel.style.left = '';
  const pw = panel.getBoundingClientRect().width;
  const vw = document.documentElement.clientWidth;
  const tr = trigger.getBoundingClientRect();
  const centered = Math.max(16, (vw - pw) / 2);
  const left = Math.min(tr.left, centered);
  panel.style.left = `${Math.round(left - tr.left)}px`;
  panel.style.setProperty('--caret-x', `${Math.round(tr.left + tr.width / 2 - left)}px`);
  const rowRect = row.getBoundingClientRect();
  panel.style.top = `${Math.round(rowRect.bottom - tr.bottom - 7)}px`;
}

function closeAll(navSections) {
  navSections.querySelectorAll(':scope > ul > li[aria-expanded="true"]').forEach((li) => li.setAttribute('aria-expanded', 'false'));
  navSections.classList.remove('has-open');
}

function openTrigger(trigger, navSections, row) {
  closeAll(navSections);
  trigger.setAttribute('aria-expanded', 'true');
  navSections.classList.add('has-open');
  positionPanel(trigger, row);
}

function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  closeAll(navSections);
  navSections.classList.remove('is-drilled');
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
}

/* ---------- utility bar ---------- */

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

/* ---------- search panel (source: right-hand "Search Synopsys" panel, Coveo-backed) ---------- */

function buildSearch(link) {
  const wrap = document.createElement('div');
  wrap.className = 'nav-search';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-search-button';
  btn.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'nav-search-text';
  label.append(...link.childNodes);
  btn.append(svg(SVG.search), label);
  const panel = document.createElement('div');
  panel.className = 'nav-search-panel';
  panel.hidden = true;
  const head = document.createElement('div');
  head.className = 'nav-search-head';
  const title = document.createElement('span'); title.textContent = 'Search Synopsys';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'nav-search-cancel'; cancel.textContent = 'Cancel';
  head.append(title, cancel);
  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role', 'search');
  form.action = new URL(link.getAttribute('href') || '/search', window.location.href).href.replace(/\/search$/, 'https://www.synopsys.com/search.html');
  form.method = 'get';
  const input = document.createElement('input');
  input.type = 'search'; input.name = 'q'; input.placeholder = 'Search'; input.setAttribute('aria-label', 'Search Synopsys.com');
  form.append(svg(SVG.search), input);
  panel.append(head, form);
  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('nav-search-open', open);
    if (open) input.focus();
  };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  cancel.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
  wrap.append(btn, panel);
  return wrap;
}

/* ---------- decorate ---------- */

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  const theme = (getMetadata('header-theme') || '').trim().toLowerCase();
  if (theme === 'dark') { document.body.classList.add('header-dark'); block.closest('header')?.classList.add('is-dark'); }

  block.textContent = '';
  const sections = [...fragment.children].map((s) => s.querySelector('.default-content-wrapper') || s);
  const hasUtility = sections.length >= 4;
  const [utility, brandSec, navSec, toolsSec] = hasUtility ? sections : [null, ...sections];

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  const utilityBar = utility ? buildUtilityBar(utility) : null;
  if (utilityBar) wrapper.append(utilityBar);

  const row = document.createElement('div');
  row.className = 'nav-row';
  const nav = document.createElement('nav');
  nav.id = 'nav';

  // brand
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

  // sections → triggers + panels
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  const list = navSec && navSec.querySelector('ul');
  let hoverTimer = null;
  if (list) {
    list.className = 'nav-triggers';
    [...list.children].forEach((trigger) => {
      trigger.className = 'nav-trigger';
      const panel = buildPanel(trigger);
      const labelNodes = [...trigger.childNodes].filter((n) => n !== panel);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'nav-trigger-label';
      labelNodes.forEach((n) => label.append(n));
      trigger.prepend(label);
      if (panel) {
        trigger.classList.add('nav-drop');
        trigger.setAttribute('aria-expanded', 'false');
        label.setAttribute('aria-haspopup', 'true');
        trigger.append(panel);
        // desktop: hover/focus; mobile: tap drills into the panel
        trigger.addEventListener('mouseenter', () => { if (!isDesktop.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => openTrigger(trigger, navSections, row), 120); });
        trigger.addEventListener('mouseleave', () => { if (!isDesktop.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => closeAll(navSections), 160); });
        label.addEventListener('click', () => {
          const open = trigger.getAttribute('aria-expanded') === 'true';
          if (isDesktop.matches) { if (open) closeAll(navSections); else openTrigger(trigger, navSections, row); } else { openTrigger(trigger, navSections, row); navSections.classList.add('is-drilled'); }
        });
        label.addEventListener('focus', () => { if (isDesktop.matches) openTrigger(trigger, navSections, row); });
        // mobile back bar inside the panel
        const back = document.createElement('button');
        back.type = 'button'; back.className = 'menu-back'; back.textContent = 'Back';
        back.addEventListener('click', () => { closeAll(navSections); navSections.classList.remove('is-drilled'); });
        const backLabel = document.createElement('span'); backLabel.className = 'menu-back-title'; backLabel.textContent = label.textContent.trim();
        const backBar = document.createElement('div'); backBar.className = 'menu-back-bar'; backBar.append(back, backLabel);
        panel.prepend(backBar);
      }
    });
    navSections.append(list);
  }
  nav.append(navSections);

  // tools: search panel + Contact Sales + hamburger
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (toolsSec) {
    [...toolsSec.querySelectorAll('p')].forEach((p) => {
      const a = p.querySelector('a');
      if (!a) return;
      if (a.classList.contains('button')) { p.classList.add('nav-cta'); tools.append(p); return; }
      tools.append(buildSearch(a));
      p.remove();
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

  // mobile-only footer of the menu: Contact Sales + utility links (source: .cta-mobile-holder)
  if (list) {
    const mobileFoot = document.createElement('div');
    mobileFoot.className = 'nav-mobile-foot';
    const cta = tools.querySelector('.nav-cta a');
    if (cta) { const c = cta.cloneNode(true); c.className = 'button primary nav-mobile-cta'; mobileFoot.append(c); }
    if (utilityBar) {
      const ub = document.createElement('div'); ub.className = 'nav-mobile-utility';
      utilityBar.querySelectorAll('.utility-tools button').forEach((b) => ub.append(b.cloneNode(true)));
      mobileFoot.append(ub);
    }
    navSections.append(mobileFoot);
  }

  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => { toggleMenu(nav, navSections, isDesktop.matches); closeAll(navSections); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(navSections); });
  document.addEventListener('click', (e) => { if (isDesktop.matches && !nav.contains(e.target)) closeAll(navSections); });

  row.append(nav);
  wrapper.append(row);
  block.append(wrapper);

  // pin the nav row once the utility bar has scrolled away (source: fixed nav after 53px)
  const update = () => {
    const threshold = isDesktop.matches ? (utilityBar?.getBoundingClientRect().height || 53) : 0;
    const pinned = window.scrollY >= threshold && threshold > 0;
    row.classList.toggle('is-pinned', pinned);
    const opened = navSections.querySelector(':scope > ul > li[aria-expanded="true"]');
    if (opened && isDesktop.matches) positionPanel(opened, row);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
