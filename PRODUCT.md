# Product

<!-- impeccable:product-schema 1 -->
<!-- stardust: descriptive current-state snapshot of https://www.synopsys.com (extract --prep, 2026-09-09). Sections marked `_provenance: inferred` are the agent's reading of captured copy, not user-confirmed facts. -->

## Platform

web

## Users

_provenance: inferred — from nav IA, hero copy, and CTA inventory across 64 captured pages._

Semiconductor and systems engineers (chip designers, verification engineers, IP integrators), engineering managers, and procurement/decision-makers at companies that design silicon or software-defined systems. Secondary audiences reached through dedicated sections: investors, job seekers (careers), academia (SARA university program), startups, ecosystem partners, and press.

## Product Purpose

_provenance: captured — home tagline and section copy._

Synopsys is a provider of electronic design automation (EDA) tools, semiconductor IP, and systems verification/simulation software. The site's stated purpose is "Powering the Era of Pervasive Intelligence from Silicon to Systems", with three benefit pillars repeated on the home page: "Supercharge Productivity · Conquer Complexity · Accelerate Time-to-Market". The website markets the portfolio (Synopsys.ai, EDA, Systems, Silicon IP), funnels visitors to "Contact Sales", and hosts a large resource library (blogs, articles, glossary, webinars, success stories, events).

## Positioning

_provenance: inferred — from captured hero and section headlines._

"Silicon to Systems": a single vendor spanning chip design (Fusion Compiler, PrimeTime, VCS, Verdi, ZeBu, HAPS), semiconductor IP (DesignWare interface/memory/security IP), and system-level simulation via the Ansys combination ("Synopsys | Ansys" co-brand in the utility bar, "Multiphysics Fusion", "Electronics Digital Twin"). AI is positioned as a cross-cutting layer (Synopsys.ai, AgentEngineer™, Physical AI).

## Operating Context

_provenance: captured._

- Corporate marketing site on Adobe Experience Manager (`/content/dam/...`, `etc.clientlibs`, experience fragments for header/footer), Bootstrap-derived grid, Roboto webfont self-hosted, Brightcove/video.js hero video, Coveo search, OneTrust consent, Font Awesome 6 tokens.
- Sitemap declares 6,679 URLs on www.synopsys.com; roughly 2,000 are ja-jp / zh-cn / zh-tw / ko-kr locale copies. Sibling properties: news.synopsys.com, careers.synopsys.com, investor.synopsys.com, training.synopsys.com, benefits.synopsys.com, video.synopsys.com, events.synopsys.com.
- Hero and resource imagery is served from `images.synopsys.com` (Dynamic Media, `?$responsive$` renditions) and `cf-images.us-east-1.prod.boltdns.net` (Brightcove posters).

## Capabilities and Constraints

_provenance: captured._

- Page families observed: landing (home), program (solution/product family and product detail pages with purple title hero, anchor nav, Key Benefits, resource carousel, Connect-with-Us band), article (blog posts, technical articles, glossary definitions), listing (blog index with facets and pagination, authors, success stories, webinars, resources, events, newsroom), form (gated success stories, ebooks, on-demand webinars/events with a right-rail lead form), static (company, governance, partners, academic, startups, careers, support, community, services), unique (author profile, sitemap, office locations).
- Interactive surfaces: mega-menu navigation, autoplaying hero video carousel, slick card carousels, blog facet filters/sort/pagination, gated lead forms (Business Email, First/Last Name, Phone, Job Title, Company, Country/Region, State), "Ask" AI brand-concierge launcher, language switcher, Coveo site search.
- No authentication on the captured surface. Support community is login-gated (linked, not crawled).

## Brand Commitments

_provenance: captured — brand surface in `stardust/current/_brand-extraction.json`._

- Name: Synopsys (registered wordmark, inline SVG, purple). Co-brand "Synopsys | Ansys" in the utility bar.
- Voice: technical-precise, third-person corporate; product names carry ™/®; headings are mixed case (no uppercase convention); primary CTA everywhere is "Contact Sales"; secondary link labels are "Learn More", "Read Now", "Download", "Get Started".
- Visual identity: purple primary `#7e45af` with dark purple `#5a2a82` gradients, near-black text `#111c24`, link blue `#316aca`, white surfaces with `#f7f7fa` alternates, Roboto Light for display, 5px button radius, subtle `0 1px 7px rgba(0,0,0,.15)` card shadow. Purple line-icon set for feature tiles.

## Evidence on Hand

_provenance: captured._

- 64 live-rendered page records with screenshots: `stardust/current/pages/<slug>.json`, `.html`, `assets/screenshots/<slug>.png`.
- Logo `stardust/current/assets/logo.svg`, favicon `assets/favicon.ico`, Roboto 300/400/500/700 TTF files `assets/fonts/`.
- Brand surface `_brand-extraction.json`; computed-style samples `_style-samples.json`; crawl audit `_crawl-log.json`.
- Not captured (do not fabricate): customer testimonials beyond linked success stories, pricing, benchmarks other than claims present in captured copy, localized content.

## Product Principles

_provenance: inferred — descriptive of the current site, not a redesign brief._

1. Portfolio breadth is the pitch: every family page connects sideways to the rest of the portfolio ("Explore the Entire … Family").
2. One conversion path: "Contact Sales" appears in the header, the Connect-with-Us band, and hero CTAs on nearly every page.
3. Content marketing at volume: 1,000+ blog posts, glossary, webinars, articles feed a "Trending / Learn" footer cluster on every page.
4. Consistent template system: a small set of AEM components (title hero, anchor nav, key benefits, card carousel, CTA band) composes most pages.

## Accessibility & Inclusion

_provenance: captured._

Semantic landmarks are partial (header/footer are `div`-based experience fragments; `footer.site-footer` present). Breadcrumbs and anchor nav are present on program pages. Many decorative and icon images carry empty `alt`. Contrast: white on `#7e45af` and `#111c24` on white both pass WCAG AA.
