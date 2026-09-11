# Residual policy — what static HTML cannot reproduce on synopsys.com, and how the gates treat it (2026-09-11)

Decision taken in the consistency run (step 5). Every entry is a live behaviour that no server-rendered EDS page
can reproduce, or a state that differs between two captures of the live site itself. The gates treat them as
follows so template numbers stay comparable:

| id | Live behaviour | Pages | Gate treatment |
|---|---|---|---|
| R-COVEO | Coveo `atomic-search-interface` blog sub-nav (search box + "Silicon to Systems Blog" CTA) and Coveo listing/search facets | 1,280 blog/article; listing pages | **hidden on the live side** during capture (`.component-search-result`, `.coveo-*`, `atomic-*`); content-diff excludes it |
| R-MARKETO | Marketo progressive-profiling fields, form titles injected by `MktoForms2` | 587 form pages, 1,500 pages with a form | authored field set from the source markup; live form body **hidden on both sides** (`.mktoForm`, `form.mktoForm`, EDS `.form form`) — the panel frame and title are compared |
| R-DYNAMIC-CARDS | "Continue Reading" / related feeds (`.cmp-dynamiccards`, `mostRecentArticles`) | 1,225 article pages | EDS rebuilds from the query index (order differs) — **hidden on both sides** (`.cmp-dynamiccards`, `[data-blogsdev-type]`, EDS `.carousel.blog`, `.listing`) |
| R-DW-DOWNLOADS | `dwProductsDownloads` / `contentTypeListing` JS feeds | 159 + 11 | authored as `cards asset` where server-rendered; JS-only containers hidden on live |
| R-AUTOPLAY | slick/banner carousel state at capture time (hero slide, logo strip, resource rail offsets) | home, program pages | both sides frozen (`*{animation:none;transition:none}`); the live slide index is not controllable — accepted, quantified per template |
| R-ASK | floating "Ask" assistant button (bottom-right) and OneTrust banner | 3,873 | hidden on live (`#ask-synopsys, .ask-widget, [class*="askSynopsys"], #onetrust-consent-sdk`) |
| R-STICKY-RAIL | live sticky article rail (`two2575PinnedLeft`) repeats in stitched captures | article | EDS rail is static; the live capture is taken with sticky positioning neutralised (`position:static !important` on the rail) |
| R-TEXTURE | high-frequency imagery resampled at slightly different sizes (pillar tiles) | home | accepted; texture, not layout |

Rules:
1. The hide/neutralise lists live in `stardust/replica/residual-policy.json` and are applied by `gate-sample.mjs`
   (and by hand when running `stitch-shot`) to BOTH sides symmetrically where the EDS side has an equivalent.
2. A residual is only ever added here with a DOM probe proving the element is JS-injected or state-dependent;
   "looks like JS" is not evidence (the home page's earlier "residuals" were static and are now fixed).
3. Numbers reported for a template state which policy version applied. Policy changes re-run the sampled gate.
