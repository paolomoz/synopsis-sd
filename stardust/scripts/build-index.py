#!/usr/bin/env python3
"""build-index.py — assemble stardust/prototypes/index-proposed.html (+ index.css) for the landing archetype.
Chrome (pre-header, verbatim nav, connect band, footer) is reused from the gated VCS prototype; the page body is the
imported content of content/index.html (verbatim text/links/images); values are lifted from the live home page
(stardust/scripts/home-live-lift.mjs, dom-dump.mjs runs of 2026-09-11)."""
import re, html
from bs4 import BeautifulSoup

ROOT = 'stardust/prototypes'
vcs = open(f'{ROOT}/vcs-proposed.html').read()
head_end = vcs.index('</head>')
head = vcs[:head_end].replace('vcs.css', 'index.css')
head = re.sub(r'<title>.*?</title><meta name="description" content="[^"]*">', '', head)
body_start = vcs.index('<body>') + len('<body>')
hdr_end = vcs.index('</header>') + len('</header>')
chrome_top = vcs[body_start:hdr_end]                      # pre-header + site-wrapper/root openers + verbatim nav
connect_start = vcs.index('<section class="hero skinny-banner connect">')
chrome_bottom = vcs[connect_start:]                        # connect band + footer + legal overlay + closers + canon.js
arrow = re.search(r'<svg class="ico".*?</svg>', chrome_bottom, re.S).group(0)

raw = BeautifulSoup(open('stardust/raw/index.html', encoding='utf-8', errors='ignore').read(), 'html.parser')
DATES = {c.select_one('h4.heading').get_text(strip=True): c.select_one('.date-time').get_text(strip=True) for c in raw.select('section.component-assetcard') if c.select_one('h4.heading') and c.select_one('.date-time')}
KB_HREF = {a.select_one('.cmp-key-benefits__title').get_text(strip=True): a['href'] for a in raw.select('a.cmp-key-benefits__link')}
def livehref(h):
    h = h or '#'
    if h.startswith('/') and h != '/' and not re.search(r'\.[a-z]{2,5}($|[?#])', h): return h + '.html'
    return h
doc = BeautifulSoup(open('content/index.html').read(), 'html.parser')
main = doc.find('main'); sections = [d for d in main.find_all('div', recursive=False)]
meta = {r.find_all('div')[0].get_text(strip=True): r.find_all('div')[1] for r in sections[0].select('.metadata > div')}
title = meta['Title'].get_text(strip=True); desc = meta['Description'].get_text(strip=True)
esc = html.escape
def text(el): return esc(el.get_text(' ', strip=True)) if el else ''

# --- hero carousel (first slide rendered; the other slides are the tab strip) ---
hero = sections[1].select_one('.hero.carousel'); slides = hero.find_all('div', recursive=False)
def slide(sl, active):
    img = sl.find('img'); h = sl.find(['h1', 'h2']); ps = [x for x in sl.find_all('p') if not x.find('a')]; ctas = sl.find_all('a')
    t = h.get_text(' ', strip=True); parts = [t[:len('Introducing Synopsys')], t[len('Introducing Synopsys'):].strip()] if t.startswith('Introducing Synopsys ') else [t]
    title = ''.join(f'<p><b>{esc(x)}</b></p>' for x in parts)
    btns = ''.join(f'<div class="component-button primary dark"><a class="has-arrow" href="{esc(livehref(a["href"]))}">{text(a)}{arrow}</a></div>' for a in ctas)
    return f'''<div class="cmp-carousel__item{" cmp-carousel__item--active" if active else ""}"><div class="bg"><img src="{esc(img["src"])}" alt="{esc(img.get("alt",""))}"></div>
<div class="center-wrapper"><div class="text-wrapper"><div class="title"><h2 class="ui-helper-hidden-accessible">{esc(t)}</h2>{title}</div><div class="sub-title">{text(ps[0]) if ps else ""}</div>
<div class="cta-wrapper">{btns}</div></div></div></div>'''
tabs = ''.join(f'<li{" class=\"slick-active\"" if i == 0 else ""}><button type="button">{text(sl.find(["h1","h2"]))}</button><span class="slider-progress-bar"></span></li>' for i, sl in enumerate(slides))
hero_html = f'<section class="home-hero">{"".join(slide(sl, i == 0) for i, sl in enumerate(slides))}<ul class="slick-dots">{tabs}</ul></section>'

# --- powering band ---
sec = sections[2]; h2 = sec.find('h2'); p = sec.find('p')
powering = f'<div class="band powering"><div class="container"><section class="textcomp center"><h2 class="title">{text(h2)}</h2><div class="component-text"><p>{text(p)}</p></div></section></div></div>'

# --- pillars ---
cards = sections[3].select('.cards.pillars > div')
def pillar(c):
    img = c.find('img'); h3 = c.find('h3'); ps = c.find_all('p'); a = c.find('a')
    return f'<a class="pillar" href="{esc(livehref(a["href"]))}"><div class="image"><img src="{esc(img["src"])}" alt="{esc(img.get("alt",""))}"><div class="overlay"></div><div class="text-hover"><span>{text(h3)}</span><p>{text(ps[0])}</p><div class="button">{text(a)}{arrow}</div></div></div></a>'
pillars = f'<div class="band pillars"><div class="container"><div class="pillar-row">{"".join(pillar(c) for c in cards)}</div></div></div>'

# --- design the future heading (dropped by the importer; source h2.title text-align-center) ---
design = '<div class="band design-title"><div class="container"><section class="textcomp center"><h2 class="title">Design the Future Today with Synopsys</h2></section></div></div>'

# --- benefits columns ---
cols = sections[4].select('.columns.benefits > div > div')
def kb(li):
    img = li.find('img'); t = li.find('strong'); d = li.find_all('p')[-1]
    href = KB_HREF.get(t.get_text(strip=True), '#')
    return f'<section class="cmp-key-benefits"><a class="cmp-key-benefits__link" href="{esc(href)}"><div class="cmp-key-benefits__wrapper"><div class="cmp-key-benefits__img-text"><div class="cmp-key-benefits__img-wrapper"><img src="{esc(img["src"])}" alt="{esc(img.get("alt",""))}" width="50" height="50"></div><div class="cmp-key-benefits__title">{text(t)}</div></div><div class="cmp-key-benefits__description">{text(d)}</div></div></a></section>'
def col(c): return f'<div class="col col-6"><section class="textcomp"><h2 class="title">{text(c.find("h3"))}</h2></section><div class="kb-list">{"".join(kb(li) for li in c.find_all("li"))}</div></div>'
benefits = f'<div class="band benefits"><div class="container"><div class="row two-col">{"".join(col(c) for c in cols)}</div></div></div>'

# --- ecosystem partners (grey band: heading + single-row logo carousel; live shows samsung first at capture) ---
logos = [(livehref(a['href']), a.find('img')['src'], a.find('img').get('alt', '')) for a in sections[6].select('.logos a')]
order = ['globalfoundries', 'samsung', 'nvidia', 'tsmc', 'intel-foundry', 'tower', 'sifive', 'arm', 'imagination', 'umc']  # live data-slick-index order
logos.sort(key=lambda l: next((i for i, k in enumerate(order) if k in l[1]), 99))
def lslide(l, cloned): return f'<div class="slick-slide{" slick-cloned" if cloned else ""}"{" aria-hidden=\"true\"" if cloned else ""}><a href="{esc(l[0])}"><img class="partner-logo" src="{esc(l[1])}" alt="{esc(l[2])}"></a></div>'
logo_track = ''.join(lslide(l, True) for l in logos[-5:]) + ''.join(lslide(l, False) for l in logos) + ''.join(lslide(l, True) for l in logos)
eco = f'''<div class="band grey eco"><div class="container"><section class="textcomp center"><h2 class="title">{text(sections[5].find("h2"))}</h2></section>
<section class="cmp-logo-carousel"><div class="slick-list"><div class="slick-track">{logo_track}</div></div></section></div></div>'''

# --- what's new carousel (3 visible cards of the authored list) ---
items = sections[8].select('.carousel.resources > div')
def card(c, active, cloned=False):
    img = c.find('img'); lab = c.find('strong'); h3 = c.find('h3'); a = c.find('a'); date = DATES.get(h3.get_text(strip=True), '')
    return f'<section class="component-assetcard{" cmp-carousel__item--active" if active else ""}{" slick-cloned" if cloned else ""}"{" aria-hidden=\"true\"" if cloned else ""}><div class="cmp-image"><img src="{esc(img["src"])}" alt="{esc(img.get("alt",""))}"></div><div class="component-text card-text"><div class="label-date-wrapper"><div class="label-wrapper"><div class="label">{text(lab)}</div></div><div class="date-time">{esc(date)}</div></div><div class="heading-desc-wrapper"><h4 class="heading"><span>{text(h3)}</span></h4><p></p></div><a href="{esc(livehref(a["href"]))}">{text(a)}{arrow}</a></div></section>'
dots = ''.join(f'<li{" class=\"slick-active\"" if i == 0 else ""}><button type="button">{i+1}</button></li>' for i in range(3))
news = f'''<div class="band news-title"><div class="container"><section class="textcomp center"><h2 class="title">{text(sections[7].find("h2"))}</h2></section></div></div>
<div class="band news"><section class="cmp-carousel container carousel-holder"><div class="cmp-carousel__content"><div class="slick-list"><div class="slick-track">{"".join(card(c, False, True) for c in items[-3:])}{"".join(card(c, i < 3) for i, c in enumerate(items))}{"".join(card(c, False, True) for c in items)}</div></div><ul class="slick-dots">{dots}</ul></div>
<div class="slick-nav-container"><button class="slick-prev slick-arrow" aria-label="Previous">{arrow}</button><button class="slick-next slick-arrow" aria-label="Next">{arrow}</button></div></section></div>'''

# --- support & careers (grey band, two text columns with a vertical divider) ---
scols = sections[9].select('.columns > div > div')
def scol(c):
    h2 = c.find('h2'); p = c.find('p'); a = c.find('a')
    return f'<div class="col col-6"><section class="textcomp"><h2 class="title">{text(h2)}</h2><div class="component-text"><p>{text(p)}</p></div><a class="cta-text" href="{esc(a["href"])}">{text(a)}{arrow}</a></section></div>'
support = f'<div class="band grey support"><div class="container"><div class="row divider-row">{scol(scols[0])}<div class="snps-col-divider"><div class="vl"></div></div>{scol(scols[1])}</div></div></div>'

HTML = f'''{head}<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
</head><body class="home">{chrome_top}
{hero_html}
{powering}
{pillars}
{design}
{benefits}
{eco}
{news}
{support}
<script>(function(){{var n=document.querySelector('.component-nav-top');function u(){{n.classList.toggle('overlapping',window.scrollY>=53)}}window.addEventListener('scroll',u,{{passive:true}});u()}})();</script>
{chrome_bottom}'''
open(f'{ROOT}/index-proposed.html', 'w').write(HTML)

CSS = r'''/* index.css — landing-archetype page layer (home). Shared chrome lives in canon.css. Values lifted from the live home page @1440. */
/* header floats transparent over the hero (live: .topNav absolute at y=53, white wordmark/labels/search) */
body.home header.topNav{position:absolute;top:0;left:0;right:0;z-index:50;height:80px}
body.home .component-nav-top{background:transparent;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
body.home .nav-top-wrapper .logo svg path{fill:#fff}
body.home .main-nav .main-nav-item-header{color:#fff}
body.home .main-nav .main-nav-item-header::after{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3E%3Cpath fill='%23ffffff' d='M352 160c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-160 160c-12.5 12.5-32.8 12.5-45.3 0l-160-160c-9.2-9.2-11.9-22.9-6.9-34.9S19.1 160 32 160h320z'/%3E%3C/svg%3E") no-repeat center/8px 12px}
body.home .icon-search{color:#fff}
body.home .component-button.cta{background:#fff;color:var(--ink)}
body.home .component-nav-top.overlapping .component-button.cta{background:var(--purple);color:#fff}
body.home .site-wrapper{position:relative}
/* scrolled state (live: .component-nav-top.overlapping once the pre-header scrolls away — fixed, translucent white, dark labels) */
body.home .component-nav-top.overlapping{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.8);box-shadow:0 4px 4px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
body.home .component-nav-top.overlapping .nav-top-wrapper .logo svg path{fill:#5a2a82}
body.home .component-nav-top.overlapping .main-nav .main-nav-item-header{color:var(--ink)}
body.home .component-nav-top.overlapping .main-nav .main-nav-item-header::after{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3E%3Cpath fill='%23111c24' d='M352 160c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-160 160c-12.5 12.5-32.8 12.5-45.3 0l-160-160c-9.2-9.2-11.9-22.9-6.9-34.9S19.1 160 32 160h320z'/%3E%3C/svg%3E") no-repeat center/8px 12px}
body.home .component-nav-top.overlapping .icon-search{color:var(--ink)}

/* hero: 1440x700 image slide, copy at (160,170), tab strip at the bottom */
.home-hero{position:relative;height:700px;overflow:hidden;background:linear-gradient(107.7deg,#2d1541 0,#5a2a82 50%,#7e45af 100%)}
.home-hero .cmp-carousel__item{position:absolute;inset:0}
.home-hero .cmp-carousel__item:not(.cmp-carousel__item--active){opacity:0;pointer-events:none}
.home-hero .bg img{position:absolute;inset:0;width:1440px;height:700px;object-fit:cover;display:block}
.home-hero .ui-helper-hidden-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.home-hero .center-wrapper{position:absolute;top:170px;left:0;right:0;display:flex;padding:0 160px}
.home-hero .text-wrapper{width:560px;color:#fff}
.home-hero .title{margin:0 0 32px;color:#fff}
.home-hero .title p{margin:0;font-size:48px;font-weight:300;line-height:67.2px}
.home-hero .title p b{font-weight:700}
.home-hero .sub-title{font-size:20px;font-weight:300;line-height:32px;margin:0 0 32px}
.home-hero .cta-wrapper{display:flex;height:55px}
.home-hero .component-button{display:flex;align-items:center;justify-content:center;height:40px;padding:0 24px;margin:0 15px 15px 0;border-radius:5px;background:#fff}
.home-hero .component-button a{display:flex;align-items:center;color:var(--ink);font-size:16px;font-weight:400;line-height:16px}
.home-hero .component-button .ico{width:9px;height:16px;margin-left:8px}
.home-hero .slick-dots{position:absolute;left:0;right:0;bottom:0;display:flex;height:69px;margin:0;padding:0 160px;list-style:none}
.home-hero .slick-dots li{position:relative;width:181px;flex:none;padding:0 8px 10px;margin-right:54px}
.home-hero .slick-dots li:nth-child(2){margin-right:54px}
.home-hero .slick-dots button{display:block;width:165px;padding:14px 0 0;border:0;background:none;color:#fff;font:400 16px/22.4px var(--font);text-align:left;cursor:pointer}
.home-hero .slick-dots .slider-progress-bar{position:absolute;left:0;top:0;width:0;height:2px;background:#fff}
.home-hero .slick-dots li.slick-active .slider-progress-bar{width:104px}

/* section rhythm (live: heading bands margin-top 60 / padding-bottom 30; content bands padding 30/60) */
.band.powering{margin-top:90px;padding-bottom:30px}
.band.powering .component-text{margin-top:24px;font-size:20px;line-height:32px;text-align:center}
.band.pillars{padding:60px 0 60px}
.pillar-row{display:flex;justify-content:space-between}
.pillar{display:block;width:263px;height:434px;text-align:center}
.pillar .image{position:relative;width:263px;height:434px;overflow:hidden;border-radius:5px}
.pillar .image > img{position:absolute;left:-56px;top:0;width:375px;height:443px;display:block}
.pillar .overlay{position:absolute;left:0;right:0;bottom:0;height:275px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.85))}
.pillar .text-hover{position:absolute;left:33px;top:279px;width:197px;color:#fff}
.pillar .text-hover span{display:block;font-size:24px;font-weight:300;line-height:33.6px}
.pillar .text-hover p{margin:16px 0 4px;font-size:16px;font-weight:300;line-height:25.6px;opacity:0}
.pillar .text-hover .button{display:inline-block;margin:4px;padding:8px 25px;border:1px solid #fff;border-radius:5px;font-size:16px;font-weight:300;line-height:25.6px;opacity:0}
.pillar .text-hover .button .ico{width:6px;height:10px;margin-left:8px}
.pillar:hover .text-hover p,.pillar:hover .text-hover .button{opacity:1}
.band.design-title{margin-top:120px;padding-bottom:30px}
.band.benefits{padding:30px 0 60px}
.row.two-col{display:flex;margin:0 -15px}
.col-6{width:50%}
.benefits .textcomp .title{text-align:left;margin-bottom:31px}
.cmp-key-benefits__img-text{display:flex;align-items:center;margin-bottom:16px;height:50px}
.cmp-key-benefits__img-wrapper{width:50px;height:50px;margin-right:16px;flex:none}
.cmp-key-benefits__img-wrapper img{display:block;width:50px;height:50px}
.cmp-key-benefits__title{font-size:20px;font-weight:300;line-height:28px}
.cmp-key-benefits__description{margin:0 0 48px;font-size:16px;font-weight:300;line-height:25.6px}

/* ecosystem partners: grey band 315px = 60 + 35 + 40 + 100 + 80 */
.band.eco{padding-top:60px}
.cmp-logo-carousel{margin:40px 0 80px;height:100px}
.cmp-logo-carousel .slick-list{overflow:hidden;width:1140px;height:100px}
.cmp-logo-carousel .slick-track{display:flex;width:max-content;transform:translate3d(-1368px,0,0)}
.cmp-logo-carousel .slick-slide{width:148px;flex:none;margin:0 40px}
.cmp-logo-carousel .partner-logo{display:block;width:148px;height:100px;object-fit:contain}

/* what's new: heading band 60/30, carousel band 15 top / 60 bottom, cards 370x479 + 5px margins, dots 28 below */
.band.news-title{margin-top:60px;padding-bottom:30px}
.band.news{margin-top:15px;padding-bottom:60px}
.band.news .cmp-carousel{position:relative}
.band.news .slick-list{overflow:hidden;height:489px}
.band.news .slick-track{display:flex;width:max-content;transform:translate3d(-1140px,0,0)}
.band.news .component-assetcard{width:370px;height:479px;flex:none;margin:5px;background:#fff;box-shadow:0 1px 7px rgba(0,0,0,.15);position:relative}
.band.news .cmp-image img{display:block;width:370px;height:208px;object-fit:cover}
.band.news .card-text{padding:20px 32px 53px;height:271px;position:relative}
.band.news .label-date-wrapper{display:flex;justify-content:space-between;height:20px}
.band.news .label-wrapper{display:inline-block;padding:4px 8px;border-radius:3px;background:var(--purple);color:#fff;font-size:12px;font-weight:400;line-height:12px;text-transform:uppercase}
.band.news .date-time{font-size:14px;line-height:16.5px;color:var(--grey)}
.band.news h4.heading{margin:20px 0;font-size:20px;font-weight:400;line-height:23px;color:var(--ink)}
.band.news .heading-desc-wrapper p{margin:0 0 32px;font-size:16px;line-height:18px}
.band.news .card-text > a{position:absolute;left:32px;bottom:32px;display:flex;align-items:center;height:16px;font-size:16px;font-weight:400;line-height:16px;color:var(--link)}
.band.news .card-text > a .ico{width:8px;height:12px;margin-left:8px}
.band.news .slick-dots{display:flex;justify-content:center;max-width:342px;height:8px;margin:28px auto 0;padding:0;list-style:none}
.band.news .slick-dots li{position:relative;width:50px;height:8px;padding:4px 0;margin-right:8px}
.band.news .slick-dots li:last-child{margin-right:0}
.band.news .slick-dots li::before{content:"";position:absolute;left:0;right:0;top:3px;height:2px;background:#c4c4c4}
.band.news .slick-dots li.slick-active::before{background:var(--purple-dark)}
.band.news .slick-dots button{opacity:0;width:100%;height:0;padding:0;border:0}
.band.news .slick-nav-container{position:absolute;top:226px;left:0;right:0;height:0}
.band.news .slick-arrow{position:absolute;width:40px;height:40px;border:0;border-radius:20px;background:#fff;color:var(--grey);display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 1px 7px rgba(0,0,0,.15);cursor:pointer}
.band.news .slick-arrow .ico{width:13px;height:20px}
.band.news .slick-prev{left:-80px}
.band.news .slick-prev .ico{transform:rotate(180deg)}
.band.news .slick-next{right:-80px}

/* support & careers: grey band, 60px padding, two 540px text columns around a 1px divider */
.band.support{padding:60px 0}
.row.divider-row{display:flex;margin:0 -15px}
.divider-row .col-6{width:570px;padding:0 15px}
.divider-row .textcomp .title{text-align:left}
.divider-row .component-text{margin-top:24px}
.divider-row .cta-text{display:inline-flex;align-items:center;margin-top:24px;color:var(--ink);font-size:16px;font-weight:400;line-height:25.6px}
.divider-row .cta-text .ico{width:8px;height:12px;margin-left:8px}
.snps-col-divider{position:relative;width:30px;flex:none}
.snps-col-divider .vl{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#c4c4c4}
'''
open(f'{ROOT}/index.css', 'w').write(CSS)
print('wrote index-proposed.html', len(HTML), 'bytes; index.css', len(CSS))
