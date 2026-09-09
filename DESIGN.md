---
name: Synopsys — current state
description: Descriptive design system of www.synopsys.com as captured 2026-09-09 (stardust extract --prep; nothing prescriptive)
colors:
  white: "#ffffff"
  ink: "#111c24"
  slate: "#555555"
  purple: "#7e45af"
  purple-deep: "#5a2a82"
  link-blue: "#316aca"
  surface-mist: "#f7f7fa"
  utility-black: "#000000"
  border-silver: "#c4c4c4"
  required-red: "#cc0000"
  divider-fog: "#efefef"
typography:
  display:
    fontFamily: "'Roboto', Arial, sans-serif"
    fontSize: "60px"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "'Roboto', Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 300
    lineHeight: 1.1
  title:
    fontFamily: "'Roboto', Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 300
    lineHeight: 1.1
  card-title:
    fontFamily: "'Roboto', Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.15
  body:
    fontFamily: "'Roboto', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 300
    lineHeight: 1.6
  label:
    fontFamily: "'Roboto', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
rounded:
  chip: "3px"
  sm: "5px"
  md: "10px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "40px"
    typography: "{typography.body}"
  button-primary-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "40px"
  button-outline-on-purple:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "40px"
  utility-pill:
    backgroundColor: "{colors.utility-black}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.sm}"
  type-chip:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.white}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
---

# Design System: Synopsys (current state, descriptive)

<!-- stardust:extract descriptive snapshot. Source: stardust/current/_brand-extraction.json, _style-samples.json (12 pages, computed styles), 64 page records + screenshots. This file describes what the live site IS; it is not a redesign brief. -->

## Overview

**Creative North Star: "Purple Precision" (descriptive label for the captured system, not a proposal)**

A corporate technology marketing system built on a single accent hue. Purple (`#7e45af`) and its deep variant (`#5a2a82`) carry every brand moment: the wordmark, the primary button, page-title hero bands, the "Connect with Us" CTA band, icon strokes, and type chips. Everything else is white, a faint mist grey, and near-black ink. Roboto at Light 300 does most of the talking, which gives large headings an airy, technical feel; body copy is also Light 300 at 16px with generous line-height.

Density is moderate: sections are tall (400–700px), centered, with 3-column card and tile grids inside a 1170px content container that sits on a 1900px site wrapper. Imagery is dark, cinematic renders of silicon, vehicles and robots with purple/blue light; partner and customer logos are shown in grey or native colour on white.

**Key Characteristics:**
- One saturated hue (purple) plus deep-purple gradients; blue reserved for text links.
- Roboto Light everywhere; weight, not family, marks hierarchy.
- White pages with alternating `#f7f7fa` bands; dark `#111c24` footer; black utility bar.
- Small radii (3px chips, 5px buttons/cards, 10px promo cards); pills only in the utility bar.
- A repeating template kit: title hero, anchor nav, key-benefit tiles, card carousel, CTA band.

## Colors

The palette is monochromatic purple over neutrals, with blue used exclusively for inline links.

### Primary
- **Purple** (#7e45af): primary buttons ("Contact Sales"), header logo, section heading colour on program pages, icon strokes, type chips, active pagination.
- **Deep Purple** (#5a2a82): gradient partner for hero bands and the "Connect with Us" band (`linear-gradient` deep→purple, left to right), footer/hover states, people-grid names.

### Neutral
- **White** (#ffffff): default page and card background; text on purple/dark.
- **Ink** (#111c24): body and heading text, footer background, dark "Get Started" button.
- **Slate** (#555555): secondary text (dates, bylines, captions).
- **Surface Mist** (#f7f7fa): alternating section background (Key Benefits, Resources, Explore bands).
- **Utility Black** (#000000): top utility bar (Synopsys | Ansys, language, Ask).
- **Border Silver** (#c4c4c4) and **Divider Fog** (#efefef): input borders, hairlines.
- **Link Blue** (#316aca): inline text links and card "Learn More ›" links.
- **Required Red** (#cc0000): form required markers only.

### Named Rules (observed)
**The Purple-Only Rule.** No second accent hue appears in chrome or components; blue exists only as link text. Colour imagery supplies all other hue.

## Typography

**Display Font:** Roboto (with Arial, sans-serif)
**Body Font:** Roboto (with Arial, sans-serif)
**Label/Mono Font:** none distinct (Font Awesome 6 declared for icons)

**Character:** Single-family, weight-driven. Light 300 for display and body; Regular 400 for card titles and nav; Medium/Bold appear only in footer column heads and the utility pills (600).

### Hierarchy
- **Display** (300, 60px, 1.1): page-title hero h1 on program/static pages, white on purple.
- **Headline** (300, 44px, 1.1): home section headings ("Design the Future Today with Synopsys").
- **Title** (300, 32–34px, 1.1): section h2 on interior pages ("Key Benefits", "Resources"), purple on program pages, ink elsewhere.
- **Card title** (400, 20px, 1.15): h4 inside cards and feature tiles.
- **Sub-title** (400, 18px, 1.1): h3 tile titles; footer column heads use 16px/500.
- **Body** (300, 16px, 1.6): paragraphs and list items; lede paragraphs step up to 20px/1.6.
- **Label** (600, 14px, 1): utility bar pills, type chips (uppercase in chips only: "BLOG", "WHITE PAPER", "NEWS RELEASE").

Scale audit: ad-hoc (60 → 44 → 32 → 24/20 → 18 → 16 → 14, no constant ratio).

### Named Rules (observed)
**The Light Rule.** Headings never exceed weight 400; emphasis comes from size and purple colour, not bold.

## Layout

- Site wrapper `max-width: 1900px`; content container `1170px` (Bootstrap-style `.container`, 15px gutters, 12-col `row`); a wider `1660px` container appears on some landing sections.
- Utility bar 44px (black) → main nav 72px (white, sticky on scroll) → optional breadcrumb row → page.
- Program pages: full-bleed title hero (≈380px gradient, up to 700px with photo) → anchor-nav strip (`#f7f7fa`, 56px) → alternating white/mist sections at ~80px vertical padding.
- Grids: 3-up cards/tiles at 1440 (≈370px columns, 30px gutter); 4-up pillar cards on home; 5-up portrait grid on management team; blog listing uses 8-card 4×2 grid then a 2-column facet + list layout.
- Articles: 3/9 split — left sidebar (TOC + subscribe form, sticky) and 780px reading column with inline promo cards.
- Footer: 4 link columns + language dropdown, social row, white wordmark right-aligned, legal line.

## Elevation & Depth

Flat by default with light ambient lift on cards. Depth is otherwise conveyed by band colour alternation and gradients.

### Shadow Vocabulary
- **Card ambient** (`box-shadow: 0 1px 7px 0 rgba(0,0,0,0.15)`): resource/news cards, pillar cards, promo cards.
- **Form card** (`box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)`): gated-asset form panel and dropdown menus.

## Shapes

Rectilinear with softly rounded corners. 5px on buttons, cards and inputs; 3px on type chips; 10px on promo/testimonial cards (`--radius: 10px`); 16px on the `atomic` search widget; 9999px pills only for the utility bar (language, Ask). Carousel arrows are 40px circles with a 1px border. Icons are thin-stroke purple line drawings, ~72px in tiles and 22px in mega-menu items.

## Components

- **Utility bar**: black, white wordmark + "Ansys" co-brand, right-aligned globe/language pill and outlined "Ask" pill.
- **Site header**: white, purple inline-SVG logo (166×36), five mega-menu items with caret, search icon, purple `Contact Sales` button (40px, 5px radius).
- **Breadcrumb**: 14px, ink, "/" separators, dropdown carets on ancestors; sits over the hero on program pages.
- **Page-title hero**: deep→purple gradient band, centered white 60/300 h1, optional white outlined button (e.g. "Datasheet"), optional photographic background.
- **Anchor nav**: mist strip with 14px links and a dark `Get Started` button right.
- **Key-benefit tile**: 72px purple line icon left, 18/400 title, 16/300 copy; 3-up.
- **Card (carousel/grid)**: white, 5px radius, ambient shadow, 16:9 image, purple type chip, 20/400 title, date/read-time in slate, blue "Learn More ›" link.
- **Connect-with-Us band**: gradient, centered 32/500 white heading, white outlined `Contact Sales ›` button.
- **Gated form**: mist panel with 4px shadow, purple 24/300 title, labelled inputs (40px, silver border, 5px), purple `submit` button.
- **Footer**: ink background, four 16/500 column heads (Company, Resources, Trending, Learn), 14/300 white links, language dropdown, social icons, legal line.

## Do's and Don'ts

Descriptive only: the current site keeps purple as the sole accent, uses Roboto Light for all headings, alternates white and mist bands, and repeats the same footer, utility bar and Connect band on every page. It does not use uppercase headings, bold display type, or shadows heavier than 4px blur outside dropdowns.
