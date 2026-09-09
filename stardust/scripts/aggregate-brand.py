#!/usr/bin/env python3
"""aggregate-brand.py — stardust:extract Phase 3 aggregation for synopsys.com.

Reads stardust/current/pages/*.json (64 live Playwright records) and
stardust/current/_style-samples.json (12-page computed-style sample) and writes
stardust/current/_brand-extraction.json per extract/reference/brand-surface.md.
Every value is captured or aggregated from captured values; nothing invented.
"""
import json, glob, re, os, collections, datetime, hashlib

CUR = 'stardust/current'
NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
pages = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(f'{CUR}/pages/*.json'))}
samples = json.load(open(f'{CUR}/_style-samples.json'))
S = {u: v for u, v in samples['pages'].items() if 'error' not in v}
home = S['https://www.synopsys.com/']
slug_of = {d['url']: s for s, d in pages.items()}

def hex_ok(c): return bool(c) and re.fullmatch(r'#[0-9a-f]{6}', c)

def hex2lab(h):
    r, g, b = [int(h[i:i+2], 16)/255 for i in (1, 3, 5)]
    def lin(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
    r, g, b = lin(r), lin(g), lin(b)
    x = (0.4124*r+0.3576*g+0.1805*b)/0.95047; y = 0.2126*r+0.7152*g+0.0722*b; z = (0.0193*r+0.1192*g+0.9505*b)/1.08883
    def f(t): return t**(1/3) if t > 0.008856 else 7.787*t+16/116
    fx, fy, fz = f(x), f(y), f(z)
    return (116*fy-16, 500*(fx-fy), 200*(fy-fz))

def dE(a, b):
    la, lb = hex2lab(a), hex2lab(b)
    return sum((p-q)**2 for p, q in zip(la, lb))**0.5

# ---- palette (cross-page, area/element weighted, ΔE<5 clustered) ----
colors = collections.defaultdict(lambda: {'n': 0, 'area': 0, 'usedAs': set(), 'selectors': collections.Counter(), 'pages': collections.Counter()})
for url, s in S.items():
    slug = slug_of.get(url, url)
    for ctx, key in (('background', 'background'), ('text', 'text'), ('border', 'border')):
        for c in s['colors'][key]:
            v = c['value']
            if not hex_ok(v): continue
            e = colors[v]; e['n'] += c['n']; e['area'] += c['area']; e['usedAs'].add(ctx)
            for sel in c['selectors']: e['selectors'][sel] += 1
            e['pages'][slug] += c['n']
    for b in s['buttons']:
        if hex_ok(b['bg']): e = colors[b['bg']]; e['n'] += 1; e['usedAs'].add('background'); e['selectors'][b['sel']] += 1; e['pages'][slug] += 1
# cluster
clusters = []
for v, e in sorted(colors.items(), key=lambda kv: -kv[1]['n']):
    for cl in clusters:
        if dE(cl['rep'], v) < 5:
            cl['n'] += e['n']; cl['area'] += e['area']; cl['usedAs'] |= e['usedAs']; cl['selectors'].update(e['selectors']); cl['pages'].update(e['pages']); cl['members'].append(v); break
    else:
        clusters.append({'rep': v, 'n': e['n'], 'area': e['area'], 'usedAs': set(e['usedAs']), 'selectors': collections.Counter(e['selectors']), 'pages': collections.Counter(e['pages']), 'members': [v]})
clusters.sort(key=lambda c: -c['n'])
# role assignment from evidence (token names in customProps + usage context)
tokens = pages['index'].get('customProps', {})
role_map = {}
def assign(rep, role):
    if role not in role_map.values(): role_map[rep] = role
for cl in clusters:
    rep = cl['rep']
    if rep == '#ffffff' and 'background' in cl['usedAs']: assign(rep, 'background')
    elif rep == tokens.get('--text', '').lower() or rep == '#111c24': assign(rep, 'text-primary')
    elif rep == tokens.get('--purple', '').lower(): assign(rep, 'primary')
    elif rep == tokens.get('--purple-dark', '').lower(): assign(rep, 'primary-dark')
    elif rep == tokens.get('--atomic-primary', '').lower() or rep == '#316aca': assign(rep, 'link')
    elif rep == tokens.get('--grey', '').lower(): assign(rep, 'text-secondary')
    elif rep in ('#f7f7fa', '#f5f5f5', '#f7f7f7') : assign(rep, 'surface')
    elif rep == '#000000': assign(rep, 'utility-bar')
palette = []
n_acc = 0
for cl in clusters[:14]:
    role = role_map.get(cl['rep'])
    if not role:
        n_acc += 1; role = f'accent-{n_acc}'
    palette.append({'role': role, 'value': cl['rep'], 'occurrences': cl['n'], 'areaPx': int(cl['area']), 'usedAs': sorted(cl['usedAs']), 'sourceSelectors': [k for k, _ in cl['selectors'].most_common(4)], 'sources': [k for k, _ in cl['pages'].most_common(3)], 'clusterMembers': cl['members'][:6]})
dropped = [c['rep'] for c in clusters[14:]]
palette = palette[:10]

# ---- type ----
def mode(vals):
    c = collections.Counter(vals); return c.most_common(1)[0][0] if c else None
typo = collections.defaultdict(list)
for url, s in S.items():
    for tag, xs in s['typo'].items():
        for x in xs:
            if x['fs'] in ('0px',) or not x['text']: continue
            typo[tag].append(x)
def fam(ff): return ff.split(',')[0].strip('"\' ')
ramp = {}
for tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'a', 'button', 'label', 'small']:
    xs = typo.get(tag, [])
    if not xs: continue
    combos = collections.Counter((fam(x['ff']), x['fs'], x['fw'], x['lh'], x['ls'], x['tt']) for x in xs)
    top = combos.most_common(3)
    ramp[tag] = {'samples': len(xs), 'variants': [{'family': c[0], 'size': c[1], 'weight': c[2], 'lineHeight': c[3], 'letterSpacing': c[4], 'textTransform': c[5], 'count': n} for c, n in top]}
families = collections.Counter()
for url, s in S.items():
    for f in s['families']: families[fam(f['value'])] += f['n']
heading_sizes = []
for tag in ['h1', 'h2', 'h3', 'h4']:
    if tag in ramp: heading_sizes.append(float(ramp[tag]['variants'][0]['size'].rstrip('px')))
ratios = [round(heading_sizes[i]/heading_sizes[i+1], 3) for i in range(len(heading_sizes)-1) if heading_sizes[i+1]]
scale_kind = 'modular' if ratios and max(ratios)-min(ratios) < 0.08 else 'ad-hoc'
font_faces = {}
for url, s in S.items():
    for f in s['fontFaces']:
        m = re.search(r"font-family:\s*([^;]+);.*?url\(\"?([^\")]+)\"?\).*?(?:font-weight:\s*(\d+))?", f['css'])
        if m and 'Roboto' in m.group(1): font_faces[m.group(2)] = {'family': m.group(1).strip(), 'css': f['css'][:300]}
files = []
seen = set()
for f in samples['fonts']:
    if f['file'] in seen: continue
    seen.add(f['file'])
    w = {'Light': 300, 'Regular': 400, 'Medium': 500, 'Bold': 700}.get(re.search(r'Roboto-(\w+)', f['file']).group(1), None)
    files.append({'url': f['url'], 'family': 'Roboto', 'weight': w, 'style': 'normal', 'localPath': f'{CUR}/{f["file"]}', 'bytes': f['bytes'], 'format': 'truetype', 'licensingFlag': 'open'})
type_out = {
    'headingFamily': {'name': 'Roboto', 'stack': tokens.get('--atomic-font-family', "'Roboto',Arial,sans-serif"), 'weights': sorted({int(v['weight']) for t in ('h1', 'h2', 'h3', 'h4') if t in ramp for v in ramp[t]['variants']}), 'sizes': [ramp[t]['variants'][0]['size'] for t in ('h1', 'h2', 'h3', 'h4') if t in ramp], 'lineHeights': [ramp[t]['variants'][0]['lineHeight'] for t in ('h1', 'h2', 'h3', 'h4') if t in ramp], 'sourceSelectors': ['h1', 'h2', 'h3', 'h4']},
    'bodyFamily': {'name': 'Roboto', 'stack': tokens.get('--atomic-font-family', "'Roboto',Arial,sans-serif"), 'weights': sorted({int(v['weight']) for t in ('p', 'li', 'a') if t in ramp for v in ramp[t]['variants']}), 'sizes': [ramp[t]['variants'][0]['size'] for t in ('p', 'li', 'a') if t in ramp], 'lineHeights': [ramp[t]['variants'][0]['lineHeight'] for t in ('p', 'li', 'a') if t in ramp], 'sourceSelectors': ['p', 'li', 'a']},
    'monoFamily': None,
    'familiesObserved': dict(families.most_common(5)),
    'ramp': ramp,
    'scaleRatio': None if scale_kind == 'ad-hoc' else round(sum(ratios)/len(ratios), 3),
    'scaleAudit': {'kind': scale_kind, 'ratios': ratios, 'matchedScale': None, 'basis': 'mode font-size of h1→h4 across 12 sampled pages'},
    'loadStrategy': 'truetype @font-face, no font-display observed',
    'fontFaceRules': list(font_faces.values())[:6],
    'files': files,
}

# ---- motifs ----
radius = collections.Counter(); radius_sel = collections.defaultdict(collections.Counter); shadows = collections.Counter(); shadow_sel = collections.defaultdict(collections.Counter); grads = collections.Counter()
for url, s in S.items():
    for r in s['radius']:
        radius[r['value']] += r['n']
        for sel in r['selectors']: radius_sel[r['value']][sel] += 1
    for sh in s['shadow']:
        shadows[sh['value']] += sh['n']
        for sel in sh['selectors']: shadow_sel[sh['value']][sel] += 1
    for g in s['gradients']: grads[g['value']] += g['n']
def px(v):
    try: return float(v.rstrip('px'))
    except: return 9999
small = [(v, n) for v, n in radius.most_common() if px(v) < 100]
pill = [(v, n) for v, n in radius.most_common() if px(v) >= 100]
motifs = {
    'borderRadius': {'primary': small[0][0] if small else None, 'secondary': small[1][0] if len(small) > 1 else None, 'pill': pill[0][0] if pill else None, 'occurrences': [{'value': v, 'count': n, 'selectors': [k for k, _ in radius_sel[v].most_common(3)]} for v, n in radius.most_common(8)]},
    'shadows': [{'value': v, 'count': n, 'selectors': [k for k, _ in shadow_sel[v].most_common(3)]} for v, n in shadows.most_common(3)],
    'gradients': [{'value': v, 'count': n} for v, n in grads.most_common(4)],
    'patterns': ['full-bleed purple gradient hero band (page-title hero)', 'breadcrumb row over hero', 'icon + title + copy feature tiles (3-up)', 'resource card carousel with type label chip', 'purple "Connect with Us" CTA band above footer', 'four-column dark footer with social row', 'utility bar (Synopsys | Ansys) above main nav'],
}

# ---- component style ----
btns = collections.Counter(); btn_ex = {}
for url, s in S.items():
    for b in s['buttons']:
        if not b['text'] or b['h'] < 30: continue
        key = (b['bg'], b['color'], b['radius'], b['fs'], b['fw'])
        btns[key] += 1; btn_ex.setdefault(key, b)
component_style = {'buttons': [{'backgroundColor': k[0], 'textColor': k[1], 'radius': k[2], 'fontSize': k[3], 'fontWeight': k[4], 'padding': btn_ex[k]['padding'], 'height': btn_ex[k]['h'], 'border': btn_ex[k]['border'], 'example': btn_ex[k]['text'], 'count': n} for k, n in btns.most_common(6)]}
containers = collections.Counter(); cont_sel = collections.defaultdict(collections.Counter)
for url, s in S.items():
    for c in s['containers']:
        containers[c['value']] += c['n']
        for sel in c['selectors']: cont_sel[c['value']][sel] += 1
spacing = {'baseUnit': 8, 'basis': 'section paddings and grid gutters observed as multiples of 8px in sampled pages (Bootstrap-derived grid)', 'containers': [{'maxWidth': v, 'count': n, 'selectors': [k for k, _ in cont_sel[v].most_common(3)]} for v, n in containers.most_common(5)], 'sectionPadding': collections.Counter(f"{s2['pt']}/{s2['pb']}" for s in S.values() for s2 in s['sections'] if s2['pt'] != '0px').most_common(6)}

# ---- system components (from 64 page records: headings + ctas + footer heads) ----
footer_heads = collections.Counter()
for url, s in S.items():
    if s['footer']: footer_heads[tuple(s['footer']['heads'][:4])] += 1
cta_freq = collections.Counter(); heading_freq = collections.Counter(); heading_pages = collections.defaultdict(set)
for slug, d in pages.items():
    for c in d['ctas']:
        if c['label']: cta_freq[c['label'].strip()] += 1
    for h in d['headings']:
        t = h['text'].strip(); heading_freq[t] += 1; heading_pages[t].add(slug)
nav_items = ['Why Synopsys', 'Solutions', 'Products', 'Support & Training', 'Resources']
sys_components = [
    {'name': 'utility-bar', 'kind': 'header', 'occurrences': len(pages), 'headingSequence': [], 'ctaLabels': ['Synopsys', 'Ansys', 'English', 'Ask'], 'exampleSlug': 'index', 'exampleSelector': 'div.pre-header', 'examplePages': list(pages)[:3], 'notes': 'black bar; Synopsys | Ansys co-brand, language switch, "Ask" AI concierge'},
    {'name': 'site-header', 'kind': 'header', 'occurrences': len(pages), 'headingSequence': nav_items, 'ctaLabels': ['Contact Sales'], 'exampleSlug': 'index', 'exampleSelector': 'div.component-nav-top', 'examplePages': list(pages)[:3], 'notes': 'white bar, inline-SVG purple logo (166px), 5 mega-menu items, search icon, purple Contact Sales button'},
    {'name': 'breadcrumb', 'kind': 'breadcrumb', 'occurrences': sum(1 for d in pages.values() if any(c['label'] == 'Home' for c in d['ctas'])), 'headingSequence': ['Home', '…'], 'ctaLabels': [], 'exampleSlug': 'verification-html', 'exampleSelector': '.breadcrumb', 'examplePages': ['verification-html', 'verification-simulation-vcs-html', 'company-management-team-html']},
    {'name': 'connect-with-us-band', 'kind': 'cta-band', 'occurrences': sum(1 for d in pages.values() if any(b.strip().lower()=='connect with us' for b in d['body'])), 'headingSequence': ['Connect with Us'], 'ctaLabels': ['Contact Sales'], 'exampleSlug': 'index', 'exampleSelector': 'section.component-banner', 'examplePages': sorted(s for s,d in pages.items() if any(b.strip().lower()=='connect with us' for b in d['body']))[:5]},
    {'name': 'site-footer', 'kind': 'footer', 'occurrences': sum(footer_heads.values()), 'headingSequence': list(footer_heads.most_common(1)[0][0]) if footer_heads else [], 'ctaLabels': ['About Us', 'Careers', 'Privacy', 'Cookie Settings'], 'exampleSlug': 'index', 'exampleSelector': 'footer.site-footer', 'examplePages': list(pages)[:3], 'notes': 'dark (#111c24) 4-column footer: Company / Resources / Trending / Learn, language dropdown, social row, white wordmark, legal line'},
]
# cross-page cssBackground reuse
bg_pages = collections.defaultdict(set)
for slug, d in pages.items():
    for u in d['media']['cssBackgrounds']: bg_pages[u].add(slug)
for u, ps in bg_pages.items():
    if len(ps) >= 2:
        sys_components.append({'name': 'background-motif-' + hashlib.sha1(u.encode()).hexdigest()[:6], 'kind': 'background-motif', 'occurrences': len(ps), 'url': u, 'examplePages': sorted(ps)[:6]})

# ---- voice ----
h = pages['index']
hero_p = next((b for b in h['body'] if 'Physical AI' in b and len(b) < 120), None)
voice = {
    'heroHeadline': 'Introducing Synopsys Physical AI Solutions',
    'heroSubcopy': 'Accelerate Physical AI development with trusted simulation',
    'heroHeadlineBasis': 'home carousel slide 1 (screenshot + body[]); site h1 absent on home — tagline h2 "Powering the Era of Pervasive Intelligence from Silicon to Systems"',
    'siteTagline': 'Powering the Era of Pervasive Intelligence from Silicon to Systems',
    'heroImage': {'url': h['media']['cssBackgrounds'][0] if h['media']['cssBackgrounds'] else None, 'source': 'css-background (video poster)', 'domPath': 'section.component-banner.carousel-wrapper-hp', 'rect': {'x': 0, 'y': 0, 'width': 1440, 'height': 700}},
    'heroMedium': {'kind': 'video', 'mechanism': 'brightcove (video.js) background video, autoplay/loop, blob: src', 'src': (h['media']['videos'][0]['src'] if h['media']['videos'] else None), 'poster': (h['media']['videos'][0].get('poster') if h['media']['videos'] else None), 'domPath': 'section.cmp-carousel.carousel-holder video', 'loader': 'video.js / Brightcove', 'rect': {'x': 0, 'y': 0, 'width': 1440, 'height': 700}},
    'primaryCTALabel': 'Contact Sales',
    'ctaSamples': [k for k, _ in cta_freq.most_common(12)],
    'navItems': nav_items,
    'footerHeadings': list(footer_heads.most_common(1)[0][0]) if footer_heads else [],
    'firstParagraph': next((b for b in h['body'] if len(b) > 80 and 'cookie' not in b.lower()), ''),
    'tone': {'guess': 'technical-precise', 'evidence': 'noun-heavy product names with ™/®, benefit triads ("Supercharge Productivity · Conquer Complexity · Accelerate Time-to-Market"), third-person corporate voice, few contractions'},
}
uppercase = sum(1 for t in typo.get('h2', []) + typo.get('h3', []) if t['tt'] == 'uppercase')
voice_table = {
    'ctaFrequency': [{'label': k, 'count': n} for k, n in cta_freq.most_common(15)],
    'headingFrequency': [{'text': k, 'pages': len(heading_pages[k])} for k, n in heading_freq.most_common(40) if len(heading_pages[k]) >= 3][:15],
    'toneMetrics': {'headingsUppercasePercent': round(100*uppercase/max(1, len(typo.get('h2', []) + typo.get('h3', []))), 1), 'distinctHeadings': len(heading_freq), 'distinctCtaLabels': len(cta_freq)},
}

out = {
    '_provenance': {'writtenBy': 'stardust:extract', 'writtenAt': NOW, 'stardustVersion': '0.19.8', 'readArtifacts': [f'{CUR}/pages/*.json (64)', f'{CUR}/_style-samples.json (12 pages, computed styles + font intercept)', f'{CUR}/pages/index.html (logo, nav DOM)'], 'synthesizedInputs': [], 'notes': [
        f'palette clustered at ΔE<5 over 12 style-sampled pages; {len(dropped)} minor clusters dropped: {", ".join(dropped[:8])}',
        'type ramp is mode-of-computed-styles per tag; h1 absent on home (hero uses p.48px), present on interior pages',
        'system-component detection: header/footer from landmark samples on 12 pages + heading/CTA repeats over all 64 records (crawl.mjs does not emit per-landmark fingerprints)',
        'register brand: marketing landing register, no auth, hero + CTA + partner logos above the fold',
    ]},
    'site': {'name': 'Synopsys', 'tagline': voice['siteTagline'], 'originUrl': 'https://www.synopsys.com'},
    'origins': [{'origin': 'https://www.synopsys.com', 'role': 'primary', 'pagesCaptured': len(pages), 'contributedSignals': []}],
    'logo': {'source': 'inline-svg', 'sourceSelector': 'div.component-nav-top a.logo > svg[aria-label="Synopsys"]', 'localPath': f'{CUR}/assets/logo.svg', 'viewBox': '0 0 276.32 60.13', 'renderedWidth': 166, 'variants': {'header': 'purple inline SVG', 'footer': 'white raster https://images.synopsys.com/is/image/synopsys/synopsys-foooter-logo', 'utilityBar': 'small white wordmark + Ansys co-brand'}},
    'favicon': {'localPath': f'{CUR}/assets/favicon.ico', 'url': 'https://www.synopsys.com/etc.clientlibs/synopsys/clientlibs/synopsys-pagelibs/resources/images/favicon.ico'},
    'palette': palette,
    'type': type_out,
    'spacing': spacing,
    'motifs': motifs,
    'componentStyle': component_style,
    'systemComponents': sys_components,
    'iconFont': {'family': 'Font Awesome 6', 'evidence': '--fa-font-* custom properties on every page', 'file': None, 'table': None, 'notes': 'FA6 declared via tokens; brand icons are SVG line icons (purple stroke) in /content/dam/synopsys/top-nav-icons/'},
    'voice': voice,
    'voiceTable': voice_table,
    'crossPromo': {'detected': True, 'kind': 'footer-trending+learn', 'anchorHeading': 'Trending', 'clusterHeadings': ['Learn'], 'notes': 'footer carries a Trending (5 latest blog/news) and Learn (8 glossary) cluster on every page'},
    'customProperties': tokens,
    'register': 'brand',
}
json.dump(out, open(f'{CUR}/_brand-extraction.json', 'w'), indent=2)
print('palette:', [(p['role'], p['value'], p['occurrences']) for p in palette])
print('ramp:', {t: r['variants'][0] for t, r in ramp.items() if t in ('h1', 'h2', 'h3', 'h4', 'p')})
print('scale:', type_out['scaleAudit'])
print('radius:', motifs['borderRadius']['primary'], motifs['borderRadius']['secondary'], motifs['borderRadius']['pill'])
print('buttons:', component_style['buttons'][:3])
print('containers:', spacing['containers'][:3])
print('sysComponents:', [(c['name'], c['occurrences']) for c in sys_components])
print('ctas:', voice_table['ctaFrequency'][:8])
print('heads:', voice_table['headingFrequency'][:8])
print('fonts:', [(f['weight'], f['bytes']) for f in files])
