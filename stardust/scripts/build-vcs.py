#!/usr/bin/env python3
"""build-vcs.py — assemble stardust/prototypes/vcs-proposed.html (+ canon.css, vcs.css)
from the captured VCS record (content verbatim) and live SVG assets pulled from the
rendered-DOM partials. Values come from stardust/replica/capture/vcs-lift*.json.
"""
import json, re, html, os, shutil

ROOT = 'stardust/prototypes'
P = f'{ROOT}/_partials'
os.makedirs(f'{ROOT}/assets/fonts', exist_ok=True)
for f in os.listdir('stardust/current/assets/fonts'):
    shutil.copy(f'stardust/current/assets/fonts/{f}', f'{ROOT}/assets/fonts/{f}')
hdr = open(f'{P}/header.html').read(); ftr = open(f'{P}/footer.html').read(); main = open(f'{P}/main-vcs.html').read()
page = json.load(open('stardust/current/pages/verification-simulation-vcs-html.json'))

def svgs(s): return re.findall(r'<svg.*?</svg>', s, flags=re.S)
def clean(svg, cls=None, w=None, h=None):
    svg = re.sub(r'\s+', ' ', svg)
    svg = re.sub(r' (class|data-prefix|data-icon|focusable|tabindex|id)="[^"]*"', '', svg, count=0)
    if cls: svg = svg.replace('<svg ', f'<svg class="{cls}" ', 1)
    if w: svg = re.sub(r' width="[^"]*"', '', svg, count=1).replace('<svg ', f'<svg width="{w}" height="{h}" ', 1)
    return svg
H = svgs(hdr); F = svgs(ftr); M = svgs(main)
logo_white = clean(H[0], 'wordmark'); ansys = clean(H[1], 'ansys'); logo = clean(H[2], 'logo-svg')
search = clean(H[3], 'ico'); burger = clean(H[4], 'ico'); globe = clean(H[6], 'ico')
social = [clean(x, 'ico') for x in F[:5]]
download = clean(M[0], 'ico'); caret = clean(M[1], 'ico'); chevron = clean(M[2], 'ico')
arrow_l = clean(M[-2], 'ico') if 'chevron-left' in M[-2] else clean(M[2], 'ico')

esc = html.escape
B = page['body']

# ---- verbatim site-nav markup (hidden mega-menu / search panel are inventoried content; DOM parity per recreation-procedure § Granularity parity) ----
m_ = re.search(r'<div[^>]*class="component-nav-top', hdr)
nav_start = m_.start()
# walk to the matching close of this div
depth = 0; i = nav_start
for tag in re.finditer(r'<div\b|</div>', hdr[nav_start:]):
    depth += 1 if tag.group(0) == '<div' else -1
    if depth == 0:
        nav_end = nav_start + tag.end(); break
nav_inner = hdr[nav_start:nav_end]
nav_inner = re.sub(r'<script\b.*?</script>', '', nav_inner, flags=re.S)
nav_inner = re.sub(r'<style\b.*?</style>', '', nav_inner, flags=re.S)
nav_inner = re.sub(r' on[a-z]+="[^"]*"', '', nav_inner)
nav_inner = re.sub(r'<!--.*?-->', '', nav_inner, flags=re.S)
# close any dangling wrappers: keep only up to the last </div> that closes component-nav-top's parent chain
# absolutize root-relative asset URLs so the prototype renders the same images
nav_inner = re.sub(r'(src|srcset)="(/content/[^"]*)"', lambda m: f'{m.group(1)}="https://www.synopsys.com{m.group(2)}"', nav_inner)
nav_inner = re.sub(r'(srcset)="([^"]*)"', lambda m: m.group(1)+'="'+re.sub(r'(^|,\s*)(/content/)', lambda k: k.group(1)+'https://www.synopsys.com'+k.group(2), m.group(2))+'"', nav_inner)
nav_inner = nav_inner.replace('src="/etc.clientlibs', 'src="https://www.synopsys.com/etc.clientlibs')
open(f'{ROOT}/_partials/nav-verbatim.html', 'w').write(nav_inner)

# ---- footer content (verbatim from record) ----
def links(section_start, section_end):
    seg = ftr[ftr.find(section_start):ftr.find(section_end) if section_end else None]
    return re.findall(r'<a href="([^"]+)"[^>]*>\s*([^<]+?)\s*</a>', seg)
cols = [('Company', links('<h3>Company', '<h3>Resources')), ('Resources', links('<h3>Resources', '<h3>Trending')), ('Trending', links('<h3>Trending', '<h3>Learn')), ('Learn', links('<h3>Learn', 'global-footer-dropdown'))]
social_links = re.findall(r'<a href="(https://(?:x\.com|www\.linkedin|www\.facebook|www\.youtube|www\.instagram)[^"]*)"', ftr)
legal = re.findall(r'<a href="([^"]+)"[^>]*>\s*(Privacy|Trademark &amp; Brands|Security|Copyright)\s*</a>', ftr)
footer_logo = re.search(r'src="(https://images\.synopsys\.com/is/image/synopsys/synopsys-foooter-logo[^"]*)"', ftr).group(1).replace('&amp;', '&')

# ---- cards (real slides only: skip the 3 leading clones) ----
cards = []
for c in re.findall(r'<section[^>]*class="component-assetcard.*?</section>', main, flags=re.S):
    lab = re.search(r'class="label">\s*([^<]+?)\s*<', c).group(1)
    head = re.search(r'<h4 class="heading">\s*<span>\s*([^<]+?)\s*</span>', c).group(1)
    cta = re.search(r'<a href="([^"]*)"[^>]*>\s*([^<]+?)\s*<', c[c.find('heading-desc-wrapper'):])
    opening = c[:c.find('>') + 1]
    cards.append((lab, head, cta.group(2), cta.group(1), 'slick-cloned' in opening))
real = cards  # full live slide list, clones included (DOM parity)

# ---- breadcrumb (verbatim section: dropdown menus are inventoried hidden content) ----
bc_m = re.search(r'<section class="component-breadcrumb.*?</section>', main, flags=re.S)
bc_verbatim = re.sub(r'<!--.*?-->', '', bc_m.group(0), flags=re.S)
bc_verbatim = re.sub(r' on[a-z]+="[^"]*"', '', bc_verbatim)
# live inserts a mobile-only ellipsis item after the first crumb (JS); mirror it statically
first_li_end = bc_verbatim.find('</li>') + 5
bc_verbatim = bc_verbatim[:first_li_end] + '<li class="ellipsis"><a href="#" class="breadcrumb-ellipses">...</a></li>' + bc_verbatim[first_li_end:]

crumbs = [('Home', '/'), ('Verification Family', '/verification.html'), ('Simulation', '/verification/simulation.html'), ('VCS', '/verification/simulation/vcs.html')]
crumb_html = ''.join(f'<li{" class=mid" if 0 < i < len(crumbs) - 2 else ""}><a class="parent" href="{h}">{esc(t)}</a><span class="caret" aria-hidden="true"></span></li>' for i, (t, h) in enumerate(crumbs))
crumb_html = crumb_html.replace('<li class=mid>', '<li class="mid">')
first_end = crumb_html.find('</li>') + 5
crumb_html = crumb_html[:first_end] + '<li class="ellipsis">...</li>' + crumb_html[first_end:]

def li_list(items): return ''.join(f'<li>{esc(x)}</li>' for x in items)

# ---- hidden chatbot legal dialog (verbatim, display:none like live) ----
lm = re.search(r'<div id="legal-overlay".*?</div>\s*</div>', main, flags=re.S)
legal_html = lm.group(0) if lm else ''

# ---- page body ----
intro = B[14:17]
features = [(B[17], B[18:20]), (B[20], B[21:29]), (B[29], [B[30]])]
matlab_href = 'https://www.synopsys.com/verification/simulation/vcs/vcs-matlab.html'
def feat_li(x):
    x = esc(x)
    if 'MATLAB' in x: x = x.replace('MATLAB', f'<a href="{matlab_href}">MATLAB</a>')
    return f'<li>{x}</li>'
intro_html = ''.join(f'<p>{esc(p).replace("VC SpyGlass Lint", "<a href=\"/verification/static-and-formal-verification/vc-spyglass/vc-spyglass-lint.html\">VC SpyGlass Lint</a>")}</p>' for p in intro)
feat_html = ''.join(f'<p><b>{esc(t)}</b></p><ul>{"".join(feat_li(x) for x in xs)}</ul>' for t, xs in features)
kb = [('star-purple.svg.imgo.svg', 'Industry-Leading Performance & Capacity'), ('automate-purple.svg.imgo.svg', 'Advanced Simulation Technologies'), ('native-integration-purple.svg.imgo.svg', 'Planning, Coverage & Execution Management Native Integration')]
kb_html = ''.join(f'<div class="col col-3"><section class="kb"><a class="kb-link"><div class="kb-wrap"><div class="kb-head"><div class="kb-img"><img src="assets/icons/{f}" alt="{esc(t)}" width="50" height="50"></div><div class="kb-title">{esc(t)}</div></div><div class="kb-desc"></div></div></a></section></div>' for f, t in kb)
diagram = 'https://images.synopsys.com/is/image/synopsys/VCS?qlt=82&ts=1759850270847&$responsive$&fit=constrain&dpr=off'
def card(l, h, c, u, cloned=False):
    return f'<section class="card{" slick-cloned" if cloned else ""}"{" aria-hidden=true tabindex=-1" if cloned else ""}><div class="card-text"><div class="label-row"><div class="label"><div class="label-inner">{esc(l)}</div></div></div><div class="card-body"><h4 class="heading"><span>{esc(h)}</span></h4><p></p></div><a href="{u}"{" tabindex=-1" if cloned else ""}>{esc(c)}{chevron}</a></div></section>'
card_html = ''.join(card(l, h, c, u, cl) for l, h, c, u, cl in real)
_unused = ''.join(f'<section class="card"><div class="card-text"><div class="label-row"><div class="label"><div class="label-inner">{esc(l)}</div></div></div><div class="card-body"><h4 class="heading"><span>{esc(h)}</span></h4><p></p></div><a href="{u}">{esc(c)}{chevron}</a></div></section>' for l, h, c, u, _ in real)
nav_items = ['Why Synopsys', 'Solutions', 'Products', 'Support & Training', 'Resources']
toc = [('Overview', '#overview'), ('Key Benefits', '#benefits'), ('Features', '#features'), ('Resources', '#resources')]

HTML = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(page["title"])}</title><meta name="description" content="{esc(page["description"])}">
<link rel="icon" href="assets/favicon.ico"><link rel="stylesheet" href="canon.css"><link rel="stylesheet" href="vcs.css">
</head><body>
<div class="pre-header"><div class="brands"><a href="https://www.synopsys.com" title="Synopsys">{logo_white}</a><span class="divider"></span><a href="https://ansys.synopsys.com" title="Ansys">{ansys}</a></div><div class="utility"><button class="topbar-lang" type="button">{globe}English<span class="caret-down"></span></button><button id="askSynopsys" type="button"><span class="spark"></span>Ask</button></div></div>
<div class="site-wrapper"><div class="root synopsysContainer">
<header class="topNav">{nav_inner}</header>
<div class="breadcrumb"><div class="container">{bc_verbatim}</div></div>
<section class="hero skinny-banner"><div class="text-overlay"><div class="container"><div class="text-wrapper"><div class="title"><h1 class="sr-off">{esc(B[9])}</h1><div class="title-text"><p><b>{esc(B[9])}</b></p></div></div><div class="sub-title"></div><div class="btn-white"><a href="/verification/resources/datasheets/vcs-industrysngqs-highest-performance-simulation-solution.html">{download}<span>Datasheet</span></a></div></div></div></div></section>
<div class="tableOfContents"><section class="toc"><div class="container"><ul><li class="init"><a><span>Overview</span>{caret}</a></li>{"".join(f'<li class="item"><a href="{h}">{esc(t)}</a></li>' for t, h in toc)}</ul><div class="toc-btn"><a class="btn-dark" href="/contact-sales.html" title="Get Started">Get Started</a></div></div></section></div>
<div id="overview" class="anchor"></div>
<div class="band title-band"><div class="container"><section class="textcomp center"><h2 class="title purple">{esc(B[14 - 14 + 0]) if False else "The Industry’s Highest Performance Simulation Solution"}</h2></section></div></div>
<div class="band pb-md"><div class="container"><section class="textcomp"><h2 class="title"></h2><div class="component-text">{intro_html}</div></section></div></div>
<div id="benefits" class="anchor"></div>
<div class="band grey pt-md pb-xs"><div class="container"><section class="textcomp center"><h2 class="title purple">Key Benefits</h2></section></div></div>
<div class="band grey pt-sm pb-md"><div class="container"><section class="row">{kb_html}</section></div></div>
<div id="features" class="anchor"></div>
<div class="band title-band pb-xs"><div class="container"><section class="textcomp center"><h2 class="title purple">Industry’s Highest Performance Simulation Solution</h2></section></div></div>
<div class="band pb-md"><div class="container"><section class="row two-col"><div class="col col-6"><section class="textcomp"><h2 class="title"></h2><div class="component-text">{feat_html}</div></section></div><div class="col col-6"><div class="band pt-sm pb-sm"><div class="component-image"><img srcset="{diagram}&wid=375 375w,{diagram}&wid=480 480w,{diagram}&wid=730 730w,{diagram}&wid=992 992w,{diagram}&wid=1200 1200w" src="{diagram}&wid=730" width="1600" height="1560" alt="Synopsys VCS Diagram"></div></div></div></section></div></div>
<div id="resources" class="anchor"></div>
<div class="band grey pt-md pb-xs"><div class="container"><section class="textcomp center"><h2 class="title purple">Resources</h2></section></div></div>
<div class="band grey pt-xs pb-md"><section class="carousel"><div class="slick-list"><div class="slick-track">{card_html}</div></div><ul class="slick-dots"><li class="active"><button type="button">1</button></li><li><button type="button">2</button></li></ul><button class="slick-arrow prev" aria-label="previous">{clean(M[2], "ico").replace("chevron-right", "chevron-left")}</button><button class="slick-arrow next" aria-label="next">{chevron}</button></section></div>
<section class="hero skinny-banner connect"><div class="text-overlay"><div class="container"><div class="text-wrapper"><div class="title"><h3 class="sr-off">Connect with Us</h3><div class="title-text smaller"><p>Connect with Us</p></div></div><div class="sub-title"></div><div class="btn-white"><a href="/contact-sales.html" class="has-arrow">Contact Sales{chevron}</a></div></div></div></div></section>
<footer class="site-footer"><div class="container"><a class="logo-top" href="https://www.synopsys.com/"><img src="{footer_logo}" alt="Synopsys Home Page" width="110" height="24"></a><div class="links-wrapper">{"".join(f'<nav class="fcol"><h3>{esc(t)}</h3><ul>{"".join(f"<li><a href={chr(34)}{h}{chr(34)}>{html.unescape(x) and esc(html.unescape(x))}</a></li>" for h, x in ls)}</ul></nav>' for t, ls in cols)}<div class="fcol lang-col"><div class="global-footer-dropdown"><select class="global-nav-link-select" aria-label="Language"><option>English</option><option>日本語</option><option>简体中文</option><option>繁體中文</option><option>한국어</option></select></div></div></div>
<div class="social-icons-wrapper"><ul>{"".join(f'<li><a href="{u}" target="_blank" rel="noopener">{s}</a></li>' for u, s in zip(social_links, social))}</ul><a class="logo-bottom" href="https://www.synopsys.com/"><img src="{footer_logo}" alt="Synopsys Home Page" width="128" height="28"></a></div>
<div class="copyright"><span>©2026 Synopsys, Inc. All Rights Reserved</span>{"".join(f'<a href="{h}">{x}</a>' if i != 1 else f'<a href="{legal[0][0]}">{legal[0][1]}</a><a class="optanon-show-settings" href="#">Cookie Settings</a>' for i, (h, x) in enumerate([(legal[0][0], legal[0][1])] + [("", "")] + [(h, x) for h, x in legal[1:]]) if not (i == 0))}</div>
</div></footer>
{legal_html}
</div></div>
<script src="canon.js"></script>
</body></html>'''
# fix copyright assembly (simpler, explicit)
copy_html = f'<span>©2026 Synopsys, Inc. All Rights Reserved</span> | <a href="{legal[0][0]}">Privacy</a> | <a class="optanon-show-settings" href="#">Cookie Settings</a>' + ''.join(f' | <a href="{h}">{x}</a>' for h, x in legal[1:])
HTML = re.sub(r'<div class="copyright">.*?</div>\n</div></footer>', f'<div class="copyright">{copy_html}</div>\n</div></footer>', HTML, flags=re.S)
open(f'{ROOT}/vcs-proposed.html', 'w').write(HTML)
shutil.copy('stardust/current/assets/favicon.ico', f'{ROOT}/assets/favicon.ico')
print('vcs-proposed.html', len(HTML), 'cards', len(real), [c[1][:30] for c in real])
