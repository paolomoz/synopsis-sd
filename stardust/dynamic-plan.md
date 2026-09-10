# Dynamic capabilities plan — synopsis-sd (2026-09-10)

Scope: give the static replica its dynamic layer. Nine items were identified in the review of the live
site. Each step below ends with a validation gate; the next step starts only when the gate passes. Steps
that depend on Synopsys-owned credentials or private APIs are built to the point where only the credential
is missing, and the gate records exactly what is missing.

Ground rules: no user input (unattended run); every change committed and pushed; content republished through
`deploy-batch` (ledger-resumable); any 401 from DA stops the run and is reported.

| # | Step | Deliverable | Validation gate |
|---|---|---|---|
| 0 | Baseline | Counts of live documents, index state, dynamic-feature inventory recorded in `stardust/dynamic-baseline.json` | File exists; `query-index.json` state recorded (expected 404) |
| 1 | Query index | `helix-query.yaml` (title, description, image, template, author, published, readtime, tags, category, lastModified); importer emits `Author`, `Published`, `Readtime`, `Tags`, `Category` page metadata for article-family pages; affected pages re-imported and republished; whole site re-indexed | `query-index.json` returns 200, `total` ≥ 4,100; a blog, an article and a glossary page carry author/published/tags in the index |
| 2 | Index-fed blocks | `cards author` (author archive from the index, no 60-row cap), `carousel blog` related posts (by shared tags, excludes the current page, falls back to authored cards), `listing` block for category / index pages (`/blogs/chip-design`, `/articles`, `category-*` pages, 105 + 74 pages) with pagination | On a deployed author page the archive count equals the index count for that author; a category page renders ≥ 10 items from the index; a related carousel renders ≥ 3 items on an article whose snapshot had cards |
| 3 | RSS | `feed.xml` per feed family (blogs, articles, glossary) generated from the index by `stardust/scripts/build-feeds.mjs`, served from the code bus | Each feed parses as RSS 2.0 with ≥ 20 items and absolute links returning 200 |
| 4 | Site search | `/search` page + `search` block over `query-index.json` (query in `?q=`, results with template facet); header search panel posts to `/search` | Searching `PCIe` returns ≥ 10 results; an empty query shows the prompt; header panel navigates to `/search?q=` |
| 5 | Social share | `share` block (X, LinkedIn, Facebook, email) emitted where the source had `socialShare` (1,276 pages); links built from the page URL at runtime | Deployed article shows 4 share links whose hrefs contain the page URL |
| 6 | Language switcher | Utility "English" button opens a menu of the locales authored in `/nav` (ja-jp, ko-kr, zh-cn, zh-tw, en) | Menu opens; each locale link returns 200 on EDS |
| 7 | Forms backend hook | `form` block posts to an endpoint configured in `/config.json` (`forms.endpoint`, `forms.munchkinId`); without it, it keeps the confirmation-only behaviour; Marketo form ids are carried from the source as block metadata | With a test endpoint (httpbin) the block POSTs the field payload and shows the confirmation; without an endpoint no request is sent; the missing Synopsys values are named in the log |
| 8 | Third-party scripts | `scripts/delayed.js` loads OneTrust and the Adobe Data Layer / Launch bundle only when the hostname is listed in `/config.json` `production.hosts` (empty by default); the ids are taken from the live source and stored in the config | On aem.live no third-party request is made; the config lists the ids and the host gate is documented |
| 9 | DesignWare tables & content type listings | Inspect the live pages' network calls; if the feed is public, a block that fetches it; otherwise the endpoint and auth requirement recorded | Either the block renders rows on a deployed `/dw/ipdir/*` page, or `stardust/dynamic-baseline.json` records the blocked endpoint |
| 10 | Images | Count Dynamic Media references; decide on re-hosting (deferred: 4,150 pages depend on `images.synopsys.com`; re-hosting is a media-bus migration, not a code change) | Counts and decision recorded |
| 11 | Close-out | Ledgers (`progress.json`, `status.jsonl`, `eds-conversion-log.md`), memory, stardust learnings addendum; final summary | All committed and pushed |

Execution log: each gate's evidence is appended to `stardust/dynamic-gates.md` as it passes.
