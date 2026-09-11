# EDS conversion log — synopsys.com replica → paolomoz/synopsis-sd

Flow: `replica` (same-design re-platform). Archetype pilot: program template
(`/verification/simulation/vcs`). Prototype: `stardust/prototypes/vcs-proposed.html`
(gated 1440 @ 0.32% / 360 @ 1.68%, Δ0, 0 structural red — `stardust/replica/progress.json`).

## Runtime contract
`stardust/runtime-contract.json` — vanilla aem-boilerplate: formatted-only buttonization
(`<strong><a>` → `a.button.primary` in `p.button-wrapper`, `<em><a>` → `.secondary`),
`decorateBlock` adds `.block` + `.<name>-wrapper` / `.<name>-container`, `wrapTextNodes` on.
The client runtime has NO section-metadata handling (`grep section-metadata scripts/aem.js` → none);
section `style` / `anchor` rows are rendered server-side by the delivery pipeline (rendering v2).
Harness renders therefore show the metadata rows as text and no tinted bands — harness-only.

## Locked names + decode tiers (Step 2 / 2b)
| prototype section | EDS | tier | notes |
|---|---|---|---|
| component-breadcrumb | `breadcrumbs` block | template-slotted | one `<ul>` of links; live dropdown menus (49 hidden links) deliberately dropped — plain trail in EDS |
| skinny-banner (title) | `hero` block | template-slotted | `<h1>` + `<em><a>` secondary CTA; gradient in CSS |
| toc | `anchor-nav` block | template-slotted | `<ul>` of `#anchor` links + `<strong><a>` CTA; targets via section-metadata `anchor: <id>`; pins at nav height with 42px placeholder (mirrors live) |
| textcomp title + text | default content | — | h2 + paragraphs; `.default-content-wrapper` rules in styles.css |
| key benefits row | `cards benefits` | reconstructive (collection name, D11) | one row per card: icon img \| title p |
| two-col features | `columns features` | reconstructive (collection) | one row: prose cell \| image cell |
| resources carousel | `carousel resources` | reconstructive (collection) | one row per card: `<p><strong>type</strong></p><h3>title</h3><p><a>link</a></p>`; 6 real cards (live DOM carries 9 slick clones) |
| skinny-banner (connect) | `hero connect` | template-slotted | `<h2>` + `<em><a>` |
| utility bar + nav | `header` block + `/nav` | template-slotted | 4 sections: utility / brand / sections / tools; wordmarks + glyphs inline SVG (fixed brand assets); nav row pins after utility bar scrolls (live behaviour) |
| site footer | `footer` block + `/footer` | template-slotted | 4 link columns, languages (→ `<select>`), social (glyph by host), legal line; mobile accordion |

Section style vocabulary: `tinted` (mist band) only. Section `anchor` key → `data-anchor` → id.

## Gates (pre-deploy)
- `davids-model-lint content/` — PASS, 0 🔴; 4 🟡 D1 default-content candidates (hero ×2, breadcrumbs,
  anchor-nav — genuine bespoke widgets/compositions, kept as blocks); 1 🟡 SVG purity (3 icons verified pure vector).
- `localize-links --check` — PASS; kept absolutes: `/` and `/search` on www.synopsys.com (not in the migration set yet).
- token completeness (`comm -23`) — empty. No absolute-origin asset refs in blocks.
- `block-roundtrip` — hero ×2, anchor-nav, cards, columns: closed (0 🔴). breadcrumbs: 49 🔴 = live dropdown
  menus (deliberate drop, above). carousel: 24 🔴 = (a) 6 ROLE SWAP h4→h3 card-title canonicalization
  (deploy SKILL heading-outline rule vs the live h4 the classifier reads as body) and (b) 9 slick clone
  slides not authored. Both recorded here as justified.
- EW editability: 41/41 editable, 0 dead, 0 duplicated; edit-mode drift 0 texts; columns block Δh −20px
  (editor wrapper around the image column) — advisory.
- qa-gate (harness): all blocks loaded + non-empty, full-bleed hero/anchor-nav/breadcrumbs span the viewport,
  one `<h1>`. 3 "units" fails are schema-order mis-attributions (prototype nav/mega-menu sections precede
  the page sections in the schema) — verified manually: cards renders 3/3, carousel 6/6.
- harness eyeball 1440 + 360: layout matches the prototype (chrome from the remote boilerplate `/nav`
  until the authored nav/footer documents are published).

## Fonts
Roboto 300/400/500/700 (Apache 2.0) converted from the source TTFs to woff2 (`fonts/`), declared in
`styles/fonts.css`; `roboto-fallback` = local Arial with the published Roboto calibration
(size-adjust 100.11%, ascent 92.67%, descent 24.39%) in `styles/styles.css`.

## Images
Key-benefit icons: authored as fully-qualified source-CDN SVGs (`www.synopsys.com/content/dam/synopsys/icon/…`)
because the DA media upload was blocked by an expired `DA_TOKEN`; re-point to
`https://content.da.live/paolomoz/synopsis-sd/media/icons/…` after `stardust/scripts/deploy-vcs.sh` uploads them.
Diagram: `images.synopsys.com` Dynamic Media rendition (external, D4). Logos: inline SVG in the chrome blocks.

## Deploy state
Code pushed to `main` (AEM Code Sync). Content (`content/nav.html`, `content/footer.html`,
`content/verification/simulation/vcs.html`) NOT yet written to DA — `DA_TOKEN` expired (401 on
`admin.da.live`). Resume: refresh the token in `/Users/paolo/.claude/.env`, then run
`stardust/scripts/deploy-vcs.sh` (uploads icons, sanitises, PUTs, previews, publishes, verifies
`.plain.html` + computed-style guard).

## Anti-patterns avoided / notes for the next archetype
- Chrome is template-slotted from a fixed 4/7-section document contract — do not parse heuristically.
- Every block MOVES authored elements; no textContent/innerHTML copies (EW gate 41/41).
- Section heads are default content; blocks never wrap prose (D1).
- Next archetypes (state.json `pending`): landing (index), static (company), listing (blogs), article,
  form (gated success story), unique (author). Each needs its own gated prototype first (replica Phase 3),
  then siblings via `migrate` at sibling tier + `rollout`.

## Published-origin gate (2026-09-09)
Delivered: https://main--synopsis-sd--paolomoz.aem.live/verification/simulation/vcs (+ /nav, /footer).
Fixes found only on the published origin: header reservation ground (black → white), anchor-nav pinned
before its section had geometry (offsetParent guard + re-run on load), `columns` mobile order (image-first
boilerplate default), breadcrumb caret glyph, utility globe glyph, tile-title 56px clamp, mobile head-to-block
rhythm (55/55/31px). Final: 1440 1.93% Δ0 (header 99.60 / toc 98.43 / footer 99.89); 360 3.87% Δ0 (header 98.34 / footer 98.01).


## Full-site migration (2026-09-10)
Inventory 4,187 en-US URLs → 4,184 fetched (`stardust/scripts/fetch-all.py`) → imported by
`stardust/scripts/importer.py` (AEM grid walk → default content + blocks; coverage in `stardust/import-coverage.json`)
→ sanitised → `localize-links` (CHECK PASS) → `deploy-batch` (ledger-resumable). Content tree committed under `content/`.

Template gates on the published origin (1440): form PASS 6.51%; article, people and photo-hero program pages
were brought to structural parity in ≤5 rounds each (see `stardust/replica/progress.json#pageTypes`). Fixes:
- importer: blog "Browse by Tags" panel skipped by heading/tag-count (its `browseByTagsHolder` class is added by live JS);
  leadership rows with a single portrait column map to `cards people`.
- hero: `image`/`video` variants are 500px, centered, 48/700 title, 24/300 subtitle (carousel keeps 700px left copy).
- article: default-content wrappers are BFCs beside the floated rail, so the reading column is placed by a
  292px left margin, not padding; rail toc 24/300 title + 2px rule; form unboxed in the rail; mobile toc = collapsible bar.
- people: lone leader = 250px portrait in the first third; stacked people sections share rhythm; mobile 1-up 70%.
- gated form pages: form panel first on mobile (live order).

Documented residuals (not reproducible from static HTML): live sticky article rail (`two2575PinnedLeft`) duplicated in
stitched screenshots; `implementation-and-signoff/signoff` served with a JS-injected product-solutions theme (floating nav
card, grey benefit tiles, bold h2) while identical markup on VCS renders the classic theme; Marketo progressive-profiling
field sets and form titles; Coveo blog sub-nav/search facets; dwProductsDownloads (159 pages) and contentTypeListing (11)
are JS-driven and left as empty gaps. Lint: 12 🔴, all D15 code-sample pages (API/training docs), accepted.
Note: aem.live serves code assets gzip-encoded — decode before grepping when verifying propagation.

## Full-site rollout result (2026-09-10)
Batch 1 drove 4,168 pages: 3,680 live, 506 failed. Failure classes → fixes:
- 415 (321): page names with dots / query strings / `.php` (`articles/category.automotive`, `dw/ipdir.php?c=DW01_add`) →
  importer `slug_path()` (lowercase a-z0-9- segments, `.php`/`.html` dropped, query values appended as segments);
  444 inventory URLs remapped, and `localize()` rewrites internal links through the same map so no redirects are needed.
- 409 (42): html2md rejects SVG images over 40KB → `stardust/scripts/svg-fix.mjs` rasterises them with Playwright to PNG
  on DA media (`/media/svg/`, map in `stardust/svg-map.json`), 64 images.
- 404 (52) / put-fail (37): `.pdf`-style and query paths → covered by slugging.
- verify-fail (25): mixed-case paths (`…/Korea`, `…-SW-Development`) — EDS lowercases, `.plain.html` 404 → slugging.
Final wave re-drove 3,070 pages (all changed by the importer fixes above plus every previously failed page) with `--force`:
3,061 ok. One author archive exceeded html2md's 200-image cap → trimmed to 180 images. 5 of 8 `about:error` verify
failures were transient Dynamic Media fetches and recovered on re-drive.

**Result: 4,183 of 4,186 documents live** (4,184 pages + nav + footer). The 3 remaining pages are published but contain
`about:error` images because their source assets 404 on www.synopsys.com (`…/200_?qlt=82…` Dynamic Media URLs).
Stale duplicates of the 25 mixed-case paths remain in DA under their original names (never previewed); harmless, can be deleted.
Ledger: `content/.deploy-ledger.json` (4,186 entries). Re-run `deploy-batch` with the same arguments to re-drive; the ledger
skips live pages.

## Header re-clone from the chrome state matrix (2026-09-10)
User review: "the header is not properly implemented". The resting header crop had passed (99.6%) but every
other header STATE was unmeasured and wrong. Probed live with `stardust/scripts/probe-menu.mjs` (now the
stardust plugin's `replica/scripts/chrome-states.mjs`):
- **Theme variant**: the nav row is absolute + transparent over the banner carousel on 5 pages (home + 4
  locale homes; marker = `carousel-type="banner-carousel"`, NOT the `data-color-theme="dark"` attribute that
  sits on 4,145 pages). Importer emits `Header-Theme: dark`; header adds `body.header-dark`/`header.is-dark`;
  pinned row stays white (source).
- **Mega menus**: `.dropdown[data-menu]` panels live outside the trigger `<li>`; `stardust/scripts/build-nav.py`
  rebuilds `/nav` section 3 from the associated panels with the model group `<li><a><img>Header</a><ul>…`,
  item `<li><a><img?>Title</a><em>Subtitle</em></li>`, promo `<li><img><a>Title</a><em>Desc</em><a>CTA</a></li>`,
  footer `<li><strong><a>View all</a></strong></li>`. header.js unwraps the pipeline's loose-list paragraphs and
  decorateButtons' button classes before classifying; hover/focus opens (120ms), caret, panel
  `left = min(trigger.left, centered)`, `top = row.bottom − 7`; Products = grey card + row-major By Function strip.
- **Search**: right-hand "Search Synopsys" panel with Cancel + input (posts to the live search); page dimmed.
- **Mobile**: full-height trigger list → drill-down panel with Back bar; promo hidden; Contact Sales + utility at bottom.
Gates (1440, `stardust/replica/gates/chrome-states/`): resting header 99.48%; panels open at the live rects
(Why 346/596, Solutions 273/894, Products 100/1240, top 126). Full-width bands over the rotating hero report
background drift (79–91%) — see the plugin note. Residuals: Brightcove poster in the Why Synopsys promo
(JS-loaded), Coveo "Popular Content" in the search panel, icon-row pitch 38 vs 46px, language/Ask panels.
Learnings tracked in the stardust plugin source: branch `synopsys-chrome-states` in `/Users/paolo/excat/skills`
(`plugins/stardust/notes/chrome-states-learnings-synopsys.md`, recreation-procedure § Chrome interaction states,
source-fidelity-gate item 5, `replica/scripts/chrome-states.mjs`, CHANGELOG Unreleased).

## Random 1:1 review round (2026-09-10)
Ten random live/EDS pairs were reviewed side by side; six carried defects the template gates never saw. Each was
traced to its source component and fixed for every page that uses it (re-import of 4,184 pages, 3,366 changed pages
redeployed with `--force`):
- Rich-text `<table>` → `table` block (a raw table in a DA document becomes a block named after its first cell);
  `header`/`no-header` by bold first row. New `blocks/table`.
- `.component-spotlight` (glossary "Definition") → `spotlight` block (framed callout, indented title). New block.
- Brightcove player/playlist (`data-video-id` / `data-playlist-id`, also inside `htmlTextOnly`) and YouTube →
  `video` block (iframe embed). New block.
- Author pages: `author` block (photo, name, bio, follow) in a `rail-right` section + `cards author` rows built from
  `.cmp-blogsdev__mra-item-container`; the single heading is promoted to h1 (32/300 like the source h2).
- "Continue Reading" `dynamicCards` in a slick carousel → `carousel blog` (images, last link = CTA).
- Text + image columns keep the source span: `columns media narrow` (col-sm-3) / `third` (col-sm-4); intrinsic size, no upscaling.
- Right-rail pages (col-sm-9 + col-sm-3 with rail cards / downloads / CTAs) → `rail-right` section floated beside
  `main` sections; rail cards as purple flag ribbons; `main::after` clears floats before the footer.
- Article left rail: non-TOC/form components become `rail` sections (excluded from the TOC).
- Blog hero full-bleed; technical-bulletin articles get the `slate` gradient; the date/read-time slash is spaced.
- Text components with `text-align-center` → `centered` section style (Continue Reading heading centered purple).
- Gated form pages: wrapper `purpleGradientBackground` / `darkGreyGradientBackground` → `purple` / `dark` section
  styles with white copy; the form title comes from the form column ("Download Now", "Watch On-Demand").
- Asset cards whose image lives only in `data-cmp-data-layer` JSON get it from there.
- `<p><li>` orphan list items are wrapped back into lists.
- 53 images that 404/403 on www.synopsys.com were stripped from 22 pages; one 30MB source JPEG was resized to 2000px
  and served from DA media (html2md rejects it otherwise).
Result: 4,186 of 4,186 documents live (`/verification/resources` recovered on a later re-drive). Learnings recorded in the stardust plugin branch (`notes/chrome-states-learnings-synopsys.md`, addendum).

## Dynamic layer (2026-09-10)
The static replica got its dynamic layer, one gated step at a time (`stardust/dynamic-plan.md`, evidence in
`stardust/dynamic-gates.md`):
- Query index (`stardust/query.yaml` via the config service): title, description, image, template, author, published(+Ts),
  readtime, category, tags, lastModified. The importer now emits Author / Published / Readtime / Category / Tags from
  `.cmp-blogbanner` and the page-tag strip; 1,478 article-family pages re-imported and republished; 4,185 rows indexed.
  Pipeline facts learned: `Tags` renders as `article:tag` properties; multi-valued index properties need `values:`.
- Index-fed blocks: `listing` (105 category pages, page h1 → tag filter on compact keys, pages of 12), `cards author`
  (union of indexed + authored rows), `carousel blog` (related by shared tags).
- RSS feeds per family from the index (code bus), `/search` page + `search` block (header panel posts to it), `share`
  block auto-blocked on article pages, language menu over the five locales, form backend hook via
  `config/marketo-forms.json` (1,500 pages, 17 Marketo form ids, endpoint pending), third-party loader gated by
  `config/third-party.json` (Launch bundle id recorded, hosts empty).
- Blocked / deferred: AEM `contenttypelisting` endpoint (11 pages), Marketo endpoint, Dynamic Media re-hosting (18,814 refs).
- Deploy driver fix: `--force` no longer discards the ledger records outside the run.

## Landing archetype brought to the replica gate (2026-09-11)
The home page had shipped through the importer without a Phase-3 prototype and sat at 21.5% / Δ192 after the earlier
cap. Redone per `stardust:replica`: a gated standalone prototype first (`stardust/prototypes/index-proposed.html`,
`index.css`, built by `stardust/scripts/build-index.py` from the imported content plus values lifted from the live DOM
with `home-live-lift.mjs` / `dom-dump.mjs`), then the port to the EDS blocks, then the published-origin re-gate at both
breakpoints. Evidence: `stardust/replica/gates/index-1440` (harness), `index-pub-1440`, `index-pub-360`; records in
`stardust/replica/progress.json#pageTypes.landing`.
- Harness 1440: 16.1% → 4.4% → 2.66% (Δ-3), content-diff 0 🔴, header 99.94% / footer 99.69%, visual-diff none.
- Published 1440: 21.0% → 4.75% → 2.77% → 2.71% (Δ-2); every section anchor within 2px of live; header 99.88% / footer 99.69%.
- Published 360: never gated before; 29.7% → 14.0% → 10.8% → 10.0% → 7.3% → 6.89% (Δ5); header 100% / footer ≥98%.
Fixes that came out of it: importer keeps grid siblings of a nested wrapper column (the dropped "Design the Future Today
with Synopsys" heading), links benefit item titles, emits asset-card dates and the mobile hero rendition; hero carousel
(560px copy at x=160, 48/700, bottom tab strip, no scrim, mobile image-card composition), pillars (label box, overlay,
375px crop, mobile copy+link), benefits (32px column titles, linked titles surviving the runtime's button wrapping),
logos (single clipped row), news cards (370x208 image cards with dates, mobile controls under the rail), support
columns (divider row, text CTAs), `body.landing` section rhythm at both widths, mobile header pinning, 32x24 toggler.
Pipeline facts: the runtime buttonizes only emphasised lone links (`p.button-wrapper > a.button`, strong dropped);
section-metadata styles resolve at render time; `<p><picture>` baseline; the live home authors several one-line
labels with two or three line boxes (modelled as min-heights on mobile).
