# Fidelity gate — method spec for the stardust deploy flow

Extracted from the coca-cola.com replica migration (2026-09-15). Reference implementation:
`stardust/scripts/fidelity-core.mjs` (instrument) + `stardust/scripts/fidelity-gate.mjs` (batch runner, ranked summary).
Evidence of the method working: `stardust/qa-canary-report.md`, ledger `stardust/review-queue.md` (C1–C11, R1–R3).

## Where it belongs
A **deploy-flow gate**, run per delivered page against the **live source** on the **published/preview origin**.
It replaces the human side-by-side review. It is NOT part of `stardust:qa` (health, SEO, a11y, editability, perf are a
different QA level and stay there). Detection is script-only; an LLM (or the human) only triages the ranked report.

## Inputs
- live base URL + deployed base URL, page list (every delivered page — not an archetype sample), widths `1440,360,1920`
  (the ≥1920 width is what caught the header centring and the 1440-capped hero), optional cookies for gated content
  (age gate), overlay selectors (consent, survey), concurrency (3 keeps a bot-managed live origin quiet).

## Capture (both origins, same procedure)
1. Real-Chrome UA + standard headers (`live-session.mjs`), `domcontentloaded`, 2.5 s settle.
2. Dismiss consent + late modals (`dismissOverlays`), then **purge fixed overlays every 250 ms** for the rest of the
   session (OneTrust preference centre and the GCDS survey arrive 3–9 s late on BOTH origins and poisoned run 1).
3. On the EDS side wait until every `main .section[data-section-status]` is `loaded` and the footer block is present
   (a capture before decoration finished produced a 1382 px page that looked like 40 missing modules).
4. Slow-scroll to the bottom and back (lazy images), then wait for `document.fonts.status === 'loaded'` and no face in
   `loading` state (a live capture before the brand woff2 arrives reports the fallback face as rendered).
5. Inventory (below) + `fullPage` screenshot (animations disabled). States at 1440 only.

## Inventory (per origin)
- **Texts:** every element with ≥2 chars of OWN text, visible (w,h > 1 px; no `visibility:hidden`; no `opacity:0` on
  itself or an ancestor), outside script/style/svg/overlays/`[role=dialog]`/carousel clones. Record normalised text key
  (whitespace collapsed, lower-cased), tag, region (header/main/footer), box (an inline `<span>` inside `a`/`button`
  reports the CONTROL's box), **rendered face via canvas advance probe** (first family in the stack whose
  `measureText` width equals the full stack's — never `font-family`'s first token, never `document.fonts.check`, which
  returns true for unknown families), size, weight, line-height, colour, background (a/button), text-align, transform.
- **Images:** visible `<img>`: key = alt (fallback: URL basename), box, `naturalWidth>0`, `clientWidth>0`, aspect.
- **Icons:** `[class*=icon]` with `::before` content: rendered face + loaded.
- **External links:** off-site `<a href>`: href + `target`.
- **Dynamics:** `<video>`/`<iframe>` counts, third-party gallery containers (`.swe_embed` etc.: node count + height),
  consent SDK presence, `pageerror` list, set of request hosts.
- **Document height.**

## Comparison (per width)
1. **Text pairing** by key in occurrence order → `missingText` (live only) / `extraText` (deployed only).
2. **Geometry** per pair: Δtop, Δleft, Δwidth, Δheight; plus `local` = Δ of the gap to the previous pair — the module that
   INTRODUCED a shift (everything below is offset-contaminated). Flag |Δ| > 4 px; `firstDivergence` in main.
3. **Style** per pair: rendered face, size, weight, colour (alpha-0 colours are equal), bg, align (not for a/button),
   transform.
4. **Images:** unpaired, BROKEN, zero-size, size Δ > 4, aspect Δ > 0.05. **Icons:** glyph font not loaded / count.
5. **External links:** paired hrefs with different `target`.
6. **Dynamics:** count/containers mismatch, page errors on deployed, live-only functional hosts (ad-tech allowlisted).
7. **Per-band pixel crops:** bands between consecutive paired `h1–h4` (band 0 = top → first heading), compared at the
   min height with pixelmatch (threshold 0.1); flag > 2 % or height Δ > 4; write `live | deployed | diff` triptychs.
   This is the ONLY detector for paint-only defects (scrims, gradients, radii).
8. **States (1440):** hover the first nav item with a submenu → items, type, face, first-item position, then move the
   pointer into the submenu → still open?; click the first play control → `<video>` advancing / autoplay iframe.

## Severity (deterministic, in `fidelity-gate.mjs classify`)
- **error:** missing text; BROKEN/zero-size image; height Δ > 16; main geometry with |local| > 8; face/size/weight/
  colour/bg/transform delta; dynamics container/video mismatch or page error.
- **warn:** extra text; image size/aspect/unpaired; band > 5 %; state delta; live-only hosts.
- **pass:** nothing above. Residuals are recorded in the ledger with a reason, never hidden.

## Noise classes and their handling (all recorded on this migration)
| noise | handling |
|---|---|
| late overlays (consent PC, survey) | continuous purge + fixed-position text excluded |
| fonts not yet loaded on live | `document.fonts` wait; rendered-face probe |
| sr-only 1×1 texts | size filter |
| inline span vs control box | measure the closest a/button |
| alpha-0 colours in different notations | normalise to `transparent` |
| carousel clones / `aria-hidden` slides | skip clone classes on BOTH sides symmetrically; never skip `aria-hidden` on one side only |
| alt-less images hosted on different origins | basename pairing fails → pair by box (todo) |
| live hydration variance (promo copy missing once in 4 runs) | capture live twice; live≠live = "live variance" |
| scrollable mobile sub-nav scroll state | compare within the scroll container |
| ad-tech request churn | allowlist functional vendors only |
| deployed decoration not finished | wait for section status + footer |

## Loop protocol (what "review and fix" means)
1. Run the gate on the changed pages (or all). 2. Read `summary.md`: failures ranked by pages affected.
3. For each failure class, PROBE both origins for the specific computed value (never eyeball) → root cause → fix in
   block CSS/JS, encoder, or content. 4. Re-run the same pages; a fix is accepted only when its finding disappears and
   no new finding appears on the regression pages. 5. Anything left goes to the ledger as a residual with its cause.
The gate caught a wrong fix within one run (header CTA is brand-themed on live; an ad-hoc probe had measured a hidden
drawer copy) — trust the paired measurement over ad-hoc probes.

## Cost
≈ 15 s per page per width for both origins in parallel; 583 pages × 3 widths at concurrency 3 ≈ 2.5 h.

## Full-site run notes (583 pages, 2026-09-15)
- Runner: `fidelity-gate.mjs --paths <list> --concurrency 3 --resume` writes `pages/<slug>.json`, `progress.log`, `summary.md/json`; ~4 pages/min at concurrency 3 → ~2.5 h. Live 404s (drift since crawl) are `unavailable`, not failures.
- Triage loop: aggregate by class → representative pages → probe both origins → fix once → re-run the class + a regression sample. Hold deploys during a run or record the deploy timestamp.
- Before/after for review: `pilot-before` branch at the pre-fix commit (+ full Code Sync trigger) gives a browsable "before" next to pilot and live.
- Classes found on this site (first pass): trailing/inline `<br>` handling (FAQ ×19, forms), consent labels lost by the parser (forms ×4), AEM panel names rendered as steps, heading blank lines (recipes), title-h3 ramp, product-info rating typography / CTA width / nutrition hit area, where-to-buy grid shown before its trigger, Instagram embeds reduced to a link, snapshot `aria-hidden`, stray glyph class on the share button.
- Known residual classes (ledger, not defects): Sprinklr gallery internal height (13 px), sub-nav `&nbsp;`, notifyme widget in shadow DOM (interim snapshot), Bazaarvoice counts drifting live, carousel clone accounting.

## synopsys.com adaptation (2026-09-16)
- Live URLs are not the EDS paths (`.html` suffix, DesignWare `ipdir.php?c=…`): resolved via `stardust/path-map.json`;
  `--sample sample.json` takes `[template, path, liveUrl]` triples so the summary can rank findings per template.
- The source's header/footer are not `<header>/<footer>`: region detection uses the source's wrapper classes too, otherwise
  every page reports `first divergence: english` (the utility bar) and the header geometry pollutes main.
- Separator text nodes on the source (`| | |` between footer links, `Tags: , , ,` around tag links, `By ,`) are layout;
  keys are compared with punctuation stripped.
- Rendered face names differ only by case (`Roboto` vs the replica's `roboto` @font-face): compared case-insensitively.
- Images pair by alt/basename first, then by box proximity (media bus vs Dynamic Media basenames never match).
- Footer "Trending" copy rotates on the source: footer/header text mismatches are warnings, main text is an error.
- Hidden promo `<video>` and tracking iframes in the mega-menu/body root: dynamics count visible elements only.
- Host allowlist extended with the assistant (openai), icon kit (fontawesome) and the site's tracking vendors.
- Expanding-sample protocol for 4,187 pages: round 1 = 156-page stratified sample → fix template-level classes →
  re-run same sample → round 2 = ~400 new pages → round 3 = ~1,000 → round 4 = all pages. Each round's summary ranks
  finding classes by pages affected per template so the fixes are made once per template before the full run pays for them.
