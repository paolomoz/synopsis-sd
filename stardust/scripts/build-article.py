#!/usr/bin/env python3
"""build-article.py — landing-style prototype for the ARTICLE archetype (blog post, 25/75 layout) from the imported
document + values lifted from the live page (dom-dump runs 2026-09-11). Chrome from the gated VCS prototype."""
import re, html, sys
from bs4 import BeautifulSoup
ROOT = 'stardust/prototypes'
SRC = sys.argv[1] if len(sys.argv) > 1 else 'content/blogs/chip-design/multiphysics-chip-design-challenges.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'article'
vcs = open(f'{ROOT}/vcs-proposed.html').read()
head = re.sub(r'<title>.*?</title><meta name="description" content="[^"]*">', '', vcs[:vcs.index('</head>')]).replace('vcs.css', f'{OUT}.css')
chrome_top = vcs[vcs.index('<body>') + 6:vcs.index('</header>') + 9]
chrome_bottom = vcs[vcs.index('<footer class="site-footer"'):]  # article pages have no connect band on the source
arrow = re.search(r'<svg class="ico".*?</svg>', vcs[vcs.index('<section class="hero skinny-banner connect">'):], re.S).group(0)
esc = html.escape
doc = BeautifulSoup(open(SRC).read(), 'html.parser'); secs = doc.find('main').find_all('div', recursive=False)
meta = {r.find_all('div')[0].get_text(strip=True): r.find_all('div')[1] for r in secs[0].select('.metadata > div')}
title = meta['Title'].get_text(strip=True); desc = meta.get('Description').get_text(strip=True) if meta.get('Description') else ''
tags = [t.strip() for t in meta['Tags'].get_text().split(',')] if meta.get('Tags') else []
def livehref(h):
    h = h or '#'
    return h + '.html' if h.startswith('/') and h != '/' and not re.search(r'\.[a-z]{2,5}($|[?#])', h) else h
def fix_links(node):
    for a in node.find_all('a'):
        if a.get('href'): a['href'] = livehref(a['href'])
    return node
def inner(node): return ''.join(str(c) for c in fix_links(node).children)

# ---- banner (source .cmp-blogbanner: breadcrumb row 41 · h1 44/400 · authors · date/read) ----
hb = secs[1].select_one('.hero.blog > div > div'); ps = hb.find_all('p', recursive=False)
crumbs = ps[0]; h1 = hb.find('h1'); authors = ps[1] if len(ps) > 1 else None; date = ps[2] if len(ps) > 2 else None
crumb_html = ''.join(f'<li><a class="parent" href="{esc(livehref(a["href"]))}">{esc(a.get_text(strip=True))}</a></li>' for a in crumbs.find_all('a'))
date_html = ''
if date:
    d, _, rt = date.get_text(strip=True).partition(' / ')
    date_html = f'<p class="date-time"><span class="date">{esc(d)}</span><span class="slash">/</span><span class="read-time">{esc(rt)}</span></p>' if rt else f'<p class="date-time"><span class="date">{esc(d)}</span></p>'
banner = f'''<section class="cmp-blogbanner"><div class="blog-banner purple-purple-gradient"><div class="text-overlay">
<div class="breadcrumb"><nav class="clearfix"><ul>{crumb_html}</ul></nav></div>
<div class="info-holder"><h1 class="title">{esc(h1.get_text(strip=True))}</h1>
<p class="authors">{''.join(f'<a class="author" href="{esc(livehref(a["href"]))}">{esc(a.get_text(strip=True))}</a>' for a in authors.find_all('a')) if authors else ''}</p>{date_html}</div></div></div></section>'''

# ---- main column bands from the imported sections (default content + blocks), anchored h2s feed the TOC ----
bands = []; toc = []
for sec in secs[2:]:
    kids = [c for c in sec.find_all(recursive=False)]
    metad = sec.select_one('.section-metadata'); style = metad.find_all('div')[-1].get_text(strip=True) if metad else ''
    blocks = [c for c in kids if c.name == 'div' and c.get('class') and c.get('class') != ['section-metadata']]
    default = [c for c in kids if c.name != 'div']
    names = [' '.join(b.get('class')) for b in blocks]
    if any(n.startswith(('toc', 'form', 'share', 'carousel blog')) for n in names) and not default: continue
    if 'centered' in style and default and default[0].name == 'h2' and 'Continue Reading' in default[0].get_text(): continue
    html_parts = []
    for c in kids:
        if c.name == 'div' and c.get('class') == ['section-metadata']: continue
        if c.name == 'div' and c.get('class') and c['class'][0] == 'columns':
            cells = c.select(':scope > div > div')
            img = cells[0].find('img'); a = cells[0].find('a'); txt = cells[1]
            h2 = txt.find(['h2', 'h3']); p = txt.find('p'); cta = [x for x in txt.find_all('a') if x is not (a or None) and x.find_parent('p') is not None and x.find_parent('p') is not p]
            html_parts.append(f'''<div class="promo"><hr class="separator"><section class="component-column row"><div class="col col-sm-4"><div class="image">{f'<a href="{esc(livehref(a["href"]))}">' if a is not None else ''}<img src="{esc(img["src"])}" alt="{esc(img.get("alt",""))}">{'</a>' if a is not None else ''}</div></div>
<div class="col col-sm-8"><section class="component-textcomp"><h2 class="title text-size-smaller">{esc(h2.get_text(strip=True)) if h2 else ''}</h2><div class="component-text">{'<p>' + inner(p) + '</p>' if p else ''}</div>{f'<div class="buttons align-left"><a class="component-button primary" href="{esc(livehref(cta[0]["href"]))}">{esc(cta[0].get_text(strip=True))}</a></div>' if cta else ''}</section></div></section><hr class="separator"></div>''')
            continue
        if c.name == 'h2':
            aid = re.sub(r'[^a-z0-9]+', '-', c.get_text(strip=True).lower()).strip('-'); toc.append((aid, c.get_text(strip=True)))
            html_parts.append(f'<div class="anchor" id="{aid}"></div><section class="component-textcomp"><h2 class="title">{inner(c)}</h2></section>')
            continue
        if c.name == 'p' and c.find('img') and not c.get_text(strip=True):
            html_parts.append(f'<div class="image"><div class="cmp-image">{"".join(str(x) for x in fix_links(c).children)}</div></div>'); continue
        if c.name == 'p' and c.get_text(strip=True).startswith('Tags:'): continue  # page tags render as chips below
        html_parts.append(str(fix_links(c)))
    if html_parts: bands.append(f'<div class="band-text">{"".join(html_parts)}</div>')
main_html = ''.join(bands)

# ---- rail: TOC (anchored h2s + Subscribe), subscription form frame (form body hidden on both sides by policy), share ----
toc_html = ''.join(f'<li class="cmp-tableofcontents__content-item"><div class="cmp-tableofcontents__content-item-wraper"><a class="cmp-tableofcontents__content-item-text" href="#{aid}">{esc(t)}</a></div></li>' for aid, t in toc)
rail = f'''<div class="rail"><section class="cmp-tableofcontents"><div class="cmp-tableofcontents__header"><div class="cmp-tableofcontents__title">Table of Contents</div></div>
<div class="cmp-tableofcontents__content-list"><ul class="cmp-tableofcontents__content-list-wraper">{toc_html}<li class="cmp-tableofcontents__content-item"><div class="cmp-tableofcontents__content-item-wraper"><a class="cmp-tableofcontents__content-item-text subscribe-btn" href="#subscribe">Subscribe</a></div></li></ul></div></section>
<section class="cmp-subscription-form" id="subscribe"><div class="subscription-form-container"><div class="form-title">Subscribe to Our Blog</div><form class="mktoForm"></form></div></section>
<section class="cmp-socialshare"><a class="cmp-socialshare__link" href="#" aria-label="Share on X">{arrow}</a><a class="cmp-socialshare__link" href="#" aria-label="Share on LinkedIn">{arrow}</a><a class="cmp-socialshare__link" href="#" aria-label="Share on Facebook">{arrow}</a></section></div>'''

tags_html = ''.join(f'<li><a href="/blogs/chip-design/category-{re.sub(r"[^a-z0-9]", "", t.lower().replace("&", "and"))}.html">{esc(t)}</a></li>' for t in tags)
# related cards from the imported carousel blog rows (server-rendered snapshot of the live feed)
cards = []
cb = doc.select_one('.carousel.blog')
if cb is not None:
    for row in cb.find_all('div', recursive=False)[:3]:
        cells = row.find_all('div', recursive=False); img = row.find('img'); h3 = row.find('h3'); a = h3.find('a') if h3 else None
        ps = [p for p in row.find_all('p')]; date = next((p.get_text(strip=True) for p in ps if re.search(r'\d{4}', p.get_text())), ''); by = next((p for p in ps if p.get_text(strip=True).startswith('By')), None); tg = next((p for p in ps if p.get_text(strip=True).startswith('Tags')), None); cta = next((p for p in reversed(ps) if p.find('a') and 'Read' in p.get_text()), None)
        cards.append(f'''<div class="card-col col-sm-4"><div class="component-card-b"><div class="image-wrapper">{f'<img src="{esc(img["src"])}" alt="">' if img is not None else ''}</div><div class="component-text card-text"><div class="label-date-wrapper"><div class="date-time">{esc(date)}</div></div><h4 class="heading"><a href="{esc(livehref(a["href"])) if a else "#"}"><span>{esc(h3.get_text(strip=True)) if h3 else ''}</span></a></h4><div class="author-info"><div class="authors-links">{inner(by) if by else ''}</div></div><div class="tag-holder">{inner(tg) if tg else ''}</div><div class="cta"><a href="{esc(livehref(a["href"])) if a else "#"}"><span>Read Article</span>{arrow}</a></div></div></div></div>''')

HTML = f'''{head}<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
</head><body class="article-page">{chrome_top}
{banner}
<div class="two2575"><div class="container"><section class="component-column row">
<div class="col-xs-12 col-sm-3 two2575PinnedLeft">{rail}</div>
<div class="col-xs-12 col-sm-9 two2575Right">{main_html}<section class="cmp-blogsdev"><ul class="cmp-blogsdev__pagetags-container">{tags_html}</ul></section></div>
</section></div></div>
<div class="band-title"><div class="container"><section class="component-textcomp center"><h2 class="title text-size-larger">Continue Reading</h2></section></div></div>
<section class="cmp-dynamiccards"><div class="container"><div class="row">{''.join(cards)}</div></div></section>
{chrome_bottom}'''
open(f'{ROOT}/{OUT}-proposed.html', 'w').write(HTML)
CSS = r'''/* article.css — article archetype page layer (blog post, 25/75). Shared chrome in canon.css. Values lifted from the live page @1440. */
body.article-page{background:#fff}
/* banner: 344px gradient, breadcrumb row 41, title/authors/date centred (source .cmp-blogbanner) */
.cmp-blogbanner{position:relative;height:344px}
.cmp-blogbanner .blog-banner{height:344px;background:linear-gradient(to right,#5a2a82,#714794,#956eb6)}
.cmp-blogbanner .text-overlay{position:absolute;inset:0;padding:0 15px}
.cmp-blogbanner .breadcrumb{max-width:1170px;margin:0 auto;padding:0 15px}
.cmp-blogbanner .breadcrumb nav{padding:20px 0 0}
.cmp-blogbanner .breadcrumb ul{display:flex;margin:0;padding:0;list-style:none;font-size:16px;line-height:25.6px}
.cmp-blogbanner .breadcrumb li{position:relative;line-height:16px}
.cmp-blogbanner .breadcrumb a{display:inline-block;margin-right:20px;padding:0 5px 0 0;color:#fff;font-size:15px;font-weight:400;line-height:20px}
.cmp-blogbanner .breadcrumb li + li a{padding-left:5px}
.cmp-blogbanner .breadcrumb li + li a::before{content:"  /  ";white-space:pre}
.cmp-blogbanner .info-holder{position:absolute;left:0;right:0;top:56px}
.cmp-blogbanner h1.title{max-width:1170px;margin:0 auto;padding:20px 15px 0;color:#fff;font-size:44px;font-weight:400;line-height:normal;text-align:center}
.cmp-blogbanner .authors,.cmp-blogbanner .date-time{max-width:1170px;margin:0 auto;padding:30px 0 0;color:#fff;font-size:20px;font-weight:400;line-height:normal;text-align:center}
.cmp-blogbanner .authors a{color:#fff}
.cmp-blogbanner .slash{padding:0 20px}
/* 25/75 row 30px under the banner */
.two2575{margin-top:30px}
.two2575 .container{max-width:1170px;margin:0 auto;padding:0 15px}
.two2575 .component-column{display:flex;flex-wrap:nowrap;align-items:flex-start;margin:0 -15px}
.two2575PinnedLeft{position:sticky;top:80px;flex:0 0 293px;width:293px;padding:0 48px 0 15px;box-sizing:border-box}
.two2575Right{flex:0 0 878px;width:878px;padding:0 15px;box-sizing:border-box}
/* rail: TOC */
.cmp-tableofcontents{padding-bottom:30px}
.cmp-tableofcontents__header{display:flex;margin-top:15px}
.cmp-tableofcontents__title{font-size:24px;font-weight:300;line-height:38.4px;color:var(--ink)}
.cmp-tableofcontents__content-list{margin-top:15px}
.cmp-tableofcontents__content-list-wraper{margin:0 0 10px;padding:0;list-style:none;font-size:16px;font-weight:300;line-height:25.6px}
.cmp-tableofcontents__content-item-wraper{display:flex}
.cmp-tableofcontents__content-item-text{display:block;padding:8px 15px;color:var(--ink);font-size:16px;font-weight:300;line-height:25.6px;border-left:2px solid var(--rule)}
.cmp-tableofcontents__content-item-text.subscribe-btn{display:inline-block;margin:15px 0;padding:12px 24px;border:0;border-radius:5px;background:var(--ink);color:#fff;font-size:16px;font-weight:400;line-height:16px}
/* rail: subscription form frame (form body is JS on the source; hidden on both sides by policy) */
.cmp-subscription-form .subscription-form-container{padding:0 0 32px}
.cmp-subscription-form .form-title{margin:0 0 10px;font-size:24px;font-weight:300;line-height:33.6px;color:var(--ink)}
.cmp-subscription-form form{display:none}
/* rail: share */
.cmp-socialshare{height:38px;padding-bottom:30px;line-height:38px}
.cmp-socialshare__link{display:inline-block;padding:0 7.5px;color:var(--ink)}
.cmp-socialshare__link:first-child{padding-left:0}
.cmp-socialshare__link .ico{width:28px;height:28px;vertical-align:middle}
/* main column bands */
.band-text{padding-bottom:60px}
.band-text:has(> .promo:last-child),.band-text:has(> .image:last-child){padding-bottom:0}
.two2575Right .band-text:last-of-type{padding-bottom:136px} /* live: the last text band carries 76px of trailing space before the tag row */
.band-text:has(.promo) + .band-text .component-textcomp{margin-top:30px}
.band-text > p{margin:0 0 10px;font-size:16px;font-weight:300;line-height:25.6px;color:var(--ink)}
.band-text > p:first-child{margin-top:24px}
.band-text > p:last-child{margin-bottom:0}
.band-text ul,.band-text ol{margin:0 0 10px;padding:0 0 0 40px;font-size:16px;font-weight:300;line-height:25.6px}
.band-text a{color:var(--link)}
.band-text .anchor{position:absolute;width:0;height:1px}
.band-text .component-textcomp{position:relative;margin-top:0}
.band-text .component-textcomp .title{margin:0;font-size:32px;font-weight:300;line-height:35.2px;color:var(--ink)}
.band-text .component-textcomp + p{margin-top:24px}
.band-text .image{margin-top:30px;padding:0 0 60px}
.band-text .image img{display:block;width:100%;height:auto}
/* inline promo (experience fragment): rules 20px apart, 4/8 media row */
.promo{margin:30px 0 0;padding-bottom:15px}
.promo .separator{height:1px;margin:20px 0;border:0;background:#c4c4c4}
.promo .component-column{display:flex;flex-wrap:nowrap;margin:15px -15px 15px}
.promo .col{padding:0 15px;box-sizing:border-box}
.promo .col-sm-4{flex:0 0 292px}
.promo .col-sm-8{flex:0 0 585px}
.promo .image{margin-top:15px}
.promo .image img{display:block;width:262px;height:148px;object-fit:cover}
.band-text .promo .component-textcomp{margin-top:30px}
.promo .component-textcomp .title{margin:0;font-size:24px;font-weight:300;line-height:26.4px;color:var(--purple-dark)}
.promo .component-text{margin-top:24px;font-size:16px;font-weight:300;line-height:25.6px}
.promo .component-text p{margin:0}
.promo .buttons{display:flex;margin-top:24px}
.promo .component-button.primary{display:flex;align-items:center;height:40px;padding:0 24px;border-radius:5px;background:var(--purple);color:#fff;font-size:16px;font-weight:400;line-height:25.6px}
/* tags */
.cmp-blogsdev{padding-bottom:10px}
.cmp-blogsdev__pagetags-container{margin:0;padding:10px 0;list-style:none;font-size:16px;line-height:25.6px}
.cmp-blogsdev__pagetags-container li{display:inline-block;margin:6px 3px}
.cmp-blogsdev__pagetags-container a{display:flex;align-items:center;height:22px;padding:0 8px;border:1px solid #c4c4c4;border-radius:5px;color:var(--grey);font-size:12px;font-weight:300;line-height:12px}
/* Continue Reading */
.band-title{margin-top:30px;padding-top:60px}
.band-title .container{max-width:1170px;margin:0 auto;padding:0 15px}
.band-title .title{margin:0;font-size:40px;font-weight:300;line-height:44px;color:var(--purple-dark);text-align:center}
.cmp-dynamiccards .container{max-width:1170px;margin:0 auto;padding:0 15px}
.cmp-dynamiccards .row{display:flex;flex-wrap:nowrap;margin:0 -15px}
.cmp-dynamiccards .card-col{flex:0 0 390px;padding:10px;box-sizing:border-box}
.component-card-b{display:flex;flex-direction:column;margin:15px 0;background:#fff;box-shadow:0 1px 7px rgba(0,0,0,.15)}
.component-card-b .image-wrapper img{display:block;width:370px;height:212px;object-fit:cover}
.component-card-b .card-text{padding:20px 32px}
.component-card-b .label-date-wrapper{display:flex;justify-content:flex-end;height:30px;margin-bottom:10px}
.component-card-b .date-time{padding-top:2px;color:var(--grey);font-size:14px;font-weight:300;line-height:20px}
.component-card-b h4.heading{margin:0 0 20px;font-size:20px;font-weight:400;line-height:22px}
.component-card-b h4.heading a{color:var(--ink)}
.component-card-b .author-info{display:flex;margin-bottom:32px;font-size:16px;font-weight:300;line-height:17px}
.component-card-b .tag-holder{color:var(--grey);font-size:14px;font-weight:500;line-height:22.4px}
.component-card-b .tag-holder a{color:var(--grey);font-weight:300}
.component-card-b .cta{margin:32px 0 16px;font-size:16px;font-weight:300;line-height:16px}
.component-card-b .cta a{display:flex;align-items:center;color:var(--ink)}
.component-card-b .cta .ico{width:8px;height:12px;margin-left:8px}
.site-footer{margin-top:76px}
'''
open(f'{ROOT}/{OUT}.css', 'w').write(CSS)
print('wrote', f'{OUT}-proposed.html', len(HTML), 'toc items', len(toc), 'bands', len(bands), 'cards', len(cards))
