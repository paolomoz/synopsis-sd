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
