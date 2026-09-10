#!/usr/bin/env python3
"""build-nav — rebuild content/nav.html section 3 (the mega menu) from the live header markup.

Model (default-content only, one <ul>):
  <li>Top label<ul>                       one li per top-level trigger
    <li><a href><img>Group</a><ul>…</ul></li>   column with an icon header (link or text-only header)
    <li>Group<ul>…</ul></li>                    column with a plain heading (e.g. "By Function")
      <li><a href><img?>Title</a><em>Subtitle</em></li>   item (icon / subtitle optional)
    <li><img><a href>Title</a><em>Description</em><a href>CTA</a></li>   promo card (image, no nested list)
    <li><strong><a href>View all …</a></strong></li>                    panel footer link
  </ul></li>
Everything is verbatim text from the source (no synthesis); external links keep their absolute host.
"""
import re, sys, os
from bs4 import BeautifulSoup, Tag
sys.path.insert(0, os.path.dirname(__file__))
sys.argv = [sys.argv[0]]
exec(open(os.path.join(os.path.dirname(__file__), 'importer.py')).read().split("if __name__ == '__main__':")[0])  # localize, absurl, esc, clean_text

RAW = 'stardust/raw/index.html'
NAV = 'content/nav.html'
PAGE_URL = LIVE + '/'

def txt(el):
    return clean_text(el.get_text(' ')) if el is not None else ''

def link(a, inner):
    href = a.get('href') if a is not None else None
    return f'<a href="{esc(localize(absurl(href)))}">{inner}</a>' if href else inner

def img_tag(img):
    if img is None: return ''
    src = img.get('src') or img.get('data-src')
    if not src: return ''
    return f'<img src="{esc(absurl(src))}" alt="{esc(img.get("alt") or "")}">'

def item_html(li):
    a = li.find('a')
    icon = li.find('img')
    title = li.select_one('.nav-item-title')
    sub = li.select_one('.nav-item-subtitle')
    t = txt(title) if title is not None else txt(a or li)
    t = re.sub(r'[​­]', '', t)
    inner = (img_tag(icon) + ' ' if icon is not None else '') + esc(t)
    h = f'<li>{link(a, inner)}'
    if sub is not None and txt(sub): h += f'<em>{esc(txt(sub))}</em>'
    return h + '</li>'

def group_html(nl):
    head = nl.select_one('.header-item')
    ul = nl.select_one('ul.nav-list')
    items = ''.join(item_html(li) for li in ul.find_all('li', recursive=False)) if ul is not None else ''
    if head is None: return f'<li><ul>{items}</ul></li>'
    icon = head.find('img')
    label = re.sub(r'[​­]', '', txt(head))
    inner = (img_tag(icon) + ' ' if icon is not None else '') + esc(label)
    if head.name == 'a' and head.get('href'): inner = link(head, inner)
    return f'<li>{inner}<ul>{items}</ul></li>'

def promo_html(ad):
    img = ad.find('img')
    a = ad.find('a', href=True)
    title = ad.select_one('.title'); desc = ad.select_one('.description'); cta = ad.select_one('.cta')
    if a is None and title is None: return ''
    h = '<li>' + img_tag(img)
    h += f'<a href="{esc(localize(absurl(a.get("href"))))}">{esc(txt(title) or txt(a))}</a>' if a is not None else f'<span>{esc(txt(title))}</span>'
    if desc is not None and txt(desc): h += f'<em>{esc(txt(desc))}</em>'
    if cta is not None and txt(cta) and a is not None: h += f'<a href="{esc(localize(absurl(a.get("href"))))}">{esc(txt(cta))}</a>'
    return h + '</li>'

def footer_html(a):
    label = txt(a.select_one('.cta-text') or a)
    return f'<li><strong><a href="{esc(localize(absurl(a.get("href"))))}">{esc(label)}</a></strong></li>'

def panel_html(drop):
    parts = []
    for el in drop.find_all(True):
        cls = el.get('class') or []
        if 'component-nav-list' in cls: parts.append(group_html(el))
        elif 'component-topNavAd' in cls: parts.append(promo_html(el))
        elif el.name == 'a' and ('sub-nav-footer' in cls or ('cta-link' in cls and el.find_parent(class_='component-topNavAd') is None and el.find_parent(class_='component-nav-list') is None)):
            parts.append(footer_html(el))
    return ''.join(p for p in parts if p)

def main():
    s = BeautifulSoup(open(RAW, encoding='utf-8').read(), 'html.parser')
    top = s.select_one('.component-nav-top')
    out = '<ul>'
    for li in top.select('.main-nav > ul > li.main-nav-item'):
        label = txt(li.select_one('.main-nav-item-header') or li)
        menu = li.get('data-menu')
        if not label or 'Language' in (menu or ''): continue
        drop = s.select_one(f'.dropdown[data-menu="{menu}"]') if menu else None
        a = li.find('a', href=True)
        head = f'<a href="{esc(localize(absurl(a["href"])))}">{esc(label)}</a>' if a is not None else esc(label)
        out += f'<li>{head}' + (f'<ul>{panel_html(drop)}</ul>' if drop is not None else '') + '</li>'
    out += '</ul>'
    nav = BeautifulSoup(open(NAV, encoding='utf-8').read(), 'html.parser')
    secs = nav.select('main > div')
    old = secs[2].find('ul')
    old.replace_with(BeautifulSoup(out, 'html.parser'))
    open(NAV, 'w', encoding='utf-8').write(str(nav))
    n = BeautifulSoup(out, 'html.parser')
    print('nav rebuilt:', [(txt(li.contents[0]) if isinstance(li.contents[0], str) else txt(li.contents[0]), len(li.select(':scope > ul > li')), len(li.find_all('a'))) for li in n.select('ul > li')[:5]], 'promos', out.count('<img src="https://images'))

main()
