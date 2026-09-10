# Dynamic plan — gate evidence

## Step 0 — Baseline
- 2026-09-10T15:15:13Z: documents {'live': 4186}, query-index.json → 404 (expected 404 before step 1). PASS

## Step 1 — Query index
- Index definition uploaded to the config service (`POST admin.hlx.page/config/paolomoz/sites/synopsis-sd/content/query.yaml`, 204);
  `stardust/query.yaml` is the committed copy. Two corrections found while gating: the pipeline renders the `Tags`
  metadata as one `<meta property="article:tag">` per tag (not `name="tags"`), and a multi-valued property needs
  `values:` (with `value:` the contents were concatenated without a separator). Rows now carry a JSON array.
- 1,478 article-family pages re-imported with Author / Published / Readtime / Category / Tags metadata and category
  `listing` blocks, redeployed (`stardust/deploy-dyn1.log`, 1,478/1,478 live after re-driving 5 transient verify
  failures; one page had a `blogs.synopsys.com` image that redirects to HTML → stripped). Bulk index jobs run over the
  redeployed paths (job-2026-09-10-15-57-53, job-2026-09-10-16-24-50, 1,480/1,480 processed).
- 2026-09-10T16:30Z: `query-index.json` → 200, total 4,185; rows with tags 1,266, with author 1,311, with published 1,367.
  `/blogs/chip-design/ai-accelerator-ip-development` (article · Simon Han · May 19, 2025 · About Synopsys, Customer
  Spotlight, AI & Machine Learning…), `/articles/112g-linear-optics-phy` (article · Kant Deshpande · Jul 15, 2026 ·
  Silicon IP Technical Bulletin, HPC, Data Center…), `/glossary/what-are-chiplets` (glossary · Soheil Modirzadeh ·
  Oct 01, 2024 · no tags — glossary pages carry no page tags on the source). PASS

## Step 2 — Index-fed blocks
- `/authors/dana-neustadter`: archive renders 39 rows = 35 indexed by author + 4 authored-only rows (webinars, which
  the source lists by author but carry no author metadata); every indexed row is present, newest first. PASS
- `/blogs/chip-design/category-hpc-data-center`: 104 rows from the index (12 shown, "Load more"); `/articles/category-automotive`:
  33. Category slugs on the source drop spaces (`category-verificationip`), so the filter uses the page h1 ("HPC, Data Center")
  and a compact key; 96/105 category pages resolve to tags, the other 9 have no tagged posts on the source either. PASS
- `/blogs/chip-design/ai-accelerator-ip-development`: related carousel rebuilt from shared tags, 6 items. PASS
- `/blogs/chip-design` itself carries only the "Browse by tags" strip on the source (its feed is JS-only), unchanged.

## Step 3 — RSS
- `stardust/scripts/build-feeds.mjs` → `blogs/chip-design/feed.xml`, `articles/feed.xml`, `glossary/feed.xml` and the source
  alias `snps/blogs/chip-design.en-us.xml`, served from the code bus (200, application/xml). RSS 2.0, 50 items each
  (rebuilt from the full index), dc:creator + one <category> per tag; 5 sampled item links → 200. PASS
  (Feeds are a build artefact: re-run the script after content waves.)

## Step 4 — Site search
- `/search` (DA document, `search` block) over the index: `?q=PCIe` → 114 results (facet: Resource 38, Product Page 35,
  Article 31, Author 9, Glossary 1); empty query → prompt; header panel submit → `/search?q=DesignWare` (346 results);
  `/nav` search link localised to `/search`. PASS

## Step 5 — Social share
- `share` block auto-blocked on article pages (`scripts.js buildShareBlock`, appended as a `rail` section after the last
  rail/TOC section, matching the source order TOC → promo → share); importer emits it for future imports.
  `/articles/112g-linear-optics-phy`: 4 links (X, LinkedIn, Facebook, mailto), all contain the page URL. PASS

## Step 6 — Language switcher
- Utility "English" button opens a listbox with English (/), 日本語 (/ja-jp), 简体中文 (/zh-cn), 繁體中文 (/zh-tw), 한국어 (/ko-kr);
  all four locale pages → 200 on EDS. PASS

## Step 7 — Forms backend hook
- `config/marketo-forms.json`: munchkin `367-MRV-360`, base `//online.synopsys.com`, form ids per page from the source's
  `MktoForms2.loadForm` (1,500 pages, 17 distinct ids), `endpoint` empty. With the endpoint pointed at httpbin (route
  override in the probe) the block POSTs `{munchkinId, formId: "7209", page, fields(5)}` and confirms; without it no
  request is made. Missing from Synopsys: the Marketo REST/forms proxy endpoint. PASS

## Step 8 — Third-party scripts
- `scripts/delayed.js` + `config/third-party.json`: Adobe Launch bundle `assets.adobedtm.com/79b3942b8dfa/604ce2434de1/launch-2396cdda8e60.min.js`
  (OneTrust is initialised through it on the source; no standalone stub in the markup). `production.hosts` empty →
  0 third-party requests observed on aem.live. PASS

## Step 9 — DesignWare tables & content-type listings
- `/dw/ipdir*` (248 pages of 305 `dw` pages) are server-rendered PHP output: datasheet links and tables are in the HTML
  and were imported; no XHR feed. `dwProductsDownloads` (167 pages) is server-rendered cards (already `cards asset`).
  `contentTypeListing` (11 resource pages) loads `/content/synopsys/en-us/<page>/jcr:content/root/synopsyscontainer/contenttypelisting`
  — an AEM Sling endpoint that returns 404 from outside (also `.json` / `.model.json`). BLOCKED, recorded in
  `stardust/dynamic-baseline.json`.

## Step 10 — Images
- 18,814 `images.synopsys.com` (Dynamic Media) references on 3,866 pages; 3,947 `www.synopsys.com` DAM references.
  Re-hosting deferred (media-bus migration, not a code change). RECORDED

## Tooling fix
- `deploy-batch.mjs --force` used to start from an empty ledger and persist it — with `--paths` that erased the records of
  every page outside the run (the site ledger was rebuilt from git + the deploy logs: 4,187 live). It now keeps the ledger
  and only resets the selected pages.
