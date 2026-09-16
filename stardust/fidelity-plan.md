# Site-wide fidelity: where we are and how to get every page under 10% (2026-09-15)

Goal set by the owner: **< 10% pixels differing from www.synopsys.com on every page, desktop 1440.**
Metric used here: the infographic's neutral method (`stardust/scripts/site-assess.mjs`): full page, animations frozen,
OneTrust/chat hidden on both sides, **no residual policy**, pixelmatch 0.1, shorter page padded white. The replica
gate's policy regime (JS-only widgets hidden on both sides) is reported alongside as the diagnostic view.

## 1. Where we are — stratified random sample, 156 pages, seed 2026, 2026-09-15

Data: `stardust/replica/site-assessment-2026-09-15/` (per-page table, sample, divergence analysis, policy summary).

| template | pages | share of site | neutral median | neutral p90 | pages < 10% | policy median | Δh > 8px |
|---|---|---|---|---|---|---|---|
| program | 1,411 | 34% | 22.2% | 44.5% | 12% | 20.9% | 47/50 |
| article | 1,280 | 31% | 17.9% | 29.1% | 0% | 13.5% | 41/45 |
| form | 587 | 14% | 26.9% | 32.3% | 5% | 11.4% | 20/20 |
| author | 442 | 11% | 5.7% | 9.3% | **100%** | 5.7% | 11/15 |
| static | 348 | 8% | 19.1% | 47.4% | 33% | 16.0% | 12/12 |
| glossary | 110 | 3% | 13.3% | 18.3% | 38% | 9.2% | 6/8 |
| listing | 5 | — | 27.5% | 38.7% | 0% | 38.2% | 5/5 |
| landing (home) | 1 | — | 2.6% | — | 100% | 2.6% | 0/1 |

**Site-weighted mean: 21.0% (neutral), 17.1% (policy). Share of pages under 10%: 19% (neutral), 37% (policy).**
The infographic's "over 20% on average" is confirmed for the whole site, not just its 12 pages.

Two facts decide the strategy:

1. **Height parity is the lever.** Pixel difference is almost entirely a function of the height mismatch Δh:

   | Δh bucket | pages | median % | under 10% |
   |---|---|---|---|
   | ≤ 8 px | 14 | 5.9% | 10/14 |
   | ≤ 60 px | 44 | 12.6% | 17/44 |
   | ≤ 200 px | 37 | 16.4% | 2/37 |
   | ≤ 600 px | 40 | 27.6% | 0/40 |
   | > 600 px | 21 | 35.4% | 1/21 |

2. **One block breaks the page.** On the 36 worst pages, 70–100% of the differing pixels sit *below* the first
   diverging block (`divergence-worst36.txt`): after the first height break every later row is compared against
   shifted content. Fixing the first break on a page typically recovers most of its score.

Two measurement caveats: (a) one capture (`/blogs/chip-design/edge-ai-in-memory-compute`) caught our page at
viewport height (900 px) before its blocks had rendered — it renders at 3,881 px vs live 3,875 when re-captured, so
the harness needs a retake rule; (b) the live footer varies between 472 and 575 px between captures, a floor of
~1–2% on short pages that no fix removes.

## 2. Root causes, by pages affected (from the divergence table and side-by-side crops)

| # | cause | pages | what live shows | what we show | Δh |
|---|---|---|---|---|---|
| 1 | **Blog sub-navigation bar** ("Silicon to Systems Blog · Search Blogs · Topics", 72 px) is injected by JS on every blog post and category page; not in the source markup, so the importer never saw it | 1,008 posts + 74 category | grey bar above the banner | nothing | −72 then cascade |
| 2 | **Blog banner variants**: live banners are blue/slate gradients with an image per family; ours is one purple gradient | ~1,000 | blue gradient | purple | pixels, no Δh |
| 3 | **Marketo forms render their real field set** (17 distinct form ids; 3 ids cover 2,091 usages) | 587 form pages + 141 webinars + others = 1,500 pages carry a form id | 8–9 fields + notice + submit (≈1,000 px) | 5 generic fields | −200…−300 |
| 4 | **DesignWare "Product Details"**: tabs *Products / Downloads & Documentation* with a product table | 167 | tabs + table (300–750 px) | three "Brochure" asset cards (478 px) | −450…−1,070 |
| 5 | **Category pages** are a two-column archetype: paginated list with thumbnails + sidebar (Stories/Writers counts, Top Writers, filters) | 74 | two columns, 5 items/page | one column, all items | +300…+900 |
| 6 | **Video block**: black `<video>` box without poster, no playlist strip | 117 | poster frame + playlist thumbnails | black box, taller | ±200 |
| 7 | **Webinar speakers column** nested in an empty half column | 141 | image beside name in a row | stacked, full-width images | +280…+340 |
| 8 | **SNUG proceedings**: award entries are boxed asset cards with a label chip | 31 | cards | plain text lines | −480…−1,460 |
| 9 | **Hero video banners** without a poster frame | 11 | first video frame | gradient | pixels |
| 10 | Box links used as a long product index (`/verification/verification-ip`) stack vertically | few | 3-column grid | one column (2,467 px) | +2,000 |
| 11 | Listing pages (`/articles`, `/newsroom`, `/events`…): bespoke layouts | 5 | editorial layout + Coveo list | approximations | ±2,000 |
| 12 | Static sub-archetypes (legal text, event pages, SNUG hubs) never had a prototype | 348 | — | — | −2,100…+3,200 |
| 13 | Remaining article rhythm variants (+/−24 px per band on some posts, technical `/articles/*` image sizing) | ~300 | — | — | 100–500 |

Causes 1–3 alone touch about 2,300 of the 4,187 pages and explain most of the article and form results; cause 4 is
the largest single program-template item.

## 3. Plan — phases with a measurable exit

The exit check for every phase is the same 156-page sample re-run with `site-assess.mjs` at 1440 (≈1 h), read as
"pages under 10%" and per-template median. Fixes are made in the order that moves the most pages; the residual policy
is kept only as a diagnostic — anything the policy hides on live has to be *replicated* for the neutral target.

### Phase 0 — harness (½ day)
- Retake rule: recapture when the build height equals the viewport or differs from the live height by more than
  60% (catches the 900 px flake). Record footer height on both sides and report Δh excluding the footer.
- Make `divergence.mjs` the triage step: first diverging block, cascade share, EDS block class. Every fix below
  starts from that table, not from a visual guess.
- Exit: same sample re-measured with the retake rule; baseline frozen in `site-assessment-2026-09-15/`.

### Phase 1 — article family, 1,280 pages (1–1.5 days)
- Auto-block the blog sub-navigation on `/blogs/**` (title, search field posting to `/search`, Topics menu fed from
  the category index); 72 px, static markup so it is also crawlable.
- Blog banner variants from the source theme (blue/slate/purple gradients, family image) as `hero blog <variant>`.
- The two open rhythm items (per-band ±24, technical-article image sizing).
- Exit: article median < 8%, ≥ 80% of article pages under 10%.

### Phase 2 — forms, 1,500 pages carry a form id (1 day)
- Capture the rendered field list once per Marketo form id from live (17 ids), store labels/types/required flags in
  `config/marketo-forms.json`, render the identical field set in the `form` block (this also completes the forms
  capability: the payload shape becomes exact).
- Webinar speakers row (cause 7) in the same pass since it shares the template.
- Exit: form median < 10%, ≥ 80% under 10%.

### Phase 3 — program template, 1,411 pages (1.5–2 days)
- DesignWare "Product Details": import the server-rendered product/download tables into `tabs horizontal` + `table
  compact` (167 pages).
- Video block: poster frame from the video's `poster`/thumbnail (or a captured first frame hosted on the media bus)
  and the playlist strip (117 pages); hero video posters (11).
- Box-links grid variant for long product indexes; category-page archetype (74) as a prototype-first round
  (two-column list + sidebar, 5 items per page).
- Exit: program median < 10%, ≥ 75% under 10%.

### Phase 4 — static, 348 pages (1–1.5 days)
- Split into sub-archetypes by source composition (SNUG proceedings with asset cards, event pages, legal/long text,
  hub pages); one prototype each, then the sampled exit.
- Exit: static median < 10%.

### Phase 5 — listing pages and residuals (½ day)
- The 5 listing pages as individual prototypes (they are the site's index pages and are visible in any review).
- Glossary residuals (zoom captions, table variants already landed; re-sample).

### Phase 6 — 360 px
- Repeat the sample at 360 once desktop is under the bar; the mobile token rules and accordion patterns from
  2026-09-11 are in place, the unknowns are per-block.

### What "all pages under 10%" will and will not include
- Reachable: every template median under 10% and roughly 85–90% of pages under 10% after phases 1–5, based on the
  Δh table (pages within 8 px are at 5.9% median today).
- Not reachable by code: live pages whose content changes between captures (blog category "most recent" lists,
  dynamic "Trending" footer, video frames) — a few percent of pages will float across the 10% line depending on the
  day of capture. Those need a content-freeze rule in the metric (capture both sides within minutes, retake on
  footer mismatch) rather than more CSS.

### Effort and sequencing
Phases 0–3 cover ~3,400 pages and are the bulk of the gain: about 4–5 working days of unattended rounds, each block
round costing 1–2 h including a targeted re-import and republish (a full-site republish is ≈3 h at concurrency 6, so
phases are batched into one republish each). Phases 4–5 add 1.5–2 days. Total ≈ 6–7 days to the objective at 1440.


## Update 2026-09-16 — method switch and round 1

The plan above used whole-page pixel percentage as the metric. On 2026-09-16 the gate switched to the element-level
instrument ported from the coca-cola replica (`stardust/scripts/fidelity-core.mjs` + `fidelity-gate.mjs`, method in
`stardust/fidelity-gate-method.md`): text pairing, per-element geometry and style deltas, per-band pixel crops between
paired headings (no cascade), deterministic error/warn/pass, ranked by pages affected per template. The owner's
under-10% KPI stays as the reporting number (`site-assess.mjs`, neutral method) and is re-measured at each round exit.

Expanding-sample protocol: round 1 = 156-page stratified sample (`stardust/replica/fidelity/sample-r1-156.json`),
fix template-level classes, re-run the same sample; round 2 = 400 new pages (`sample-r2-400.json`); round 3 ≈ 1,000;
round 4 = all pages.

Round 1 course (same 156 pages, 1440):
| run | what changed | result |
|---|---|---|
| 1 | raw port | 0 pass; 16,441 false font findings, header region mis-detected |
| 1b–1c | site noise calibrated (regions, separators, font case, image pairing, hosts, Ask launcher purge) | 0 pass; findings real |
| 1d–1e | blog sub-nav, TOC regression, Continue Reading rule, banner variants, Marketo field sets, author rows, DW tabs from the public feed, article image widths, letterbox tokens | 7 warn-only (author), median |Δh| 180 → 76 px, 55/156 within 60 px |
| 1f | + DW section tokens, Resources card tokens, IP-selector field, blog card internals, form band grid for all variants | running |

Content freshness turned out to be a fidelity input: five posts published after the snapshot were fetched, imported,
deployed and indexed (`content sync`), otherwise every "Continue Reading" carousel differs from live by definition.
