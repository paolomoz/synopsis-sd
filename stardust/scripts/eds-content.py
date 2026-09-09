#!/usr/bin/env python3
"""eds-content.py — generate DA body-fragment content pages for the synopsys.com replica.

Writes content/nav.html, content/footer.html and content/verification/simulation/vcs.html
from the captured page record (verbatim text) and the verbatim nav/footer markup.
ENCODE contract per deploy SKILL.md § The ENCODE contract / Step 9; David's Model rules.
"""
import json, re, html, os

esc = html.escape
page = json.load(open('stardust/current/pages/verification-simulation-vcs-html.json'))
B = page['body']
hdr = open('stardust/prototypes/_partials/header.html').read()
ftr = open('stardust/prototypes/_partials/footer.html').read()
main = open('stardust/prototypes/_partials/main-vcs.html').read()
MEDIA = 'https://content.da.live/paolomoz/synopsis-sd/media'  # DA media upload blocked (token expired) — fully-qualified source CDN per D4; re-point to content.da.live/…/media once uploaded
LIVE = 'https://www.synopsys.com'

def localize(href):
    """Internal synopsys.com pages → root-relative, extensionless (localize-links stage does the
    tree-aware pass; this only normalises the obvious in-set forms)."""
    if not href: return '#'
    h = href
    if h.startswith(LIVE): h = h[len(LIVE):] or '/'
    if h.startswith('/') and not h.startswith('//'):
        h = re.sub(r'\.html$', '', h)
        if h != '/' and h.endswith('/'): h = h[:-1]
        return h
    return h  # external (careers., investor., news., ansys., semiengineering …) stays absolute

def body(sections):
    return '<body>\n  <header></header>\n  <main>\n' + '\n'.join(f'    <div>\n{s}\n    </div>' for s in sections) + '\n  </main>\n  <footer></footer>\n</body>\n'

# ---------------- nav ----------------
h2 = re.sub(r'<svg.*?</svg>', '', hdr, flags=re.S)
tops = [t for t in re.findall(r'<li class="main-nav-item has-dropdown[^"]*" data-menu="([^"]+)"', h2) if 'Language' not in t]
menus = {}
for t in tops:
    i = h2.find(f'data-menu="{t}"', h2.find('dropdown-list')); seg = h2[i:i + 40000]
    ends = [seg.find(f'data-menu="{o}"', 10) for o in tops if o != t]; ends = [e for e in ends if e > 0]
    if ends: seg = seg[:min(ends)]
    out = []; seen = set()
    for href, txt in re.findall(r'<a[^>]*href="([^"#]+)"[^>]*>(.*?)</a>', seg, flags=re.S):
        tx = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', txt))).strip().replace('​', '')
        if tx and len(tx) < 60 and href.startswith(('/', 'http')) and (tx, href) not in seen:
            seen.add((tx, href)); out.append((tx, href))
    menus[html.unescape(t)] = out
if not menus.get('Support & Training'):
    menus['Support & Training'] = [('Support', '/support.html'), ('Global Support Centers', '/support/global-support-centers.html'), ('Training', '/support/training.html')]
nav_list = '<ul>' + ''.join(f'<li>{esc(t)}<ul>' + ''.join(f'<li><a href="{esc(localize(h))}">{esc(x)}</a></li>' for x, h in menus[t]) + '</ul></li>' for t in menus) + '</ul>'
nav_sections = [
    # 0 utility bar: brand pair + language list + Ask
    '<p><a href="https://www.synopsys.com/">Synopsys</a></p><p><a href="https://ansys.synopsys.com/">Ansys</a></p><ul><li>English</li><li>日本語</li><li>简体中文</li><li>繁體中文</li><li>한국어</li></ul><p><a href="https://www.synopsys.com/#ask">Ask</a></p>',
    # 1 brand
    '<p><a href="/">Synopsys</a></p>',
    # 2 sections
    nav_list,
    # 3 tools
    '<p><a href="https://www.synopsys.com/search.html">Search Synopsys.com</a></p><p><strong><a href="/contact-sales">Contact Sales</a></strong></p>',
]
os.makedirs('content/verification/simulation', exist_ok=True)
open('content/nav.html', 'w').write(body(nav_sections))

# ---------------- footer ----------------
def links(a, b):
    seg = ftr[ftr.find(a):ftr.find(b) if b else None]
    return re.findall(r'<a href="([^"]+)"[^>]*>\s*([^<]+?)\s*</a>', seg)
cols = [('Company', links('<h3>Company', '<h3>Resources')), ('Resources', links('<h3>Resources', '<h3>Trending')), ('Trending', links('<h3>Trending', '<h3>Learn')), ('Learn', links('<h3>Learn', 'global-footer-dropdown'))]
social = re.findall(r'<a href="(https://(?:x\.com|www\.linkedin|www\.facebook|www\.youtube|www\.instagram)[^"]*)"', ftr)
social_names = {'x.com': 'X', 'linkedin': 'LinkedIn', 'facebook': 'Facebook', 'youtube': 'YouTube', 'instagram': 'Instagram'}
legal = re.findall(r'<a href="([^"]+)"[^>]*>\s*(Privacy|Trademark &amp; Brands|Security|Copyright)\s*</a>', ftr)
footer_sections = [f'<h3>{esc(t)}</h3><ul>' + ''.join(f'<li><a href="{esc(localize(h))}">{esc(html.unescape(x))}</a></li>' for h, x in ls) + '</ul>' for t, ls in cols]
footer_sections.append('<ul><li>English</li><li>日本語</li><li>简体中文</li><li>繁體中文</li><li>한국어</li></ul>')
footer_sections.append('<ul>' + ''.join(f'<li><a href="{esc(u)}">{next(n for k, n in social_names.items() if k in u)}</a></li>' for u in social) + '</ul>')
footer_sections.append('<p>©2026 Synopsys, Inc. All Rights Reserved</p><ul>' + f'<li><a href="{esc(localize(legal[0][0]))}">Privacy</a></li><li><a href="https://www.synopsys.com/#cookie-settings">Cookie Settings</a></li>' + ''.join(f'<li><a href="{esc(localize(h))}">{html.unescape(x)}</a></li>' for h, x in legal[1:]) + '</ul>')
open('content/footer.html', 'w').write(body(footer_sections))

# ---------------- VCS page ----------------
crumbs = [('Home', '/'), ('Verification Family', '/verification.html'), ('Simulation', '/verification/simulation.html'), ('VCS', '/verification/simulation/vcs.html')]
intro = B[14:17]
def rich(p):
    t = esc(p)
    t = t.replace('VC SpyGlass Lint', '<a href="/verification/static-and-formal-verification/vc-spyglass/vc-spyglass-lint">VC SpyGlass Lint</a>')
    return t
features = [(B[17], B[18:20]), (B[20], B[21:29]), (B[29], [B[30]])]
def li(x):
    t = esc(x).replace('MATLAB', '<a href="/verification/simulation/vcs/vcs-matlab">MATLAB</a>') if 'MATLAB' in x else esc(x)
    return f'<li>{t}</li>'
feat_html = ''.join(f'<p><strong>{esc(t)}</strong></p><ul>{"".join(li(x) for x in xs)}</ul>' for t, xs in features)
kb = [('star-purple.svg', 'Industry-Leading Performance & Capacity'), ('automate-purple.svg', 'Advanced Simulation Technologies'), ('native-integration-purple.svg', 'Planning, Coverage & Execution Management Native Integration')]
cards = []
for c in re.findall(r'<section[^>]*class="component-assetcard.*?</section>', main, flags=re.S):
    opening = c[:c.find('>') + 1]
    if 'slick-cloned' in opening: continue
    lab = re.search(r'class="label">\s*([^<]+?)\s*<', c).group(1)
    head = re.search(r'<h4 class="heading">\s*<span>\s*([^<]+?)\s*</span>', c).group(1)
    cta = re.search(r'<a href="([^"]*)"[^>]*>\s*([^<]+?)\s*<', c[c.find('heading-desc-wrapper'):])
    cards.append((lab, html.unescape(head), cta.group(2), cta.group(1)))
diagram = 'https://images.synopsys.com/is/image/synopsys/VCS?qlt=82&ts=1759850270847&%24responsive%24&fit=constrain&dpr=off&wid=1200'
meta = f'<div class="metadata"><div><div>Title</div><div>{esc(page["title"])}</div></div><div><div>Description</div><div>{esc(page["description"])}</div></div></div>'
vcs_sections = [
    meta,
    '<div class="breadcrumbs"><div><div><ul>' + ''.join(f'<li><a href="{localize(h)}">{esc(t)}</a></li>' for t, h in crumbs) + '</ul></div></div></div>',
    f'<div class="hero"><div><div><h1>{esc(B[9])}</h1><p><em><a href="/verification/resources/datasheets/vcs-industrysngqs-highest-performance-simulation-solution">Datasheet</a></em></p></div></div></div>',
    '<div class="anchor-nav"><div><div><ul><li><a href="#overview">Overview</a></li><li><a href="#benefits">Key Benefits</a></li><li><a href="#features">Features</a></li><li><a href="#resources">Resources</a></li></ul><p><strong><a href="/contact-sales">Get Started</a></strong></p></div></div></div>',
    '<h2>The Industry’s Highest Performance Simulation Solution</h2>' + ''.join(f'<p>{rich(p)}</p>' for p in intro) + '<div class="section-metadata"><div><div>anchor</div><div>overview</div></div></div>',
    '<h2>Key Benefits</h2><div class="cards benefits">' + ''.join(f'<div><div><img src="{MEDIA}/icons/{f}" alt="{esc(t)}"></div><div><p>{esc(t)}</p></div></div>' for f, t in kb) + '</div><div class="section-metadata"><div><div>style</div><div>tinted</div></div><div><div>anchor</div><div>benefits</div></div></div>',
    f'<h2>Industry’s Highest Performance Simulation Solution</h2><div class="columns features"><div><div>{feat_html}</div><div><img src="{diagram}" alt="Synopsys VCS Diagram"></div></div></div><div class="section-metadata"><div><div>anchor</div><div>features</div></div></div>',
    '<h2>Resources</h2><div class="carousel resources">' + ''.join(f'<div><div><p><strong>{esc(l)}</strong></p><h3>{esc(h)}</h3><p><a href="{localize(u)}">{esc(c)}</a></p></div></div>' for l, h, c, u in cards) + '</div><div class="section-metadata"><div><div>style</div><div>tinted</div></div><div><div>anchor</div><div>resources</div></div></div>',
    '<div class="hero connect"><div><div><h2>Connect with Us</h2><p><em><a href="/contact-sales">Contact Sales</a></em></p></div></div></div>',
]
open('content/verification/simulation/vcs.html', 'w').write(body(vcs_sections))
print('nav menus:', {k: len(v) for k, v in menus.items()}, '| footer cols:', [(t, len(l)) for t, l in cols], '| cards:', len(cards))
