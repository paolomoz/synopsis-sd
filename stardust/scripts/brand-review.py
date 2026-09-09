#!/usr/bin/env python3
"""brand-review.py — render stardust/current/brand-review.html per extract/reference/brand-review-template.md.
Single HTML file, embedded CSS, brand colours/fonts, canonical section order, mechanical Tensions detectors.
"""
import json, glob, os, html, collections, re, datetime, base64

CUR = 'stardust/current'
B = json.load(open(f'{CUR}/_brand-extraction.json'))
D = json.load(open(f'{CUR}/DESIGN.json'))
L = json.load(open(f'{CUR}/_crawl-log.json'))
pages = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(f'{CUR}/pages/*.json'))}
esc = html.escape
pal = {p['role']: p['value'] for p in B['palette']}
primary = pal.get('primary', '#7e45af'); primary_dark = pal.get('primary-dark', '#5a2a82'); accent = pal.get('link', '#316aca')
text = pal.get('text-primary', '#111c24'); muted = pal.get('accent-1', '#555555'); surface = '#ffffff'; surface_alt = pal.get('surface', '#f7f7fa'); border = pal.get('accent-2', '#c4c4c4')
display = "'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

# ---- Tensions (mechanical) ----
tensions = []
sa = B['type']['scaleAudit']
if sa['kind'] == 'ad-hoc':
    sizes = ' → '.join(B['type']['headingFamily']['sizes'] + B['type']['bodyFamily']['sizes'][:1])
    tensions.append(('T-scale', 'observed', 'Type scale is ad-hoc', f'{sizes}, no consistent ratio (ratios {sa["ratios"]}). Direct will need to decide whether the target adopts a modular scale.', '_brand-extraction.json § type.scaleAudit'))
radii = [o for o in B['motifs']['borderRadius']['occurrences'] if re.match(r'^\d', o['value']) and float(o['value'].rstrip('px')) < 16 and o['count'] >= 10]
if len(radii) > 2:
    tensions.append(('T-radius-vocab', 'observed', 'Radius vocabulary is fragmented', ', '.join(f"{r['value']} ({r['count']})" for r in radii) + '. Direct will need to pick a single small-radius value or accept the variance.', '_brand-extraction.json § motifs.borderRadius'))
BUCKETS = {'see-more': {'see more', 'learn more', 'more info', 'more', 'read more', 'view more', 'discover more', 'explore'}, 'start': {'get started', 'start now', 'start free', 'try it', 'try now', 'begin'}, 'contact': {'contact', 'contact us', 'get in touch', 'talk to us', 'reach out'}, 'signup': {'sign up', 'signup', 'create account', 'register', 'join', 'subscribe'}, 'vague-here': {'here', 'click here', 'read this', 'this', 'more'}}
cta_counts = collections.Counter((c['label'] or '').strip() for d in pages.values() for c in d['ctas'] if c['label'])
for bucket, members in BUCKETS.items():
    hits = {l: n for l, n in cta_counts.items() if l.lower() in members}
    if len(hits) >= 2:
        tensions.append(('T-cta-vocab', 'cross-page', f'CTA voice is fragmented ({bucket})', ', '.join(f'“{l}” ×{n}' for l, n in sorted(hits.items(), key=lambda x: -x[1])) + '. Direct will need to pick a canonical voice for this affordance.', 'pages/*.json § ctas'))
cf = {l: n for l, n in cta_counts.items() if l.lower() in {'here', 'click here', 'read this', 'more', 'this'}}
if cf:
    tensions.append(('T-link-content-free', 'cross-page', 'Content-free link labels in use', ', '.join(f'“{l}” ×{n}' for l, n in cf.items()) + '. Screen readers and crawlers cannot tell what these point to.', 'pages/*.json § ctas'))
tensions.append(('T-logo-variants', 'home-only', 'Logo variants captured', f"Inline SVG header logo captured ({B['logo']['sourceSelector']}); footer white raster and utility-bar wordmark recorded by URL only. The migration will need the white/inverted variant as an asset.", '_brand-extraction.json § logo'))
imb = [p for p in B['palette'] if p['role'] not in ('background', 'text-primary', 'text-secondary') and p['value'] not in ('#000000', '#ffffff') and len(p['usedAs']) == 1]
if len(imb) > 3:
    tensions.append(('T-color-imbalance', 'cross-page', 'Multiple palette colors used in only one context', '; '.join(f"{p['value']} ({p['role']}) as {p['usedAs'][0]} only" for p in imb) + '.', '_brand-extraction.json § palette.usedAs'))
else:
    for p in imb: tensions.append(('T-color-imbalance', 'cross-page', f"Color {p['value']} ({p['role']}) appears as {p['usedAs'][0]} only", 'Never as the other contexts. Direct will need to decide: drop, expand, or keep as accent.', '_brand-extraction.json § palette.usedAs'))
tok = B['customProperties']
if tok.get('--atomic-primary', '').lower() == '#316aca' and primary != '#316aca':
    tensions.append(('T-tokens-unused', 'synthesized', 'Design tokens defined but only partly applied', f"`--atomic-primary` ships as #316aca (Coveo Atomic search widget default) while the brand primary is {primary}; brand tokens `--purple`/`--purple-dark`/`--text`/`--radius` exist but most component CSS uses literal values. The migration target will introduce a real token layer.", 'pages/*.json § customProps'))
alts = [i.get('alt') for d in pages.values() for i in d['media']['imgs']]
generic = collections.Counter(a.strip().lower() for a in alts if a and a.strip().lower() in {'logo', 'image', 'picture', 'photo', 'img', 'icon'})
if generic: tensions.append(('T-img-alt-generic', 'cross-page', 'Generic alt text found', f"{sum(generic.values())} image(s) carry stock placeholder alt ({', '.join(generic)}).", 'pages/*.json § media.imgs.alt'))
empty_pct = round(100 * sum(1 for a in alts if not (a or '').strip()) / max(1, len(alts)))
if empty_pct >= 30: tensions.append(('T-img-alt-empty', 'cross-page', 'Empty alt text widespread', f'{empty_pct}% of {len(alts)} images carry empty alt text (icons, decorative renders, card thumbnails). Accessibility issue and a content-sourcing decision for the migration.', 'pages/*.json § media.imgs.alt'))
tensions.append(('T-h1-absent', 'observed', 'Hero titles are not headings', 'Program-page hero titles (e.g. “VCS: Functional Verification Solution”) and the home hero render as non-heading elements; the first heading is an h2. Only articles, static and form pages expose an h1.', 'pages/*.json § headings'))

# ---- helpers ----
def badge(b): return f'<span class="badge">{esc(b)}</span>'
def section(id_, title, badges, body):
    return f'<section id="{id_}"><h2>{esc(title)} {" ".join(badge(b) for b in badges)}</h2>{body}</section>'
nav_ids = [('masthead', 'Overview'), ('coverage', 'Coverage'), ('pages', 'Pages'), ('palette', 'Palette'), ('type', 'Typography'), ('voice', 'Voice'), ('tensions', 'Tensions'), ('motifs', 'Motifs'), ('components', 'Components'), ('modules', 'Modules'), ('crosspromo', 'Cross-promo'), ('system', 'System'), ('logo', 'Logo'), ('spacing', 'Spacing')]

# pages grid
thumbs = ''.join(f'<figure><a href="assets/screenshots/{s}.png"><img src="assets/screenshots/{s}.png" loading="lazy" alt=""></a><figcaption>{esc(d["title"].split("|")[0].strip()[:48])}<br><code>{esc(d["url"].replace("https://www.synopsys.com", "") or "/")}</code> <em>{esc(d.get("pageType", ""))}</em></figcaption></figure>' for s, d in pages.items())
# palette
sw = ''.join(f'<div class="swatch"><div class="chip" style="background:{p["value"]}"></div><div class="role">{esc(p["role"])}</div><code>{p["value"]}</code><div class="meta">{p["occurrences"]} occ · {" ".join(f"<span class=pill>{u}</span>" for u in p["usedAs"])}</div><div class="src">{esc(", ".join(p["sources"]))}</div></div>' for p in B['palette'])
# type specimens
ramp = B['type']['ramp']
spec = ''
for tag, label in [('h1', 'H1'), ('h2', 'H2'), ('h3', 'H3'), ('h4', 'H4'), ('p', 'Body'), ('a', 'Link'), ('li', 'List')]:
    if tag not in ramp: continue
    v = ramp[tag]['variants'][0]
    sample = {'h1': 'Scalable SoC Verification', 'h2': 'Design the Future Today with Synopsys', 'h3': 'Unified Compile with VCS', 'h4': 'Using AI to Debug More Quickly and Accurately', 'p': B['voice']['firstParagraph'][:220], 'a': 'Learn More ›', 'li': 'Dynamic Test Loading, Save/Restore, Constraint Solver'}[tag]
    spec += f'<div class="spec"><code>{label} · {esc(v["family"])} {v["weight"]} / {v["size"]} / {v["lineHeight"]}{" / " + v["letterSpacing"] if v["letterSpacing"] != "normal" else ""} · {ramp[tag]["samples"]} samples</code><div style="font-family:{display};font-size:{v["size"]};font-weight:{v["weight"]};line-height:{v["lineHeight"]};text-transform:{v["textTransform"]}">{esc(sample)}</div></div>'
# voice
vt = B['voiceTable']
cta_tbl = ''.join(f'<tr><td><span class="pill big">{esc(c["label"])}</span></td><td>{c["count"]}</td></tr>' for c in vt['ctaFrequency'][:8])
head_list = ''.join(f'<li>{esc(h["text"])} <small>{h["pages"]} pages</small></li>' for h in vt['headingFrequency'][:12])
tm = vt['toneMetrics']
# tensions
tcards = ''.join(f'<article class="tension"><span class="tag">{t[0]}</span> {badge(t[1])}<h4>{esc(t[2])}</h4><p>{esc(t[3])}</p><footer>Source: {esc(t[4])}</footer></article>' for t in tensions)
# motifs
rad = ''.join(f'<div class="motif"><div class="box" style="border-radius:{o["value"]}"></div><code>{o["value"]}</code><small>{o["count"]} · {esc(", ".join(o["selectors"][:2]))}</small></div>' for o in B['motifs']['borderRadius']['occurrences'][:6])
shd = ''.join(f'<div class="motif"><div class="box shadow" style="box-shadow:{o["value"]};background:#fff"></div><code>{esc(o["value"])}</code><small>{o["count"]}</small></div>' for o in B['motifs']['shadows'])
grd = ''.join(f'<div class="motif"><div class="box" style="background:{esc(g["value"])};border-radius:5px"></div><small>{g["count"]}</small></div>' for g in B['motifs']['gradients'][:3])
# components
btn = ''.join(f'<li><span class="btn" style="background:{b["backgroundColor"] or "transparent"};color:{b["textColor"]};border-radius:{b["radius"]};font-size:{b["fontSize"]};font-weight:{b["fontWeight"]};padding:{b["padding"] if b["padding"] != "0px 0px" else "0 24px"};height:{b["height"]}px;border:{esc(b["border"]) if b["backgroundColor"] is None else "none"}">{esc(b["example"][:24])}</span> <code>{b["backgroundColor"]} / {b["textColor"]} / r{b["radius"]} / {b["fontSize"]} {b["fontWeight"]} / h{b["height"]}</code> ×{b["count"]}</li>' for b in B['componentStyle']['buttons'])
pat = ''.join(f'<li>{esc(p)}</li>' for p in B['motifs']['patterns'])
# modules
mods = ''.join(f'<article class="module"><h4>{esc(m["name"])} <small>{m["instanceCount"]} instances · {m["confidence"]}</small></h4><p>{esc(m["description"])}</p><code>signal: {esc(m["signal"])}</code><p class="slots">{" ".join(f"<span class=pill>{esc(s["name"])}</span>" for s in m["slots"])}</p></article>' for m in D['extensions']['modules'])
# system
sysc = ''.join(f'<li><span class="tag">{esc(c["kind"])}</span> <strong>{esc(c["name"])}</strong> · {c["occurrences"]} pages · {esc(" › ".join(c.get("headingSequence", [])[:6]))} {("· CTAs: " + esc(", ".join(c.get("ctaLabels", [])[:4]))) if c.get("ctaLabels") else ""}{("<br><code>" + esc(c["url"][:110]) + "</code>") if c.get("url") else ""}</li>' for c in B['systemComponents'])
# coverage
succ = L['crawl']['successes']; fails = L['crawl']['failures']
vc = collections.Counter(v['verdict'] for v in L['visionCheck'])
# spacing bars
bars = ''.join(f'<div class="bar" style="height:{v}px"><span>{k} {v}px</span></div>' for k, v in [(k, int(v.rstrip('px'))) for k, v in D['spacing'].items()])
pills = ''.join(f'<span class="pill" style="border-radius:{o["value"]}">{o["value"]}</span>' for o in B['motifs']['borderRadius']['occurrences'][:6])
logo_svg = open(f'{CUR}/assets/logo.svg').read()

HTML = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synopsys · Current-state brand review</title>
<style>
:root{{--primary:{primary};--primary-dark:{primary_dark};--accent:{accent};--secondary:{surface_alt};--text:{text};--text-muted:{muted};--surface:{surface};--surface-alt:{surface_alt};--border:{border};--display:{display};--body:{display}}}
*{{box-sizing:border-box}}body{{margin:0;font-family:var(--body);font-weight:300;color:var(--text);background:var(--surface);line-height:1.6}}
nav.top{{position:sticky;top:0;z-index:9;background:var(--primary-dark);color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:10px 24px;font-family:var(--display);text-transform:uppercase;letter-spacing:1.5px;font-size:12px}}
nav.top strong{{margin-right:auto;font-weight:600}}nav.top a{{color:#fff;text-decoration:none;padding:6px 12px;border-radius:150px}}nav.top a:hover{{background:rgba(255,255,255,.18)}}
main{{max-width:1170px;margin:0 auto;padding:0 24px 80px}}section{{padding:56px 0;border-bottom:1px solid var(--border)}}
h1,h2,h3,h4{{font-family:var(--display);font-weight:300;line-height:1.1;margin:0 0 16px}}h1{{font-size:60px}}h2{{font-size:32px;color:var(--primary)}}h4{{font-size:20px;font-weight:400}}
.badge{{display:inline-block;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;background:var(--surface-alt);color:var(--text-muted);border:1px solid var(--border);border-radius:3px;padding:2px 8px;vertical-align:middle}}
.pill{{display:inline-block;font-size:12px;font-weight:600;background:var(--primary);color:#fff;border-radius:3px;padding:2px 8px;margin:2px}}.pill.big{{font-size:14px;padding:6px 14px;border-radius:5px}}
.masthead{{padding:80px 0 48px}}.masthead .hero-line{{color:var(--accent);font-size:24px;margin:8px 0}}.masthead .tag{{color:var(--text-muted)}}
.stats{{display:flex;gap:16px;flex-wrap:wrap}}.stat{{flex:1;min-width:220px;background:var(--surface-alt);padding:20px 24px;border-radius:5px}}.stat b{{display:block;font-size:32px;font-weight:300;color:var(--primary)}}
.grid{{display:grid;gap:20px}}.pages{{grid-template-columns:repeat(4,1fr)}}figure{{margin:0}}figure img{{width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border:1px solid var(--border);border-radius:5px;box-shadow:0 1px 7px rgba(0,0,0,.15)}}figcaption{{font-size:12px;margin-top:6px}}figcaption code{{font-size:11px;color:var(--text-muted)}}figcaption em{{color:var(--primary);font-style:normal;font-weight:600}}
.swatches{{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}}.swatch{{border:1px solid var(--border);border-radius:5px;padding:12px;min-height:200px}}.chip{{height:96px;border-radius:3px;border:1px solid var(--border)}}.role{{font-family:var(--display);text-transform:uppercase;letter-spacing:1px;font-size:12px;font-weight:600;margin-top:8px}}.meta,.src{{font-size:12px;color:var(--text-muted)}}
.spec{{margin:20px 0;padding:16px 0;border-bottom:1px dashed var(--border)}}.spec code{{display:block;font-size:12px;color:var(--text-muted);margin-bottom:8px}}
.voice{{grid-template-columns:repeat(3,1fr)}}.card{{background:var(--surface-alt);padding:22px;border-radius:5px}}.card small{{display:block;text-transform:uppercase;letter-spacing:1px;font-size:11px;color:var(--text-muted);margin-bottom:8px}}
table{{border-collapse:collapse}}td{{padding:4px 12px;border-bottom:1px solid var(--border)}}.two{{columns:2;font-size:14px}}.two small{{color:var(--text-muted)}}
.tensions{{grid-template-columns:repeat(2,1fr)}}.tension{{border-left:4px solid var(--accent);background:var(--surface-alt);padding:16px 20px;border-radius:0 5px 5px 0}}.tension .tag,.tag{{font-family:var(--display);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--primary)}}.tension h4{{margin:6px 0}}.tension p{{margin:0 0 8px;font-size:14px}}.tension footer{{font-size:11px;color:var(--text-muted)}}
.motifs{{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}}.motif .box{{width:80px;height:80px;background:var(--primary)}}.motif code{{display:block;font-size:12px;margin-top:6px}}.motif small{{color:var(--text-muted);font-size:11px}}
ul.comp{{list-style:none;padding:0}}ul.comp li{{border-left:3px solid var(--primary);padding:8px 14px;margin:8px 0}}.btn{{display:inline-flex;align-items:center;font-family:var(--display);white-space:nowrap}}
.module{{border:1px solid var(--border);border-radius:5px;padding:16px 20px;margin:12px 0}}.module small{{font-weight:300;color:var(--text-muted);font-size:13px}}.module code{{font-size:12px;color:var(--text-muted)}}.module .slots{{margin:8px 0 0}}
.crosspromo{{background:var(--primary-dark);border:4px dashed var(--primary);color:#fff;padding:32px;border-radius:5px}}.crosspromo .tag{{color:{accent};background:#fff;padding:2px 8px;border-radius:3px}}.crosspromo .cols{{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:20px;font-size:13px}}.crosspromo h5{{font-size:16px;font-weight:500;margin:0 0 10px}}.crosspromo li{{list-style:none;margin:6px 0;opacity:.9}}.crosspromo ul{{padding:0}}
.logo{{display:flex;gap:40px;align-items:center}}.logo .mark{{width:280px}}.logo svg{{width:100%;height:auto}}dl{{display:grid;grid-template-columns:auto 1fr;gap:6px 20px;font-size:14px}}dt{{font-weight:600}}
.bars{{display:flex;align-items:flex-end;gap:12px;height:110px}}.bar{{width:60px;background:var(--primary);position:relative;border-radius:3px 3px 0 0}}.bar span{{position:absolute;top:-20px;left:0;font-size:11px;white-space:nowrap}}
footer.end{{font-size:13px;color:var(--text-muted);padding:40px 0}}
@media(max-width:900px){{.pages,.voice,.tensions{{grid-template-columns:1fr 1fr}}h1{{font-size:40px}}}}@media(max-width:600px){{.pages,.voice,.tensions{{grid-template-columns:1fr}}}}
@media print{{nav.top{{display:none}}section{{break-inside:avoid}}}}
</style></head><body>
<nav class="top"><strong>Synopsys · Current state</strong>{"".join(f'<a href="#{i}">{t}</a>' for i, t in nav_ids)}</nav>
<main>
<section id="masthead" class="masthead"><div style="width:220px">{logo_svg}</div><h1>{esc(B["site"]["name"])}</h1><p class="hero-line">{esc(B["voice"]["heroHeadline"])}</p><p class="tag">{esc(B["site"]["tagline"])}</p><p><code>{esc(B["site"]["originUrl"])}</code> · extracted {esc(B["_provenance"]["writtenAt"][:10])} · register <span class="pill">{esc(B["register"])}</span></p></section>
{section("coverage", "Coverage", ["observed"], f'<div class="stats"><div class="stat"><b>{succ}/{L["discovery"]["cap"]}</b>pages extracted live (playwright) · {len(fails)} failures · 64/64 with provenance<br><small>{esc(L["discovery"]["userChoice"][:160])}</small></div><div class="stat"><b>medium</b>wait strategy · 2500 ms fixed settle + 4-step scroll · headless chromium · 4 workers</div><div class="stat"><b>{len(B["palette"])} · {len(B["type"]["files"])} · {len(B["systemComponents"])}</b>palette colours · font files (Roboto 300/400/500/700) · system components<br><small>vision check: {dict(vc)}</small></div></div>')}
{section("pages", "Pages", ["observed"], f'<div class="grid pages">{thumbs}</div>')}
{section("palette", "Color palette", ["cross-page"], f'<div class="grid swatches">{sw}</div><p class="meta">Clustered at ΔE&lt;5 over 12 style-sampled pages, weighted by element count; roles from the site\'s own tokens (<code>--purple</code>, <code>--purple-dark</code>, <code>--text</code>, <code>--grey</code>). Source: _brand-extraction.json § palette</p>')}
{section("type", "Typography", ["cross-page"], f'<p><span class="badge">{"modular" if sa["kind"] == "modular" else "No modular scale"}</span> Heading family <b>{esc(B["type"]["headingFamily"]["name"])}</b> · Body family <b>{esc(B["type"]["bodyFamily"]["name"])}</b> · self-hosted TTF ×{len(B["type"]["files"])} (open licence)</p>{spec}<p class="meta">Source: _brand-extraction.json § type (mode of computed styles per tag, 12 pages)</p>')}
{section("voice", "Voice", ["home-only", "inferred"], f'<p><span class="badge">tone guess: {esc(B["voice"]["tone"]["guess"])}</span> <small>{esc(B["voice"]["tone"]["evidence"])}</small></p><div class="grid voice"><div class="card"><small>Hero headline</small>{esc(B["voice"]["heroHeadline"])}<br><small style="margin-top:8px">{esc(B["voice"]["heroSubcopy"])}</small></div><div class="card"><small>Tagline</small>{esc(B["site"]["tagline"])}</div><div class="card"><small>First paragraph</small>{esc(B["voice"]["firstParagraph"][:260])}</div></div><h4 style="margin-top:32px">CTA frequency <span class="badge">cross-page</span></h4><table>{cta_tbl}</table><h4 style="margin-top:32px">Repeated headings (≥3 pages)</h4><ul class="two">{head_list}</ul><div class="stats" style="margin-top:24px"><div class="stat"><b>{tm["headingsUppercasePercent"]}%</b>headings uppercase</div><div class="stat"><b>{tm["distinctHeadings"]}</b>distinct headings</div><div class="stat"><b>{tm["distinctCtaLabels"]}</b>distinct CTA labels</div></div>')}
{section("tensions", "Tensions", ["observed", "synthesized"], f'<p class="meta">Descriptive contradictions within the current site — the decision agenda for the migration (replica mode: these become inconsistency-register candidates, not changes).</p><div class="grid tensions">{tcards}</div>')}
{section("motifs", "Motifs", ["cross-page"], f'<h4>Radii</h4><div class="grid motifs">{rad}</div><h4 style="margin-top:32px">Shadows</h4><div class="grid motifs">{shd}</div><h4 style="margin-top:32px">Gradients</h4><div class="grid motifs">{grd}</div><p class="meta">Source: _brand-extraction.json § motifs</p>')}
{section("components", "Components", ["cross-page"], f'<h4>Buttons (top variants)</h4><ul class="comp">{btn}</ul><h4>Patterns</h4><ul class="comp">{pat}</ul>')}
{section("modules", "Module candidates (prep)", ["synthesized"], f'<p class="meta">Cross-page structural repeats detected from headings › CTA labels › body corroboration. Status <code>candidate</code> — confirm/prune before migrate.</p>{mods}')}
{section("crosspromo", "Cross-promo reproduction", ["observed"], f'<div class="crosspromo"><span class="tag">Reproduction · approximate</span><h3 style="margin-top:16px;color:#fff">Footer “Trending” + “Learn” clusters (every page)</h3><div class="cols"><div><h5>Company</h5><ul><li>About Us</li><li>Careers</li><li>Corporate Governance &amp; Ethics</li><li>Investor Relations</li></ul></div><div><h5>Resources</h5><ul><li>Academic &amp; Research Alliances</li><li>Executive Briefing Center</li><li>News Releases</li><li>Services</li></ul></div><div><h5>Trending</h5><ul><li>From Overdesign to Co-Design…</li><li>Synopsys Posts Financial Results…</li><li>New Synopsys Multiphysics Fusion™…</li></ul></div><div><h5>Learn</h5><ul><li>What is an AI Accelerator?</li><li>What are Chiplets?</li><li>What is EDA?</li><li>What is Physical AI?</li></ul></div></div></div>')}
{section("system", "System components", ["cross-page"], f'<ul class="comp">{sysc}</ul>')}
{section("logo", "Logo & favicons", ["home-only"], f'<div class="logo"><div class="mark">{logo_svg}</div><dl><dt>Source</dt><dd>{esc(B["logo"]["sourceSelector"])}</dd><dt>File</dt><dd>SVG, viewBox {esc(B["logo"]["viewBox"])}, rendered {B["logo"]["renderedWidth"]}px wide · <code>assets/logo.svg</code></dd><dt>Variants captured</dt><dd>purple inline SVG (header)</dd><dt>Variants not captured</dt><dd>white footer raster (URL recorded), utility-bar wordmark, Ansys co-brand SVG</dd><dt>Favicon</dt><dd><img src="assets/favicon.ico" width="16" height="16" alt=""> <code>assets/favicon.ico</code></dd></dl></div>')}
{section("spacing", "Spacing & shape", ["cross-page"], f'<p>Base unit <b>{B["spacing"]["baseUnit"]}px</b> · containers {esc(", ".join(c["maxWidth"] for c in B["spacing"]["containers"][:3]))}</p><div class="bars">{bars}</div><h4 style="margin-top:32px">Radii revisited</h4><p>{pills}</p>')}
</main>
<footer class="end"><main>Provenance: rendered by stardust:extract from _brand-extraction.json, DESIGN.json, PRODUCT.md, _crawl-log.json, pages/*.json and assets/screenshots/. Descriptive only.<br>What's next: replica flow — Phase 2 preserve-direction (verbatim promotion) → Phase 3 recreate archetypes → Phase 4 source-fidelity gate.<br>Badges: <span class="badge">observed</span> frequency-counted across ≥3 pages · <span class="badge">home-only</span> single page · <span class="badge">cross-page</span> aggregated · <span class="badge">inferred</span> agent judgment · <span class="badge">synthesized</span> constructed claim.</main></footer>
</body></html>'''
open(f'{CUR}/brand-review.html', 'w').write(HTML)
print('brand-review.html', len(HTML), 'bytes;', len(tensions), 'tensions:', [t[0] for t in tensions])
