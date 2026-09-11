#!/usr/bin/env python3
"""importer.py — synopsys.com (AEM) page → EDS/DA body fragment.

Walks the server-rendered AEM grid (div.root.synopsysContainer > .aem-Grid > *.aem-GridColumn) in
document order and maps every component to an EDS construct (default content or a block table),
following the deploy skill's ENCODE contract / David's Model:
  - prose (textcomp, rte, pageTitle, image, video links, tags) → default content
  - repeating / bespoke structures → blocks: hero(+variants), breadcrumbs, anchor-nav, toc, cards
    (benefits | asset | blog | news), columns(+features/media), carousel(resources | blog), box-links,
    tabs, accordion, quote, logos, form
Sections break on: a block, a background change (light-grey → `tinted`), an anchor id.
Unmapped component types fall back to default-content extraction and are counted in the coverage
report (stardust/import-coverage.json) so the block library can grow by frequency.

Usage: python3 stardust/scripts/importer.py <raw.html> [<raw.html> …] [--out content] [--type T]
"""
import sys, os, re, json, html, collections
from urllib.parse import urljoin
PAGE_URL = LIVE_URL = 'https://www.synopsys.com/'
from bs4 import BeautifulSoup, NavigableString, Tag, Comment, Doctype, CData, ProcessingInstruction

LIVE = 'https://www.synopsys.com'
esc = html.escape
COVERAGE = collections.Counter(); UNMAPPED = collections.Counter(); PAGES = 0

# ------------------------------------------------------------------ helpers
def absurl(u):
    if not u: return u
    u = u.strip()
    if u.startswith('//'): return 'https:' + u
    if u.startswith('/'): return LIVE + u
    if not re.match(r'^[a-z]+:', u): return urljoin(PAGE_URL, u)
    return u

def slug_path(path):
    """EDS-safe page path: lowercase a-z0-9- segments; `.php`/`.html` dropped; query values become trailing segments."""
    from urllib.parse import urlsplit, parse_qsl
    u = urlsplit(path); segs = [x for x in u.path.split('/') if x]
    segs += [v for _, v in parse_qsl(u.query, keep_blank_values=True)]
    out = []
    for seg in segs:
        seg = re.sub(r'\.(html|php)$', '', seg.lower())
        seg = re.sub(r'[^a-z0-9]+', '-', seg).strip('-')
        if seg: out.append(seg)
    return '/' + '/'.join(out) if out else '/'

def _inventory_slugs():
    m = {}
    try:
        for line in open('stardust/inventory.txt'):
            u = line.strip()
            if not u: continue
            key = u.replace(LIVE, ''); key = re.sub(r'\.html(?=[#?]|$)', '', key) or '/'
            sl = slug_path(key)
            if sl != key: m[key] = sl
    except FileNotFoundError: pass
    return m
SLUG_MAP = _inventory_slugs()

def localize(href):
    if not href: return '#'
    h = href.strip()
    if h and not re.match(r'^([a-z]+:|/|#)', h): h = urljoin(PAGE_URL, h)
    if h.startswith(LIVE): h = h[len(LIVE):] or '/'
    if h.startswith('/') and not h.startswith('//') and not h.startswith('/content/dam'):
        h = re.sub(r'\.html(?=[#?]|$)', '', h)
        if len(h) > 1 and h.endswith('/'): h = h[:-1]
        if not h: h = '/'
        base, frag = (h.split('#', 1) + [''])[:2]
        if base in SLUG_MAP: h = SLUG_MAP[base] + ('#' + frag if frag else '')
        return h
    return h

def clean_text(s): return re.sub(r'\s+', ' ', s or '').strip()

def biggest_src(img):
    """Pick the largest rendition from srcset, else src/data-src."""
    ss = img.get('srcset') or img.get('data-srcset')
    if ss:
        best = None; bw = -1
        for part in ss.split(','):
            bits = part.strip().split()
            if not bits: continue
            u = bits[0]; w = int(bits[1][:-1]) if len(bits) > 1 and bits[1].endswith('w') else 0
            if w > bw: bw = w; best = u
        if best: return absurl(html.unescape(best))
    return absurl(html.unescape(img.get('src') or img.get('data-src') or ''))

def box_label_html(lab):
    if lab is None: return ''
    top = lab.select_one('a[href]') if lab.name != 'a' else lab
    t = esc(clean_text(lab.get_text()))
    return f'<p><strong><a href="{esc(localize(top.get("href")))}">{t}</a></strong></p>' if top is not None and top.get('href') else f'<p><strong>{t}</strong></p>'

def linked_img_html(img, alt=None):
    """img_html wrapped in the source link when the image sits inside an <a> of its own component (linked figures, image tiles)."""
    h = img_html(img, alt)
    if not h: return ''
    a = img.find_parent('a')
    if a is not None and a.get('href') and not a.get('href').strip().lower().startswith(('#', 'javascript:')) and a.find_parent(class_=re.compile('component-image|image|mediaLinkTile|cmp-image')) is not None or (a is not None and a.get('href') and a.find_parent(class_='aem-GridColumn') is not None and a.find_parent(class_='aem-GridColumn') is img.find_parent(class_='aem-GridColumn') and not clean_text(a.get_text())):
        return f'<a href="{esc(localize(a.get("href")))}">{h}</a>'
    return h

def img_html(img, alt=None):
    if img is None: return ''
    src = biggest_src(img)
    if not src or src.startswith('data:'): return ''
    a = alt if alt is not None else (img.get('alt') or '')
    return f'<img src="{esc(src)}" alt="{esc(clean_text(a))}">'

def first_img(node):
    return node.find('img') if node else None

# inline rich text → clean HTML (keeps p/ul/ol/li/a/strong/em/b/i/br/img/h1-h6/sup? (sup dropped to text))
KEEP_INLINE = {'a', 'strong', 'em', 'b', 'i', 'br', 'code', 'u'}
def rich(node, allow_headings=True, h_shift=0):
    """Serialize a rich-text container into default-content HTML (block elements as siblings)."""
    out = []
    def inline(n):
        if isinstance(n, (Comment, Doctype, CData, ProcessingInstruction)): return ''
        if isinstance(n, NavigableString):
            t = re.sub(r'\s+', ' ', str(n))
            if re.search(r'(function\s*\(|window\.[a-zA-Z]|document\.[a-zA-Z]|try\s*\{|\$\(|=>\s*\{|\.push\(|var [a-zA-Z_]+\s*=)', t): return ''
            if re.search(r'<[a-zA-Z/!]', t): return f'<code>{esc(t)}</code>'
            return esc(t)
        if not isinstance(n, Tag): return ''
        name = n.name
        if name in ('script', 'style', 'svg', 'meta', 'link', 'noscript', 'button'): return ''
        if name == 'br': return '<br>'
        if name == 'img': return img_html(n)
        if name == 'picture': return img_html(n.find('img'))
        inner = ''.join(inline(c) for c in n.children)
        if name == 'a' and n.get('href'):
            if n['href'].strip().lower().startswith('javascript:'): return inner  # source in-page scripts (show/hide) — text only
            return f'<a href="{esc(localize(n["href"]))}">{inner}</a>'
        if name in ('strong', 'b'): return f'<strong>{inner}</strong>' if inner.strip() else ''
        if name in ('em', 'i'): return f'<em>{inner}</em>' if inner.strip() else ''
        if name == 'code': return f'<code>{inner}</code>'
        if name in ('sup', 'sub'): return inner
        return inner
    def block(n):
        if isinstance(n, NavigableString) and str(n).strip() == 'coveo-noindex': return  # source indexing marker text (DesignWare pages)
        if isinstance(n, (Comment, Doctype, CData, ProcessingInstruction)): return
        if isinstance(n, NavigableString):
            t = esc(re.sub(r'\s+', ' ', str(n))).strip()
            if t: out.append(f'<p>{t}</p>')
            return
        if not isinstance(n, Tag): return
        name = n.name
        if name in ('script', 'style', 'svg', 'meta', 'link', 'noscript', 'iframe', 'form', 'button'): return
        if name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            lvl = min(6, max(1, int(name[1]) + h_shift)) if allow_headings else None
            txt = inline_children(n)
            if clean_text(re.sub('<[^>]+>', '', txt)):
                out.append(f'<h{lvl}>{txt}</h{lvl}>' if lvl else f'<p><strong>{txt}</strong></p>')
            return
        if name == 'li' and (n.parent is None or n.parent.name not in ('ul', 'ol')):
            txt = inline_children(n)
            if clean_text(re.sub('<[^>]+>', '', txt)): out.append(f'<ul><li>{txt}</li></ul>')
            return
        if name == 'p' and (n.find('li', recursive=False) is not None or n.find(['table', 'ul', 'ol']) is not None):
            for c in n.children: block(c)
            return
        if name == 'p':
            txt = inline_children(n)
            plain = clean_text(re.sub('<[^>]+>', '', txt.replace('<br>', ' ')))
            if re.search(r'(function\s*\(|window\.[a-zA-Z]|document\.[a-zA-Z]|try\s*\{|\$\(|=>\s*\{)', plain): return
            if plain or '<img' in txt:
                out.append(f'<p>{txt}</p>')
            return
        if name in ('ul', 'ol'):
            items = []
            for li in n.find_all('li', recursive=False):
                sub = ''.join(f'<{c.name}>' + ''.join(f'<li>{inline_children(x)}</li>' for x in c.find_all('li', recursive=False)) + f'</{c.name}>' for c in li.find_all(['ul', 'ol'], recursive=False))
                own = ''.join(inline(c) for c in li.children if not (isinstance(c, Tag) and c.name in ('ul', 'ol')))
                if clean_text(re.sub('<[^>]+>', '', own)) or sub: items.append(f'<li>{own}{sub}</li>')
            if items: out.append(f'<{name}>' + ''.join(items) + f'</{name}>')
            return
        if name in ('img', 'picture'):
            ih = img_html(n if name == 'img' else n.find('img'))
            if ih: out.append(f'<p>{ih}</p>')
            return
        if name == 'table':
            rows = []
            for tr in n.find_all('tr'):
                cells = [inline_children(td) for td in tr.find_all(['td', 'th'])]
                rows.append('<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>')
            if rows:
                header = bool(n.find('th')) or (n.find('tr') is not None and all(td.find(['b', 'strong']) is not None for td in n.find('tr').find_all(['td', 'th'])))
                cells_rows = ''.join('<div>' + ''.join(f'<div>{c}</div>' for c in [inline_children(td) for td in tr.find_all(['td', 'th'])]) + '</div>' for tr in n.find_all('tr'))
                out.append(f'<div class="table{" header" if header else " no-header"}">{cells_rows}</div>')
            return
        if name == 'blockquote':
            out.append(f'<blockquote>{inline_children(n)}</blockquote>'); return
        if name == 'a' and n.get('href') and not n.find(['p', 'div', 'h1', 'h2', 'h3', 'h4']):
            txt = inline(n)
            if clean_text(re.sub('<[^>]+>', '', txt)) or '<img' in txt: out.append(f'<p>{txt}</p>')
            return
        if name in ('div', 'section', 'span', 'article', 'main', 'header', 'footer', 'nav', 'li', 'figure', 'figcaption', 'small', 'label', 'legend'):
            # if this container has only inline content, wrap as a paragraph; else recurse
            kids = [c for c in n.children if not (isinstance(c, NavigableString) and not str(c).strip())]
            if kids and all((isinstance(c, NavigableString)) or (c.name in KEEP_INLINE | {'span', 'img', 'picture', 'sup', 'sub'}) for c in kids):
                txt = ''.join(inline(c) for c in kids)
                if clean_text(re.sub('<[^>]+>', '', txt.replace('<br>', ' '))) or '<img' in txt: out.append(f'<p>{txt}</p>')
            else:
                for c in kids: block(c)
            return
        for c in n.children: block(c)
    def inline_children(n): return ''.join(inline(c) for c in n.children)
    block(node)
    return re.sub(r'</ul>\s*<ul>', '', ''.join(out))

def block_table(name, rows):
    """rows: list of lists of cell-HTML strings."""
    return f'<div class="{esc(name)}">' + ''.join('<div>' + ''.join(f'<div>{c}</div>' for c in r) + '</div>' for r in rows) + '</div>'

def cta_html(a, kind='secondary'):
    if a is None: return ''
    label = clean_text(a.get_text(' '))
    if not label: return ''
    href = esc(localize(a.get('href')))
    wrap = 'strong' if kind == 'primary' else 'em'
    return f'<p><{wrap}><a href="{href}">{esc(label)}</a></{wrap}></p>'

# ------------------------------------------------------------------ component handlers
def grid_children(node):
    """Direct AEM grid columns under node (any depth of .aem-Grid wrappers)."""
    grid = node.find(class_='aem-Grid') if node and 'aem-Grid' not in (node.get('class') or []) else node
    if grid is None: return []
    return [c for c in grid.find_all(recursive=False) if isinstance(c, Tag)]

def col_type(col):
    cls = col.get('class') or []
    return cls[0] if cls else ''

PAD_TOKENS = False  # set per page: article/glossary bands carry their authored vertical padding as section styles
def bg_of(col):
    bc = col.find(class_='background-component')
    toks = []
    if bc is not None and 'light-grey-bg' in (bc.get('class') or []): toks.append('tinted')
    if PAD_TOKENS and bc is not None:
        cls = ' '.join(bc.get('class') or [])
        for side, key in (('top', 'pt'), ('bottom', 'pb')):
            m = re.search(r'vert-pad-' + side + r'-(xs|sm|md|lg)', cls)
            if m: toks.append(f'{key}-{m.group(1)}')
    return ', '.join(toks)

class Page:
    def __init__(self):
        self.sections = []   # list of dicts: {items:[html], style:'', anchor:'', hasBlock:bool}
        self.cur = None
    def new_section(self, style='', anchor=''):
        self.cur = {'items': [], 'style': style, 'anchor': anchor, 'block': False}
        self.sections.append(self.cur)
    def add_default(self, h, style=''):
        if not h: return
        if self.cur is None or self.cur['block'] or (self.cur['style'] != style and self.cur['items']):
            self.new_section(style)
        elif self.cur['style'] != style: self.cur['style'] = style
        self.cur['items'].append(h)
    def add_block(self, h, style='', head=None):
        """A block gets its own section; an optional section head (default content) precedes it."""
        if self.cur is None or self.cur['block'] or (self.cur['style'] != style and self.cur['items']):
            self.new_section(style)
        elif self.cur['style'] != style: self.cur['style'] = style
        if head: self.cur['items'].append(head)
        self.cur['items'].append(h); self.cur['block'] = True
    def set_anchor(self, aid):
        if self.cur is None or self.cur['items']:
            self.new_section(self.cur['style'] if self.cur else '')
        self.cur['anchor'] = aid

def handle_banner(col, page):
    sec = col.find(class_='componentSkinnyBanner') or col.find(class_='component-banner') or col.find(class_='component-video-banner')
    if sec is None: return False
    variant = []
    cls = ' '.join(sec.get('class') or []) + ' ' + ' '.join((sec.find(class_='desktop-wrapper') or sec).get('class') or [])
    if 'black-gradient' in cls: variant.append('black')
    if 'light-purple-gradient' in cls: variant.append('light')
    if 'component-video-banner' in cls: variant.append('video')
    title_el = sec.find(['h1', 'h2', 'h3'])
    title = clean_text(title_el.get_text(' ')) if title_el else ''
    if not title:
        t2 = sec.select_one('.title p, .text-size-normal, .text-size-larger, .text-size-smaller')
        title = clean_text(t2.get_text(' ')) if t2 else ''
    sub = sec.select_one('.sub-title')
    sub_html = rich(sub, allow_headings=False) if sub else ''
    ctas = ''.join(cta_html(a) for a in sec.select('.component-button a'))
    imgs = sec.select('.banner-img img, .cropped-img img, picture img')
    img_cell = img_html(imgs[0]) if imgs else ''
    poster = sec.find('video')
    if poster is not None and poster.get('poster') and not img_cell:
        img_cell = f'<img src="{esc(absurl(poster["poster"]))}" alt="">'
    if img_cell and 'video' not in variant: variant.append('image')
    is_connect = title.lower().startswith('connect with us') or (col.find_parent(class_='cmp-experiencefragment--contact-us---general') is not None)
    if is_connect: variant = ['connect']
    # page h1 only for the first hero on the page
    tag = 'h1' if (not page.h1_used and not is_connect) else 'h2'
    if tag == 'h1': page.h1_used = True
    cell = (f'<{tag}>{esc(title)}</{tag}>' if title else '') + sub_html + ctas
    rows = [[cell]]
    if img_cell: rows.insert(0, [img_cell])
    name = 'hero' + (' ' + ' '.join(variant) if variant else '')
    page.add_block(block_table(name, rows))
    COVERAGE['hero'] += 1
    return True

def banner_family(soup):
    tmpl = (soup.body.get('data-template') if soup.body else '') or ''
    return ' slate' if 'technical-bulletin' in tmpl or 'article' in tmpl and 'chip-design' not in tmpl else ''

def handle_blogbanner(col, page):
    sec = col.find(class_='cmp-blogbanner')
    if sec is None: return False
    crumbs = [a for a in sec.select('.breadcrumb a') if clean_text(a.get_text()) and a.get('href')]  # banner breadcrumb: Home / Silicon to Systems
    cat = None
    h1 = sec.find('h1')
    authors = [a for a in sec.select('.authors a')]
    date = sec.select_one('.date'); rt = sec.select_one('.read-time')
    cell = ''
    if crumbs: cell += '<p>' + ' / '.join(f'<a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a>' for a in crumbs) + '</p>'
    if h1: cell += f'<h1>{esc(clean_text(h1.get_text(" ")))}</h1>'; page.h1_used = True
    if authors: cell += '<p>' + ', '.join(f'<a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a>' for a in authors) + '</p>'
    meta = ' / '.join(clean_text(x.get_text()) for x in (date, rt) if x)
    if meta: cell += f'<p>{esc(meta)}</p>'
    img = sec.select_one('.blog-banner img')
    rows = [[cell]]
    if img is not None and img_html(img): rows.insert(0, [img_html(img)])
    page.add_block(block_table('hero blog' + getattr(page, 'banner_family', ''), rows)); COVERAGE['hero blog'] += 1
    return True

def handle_toc(col, page):
    sec = col.find(class_='cmp-tableofcontents')
    if sec is None: return False
    if 'table-of-contents-product-layout' in (sec.get('class') or []):
        items = sec.select('.cmp-productsolutions__content-item a, .cmp-tableofcontents__content-item a')
        lis = ''.join(f'<li><a href="{esc(a.get("data-href") or a.get("href") or "#")}">{esc(clean_text(a.get_text()))}</a></li>' for a in items if clean_text(a.get_text()))
        btn = sec.select_one('.cmp-productsolutions__button-link a')
        page.add_block(block_table('anchor-nav', [[f'<ul>{lis}</ul>' + cta_html(btn, 'primary')]])); COVERAGE['anchor-nav'] += 1
    else:
        # article TOC: auto-generated from the page's h2s at decorate time
        page.add_block(block_table('toc', [['<p>Table of Contents</p>']])); COVERAGE['toc'] += 1
    return True

def handle_text(col, page):
    sec = col.find(class_='component-textcomp') or col.find(class_='component-rte') or col.find(class_='component-rtecomp')
    if sec is None: return False
    style = bg_of(col)
    if PAD_TOKENS and 'component-textcomp' not in (sec.get('class') or []):
        style = ', '.join(x for x in (style, 'rte') if x)  # rich-text editor band: copy starts flush (no 24px component-text offset)
    if 'text-align-center' in ' '.join(sec.get('class') or []) and sec.find(['h1', 'h2', 'h3']) is not None and len(clean_text(sec.get_text())) < 160:
        style = ', '.join(x for x in (style, 'centered') if x)
    h = ''
    title = sec.find(['h1', 'h2', 'h3', 'h4'], class_='title') or sec.select_one('h2.title, h3.title')
    if title is not None and clean_text(title.get_text(' ')):
        lvl = 'h2'
        if title.name == 'h1':
            lvl = 'h1' if not page.h1_used else 'h2'
            if lvl == 'h1': page.h1_used = True
        elif title.name in ('h3', 'h4'): lvl = title.name
        h += f'<{lvl}>{rich_inline(title)}</{lvl}>'
    body = sec.select_one('.component-text') if sec.select_one('.component-text') else (sec if 'component-rte' in (sec.get('class') or []) else None)
    if body is not None:
        h += rich(body, allow_headings=True)
    # buttons inside text components
    for b in sec.select('.component-button a, a.component-button'):
        if b.find_parent(class_='component-text') is None and b.get('href'): h += cta_html(b, 'secondary' if 'secondary' in ' '.join(b.get('class') or []) + ' '.join((b.parent.get('class') or [])) else 'primary')
    for b in sec.select('a.cta-link'):
        if b.find_parent(class_='component-text') is None: h += f'<p><a href="{esc(localize(b.get("href")))}">{esc(clean_text(b.get_text(" ")))}</a></p>'
    if h: page.add_default(h, style)
    COVERAGE['text'] += 1
    return True

def rich_inline(node):
    return ''.join(esc(str(c)) if isinstance(c, NavigableString) else (rich_inline(c) if c.name not in ('svg', 'script', 'style') else '') for c in node.children).strip()

def kb_rows(cols):
    rows = []
    for kb in cols:
        img = kb.find('img'); t = kb.select_one('.cmp-key-benefits__title'); d = kb.select_one('.cmp-key-benefits__description')
        title = clean_text(t.get_text(' ')) if t else ''
        desc = rich(d, allow_headings=False) if d and clean_text(d.get_text()) else ''
        rows.append([img_html(img, title) if img else '', f'<p>{esc(title)}</p>' + desc])
    return rows

def asset_card_row(card):
    lab = card.select_one('.label'); h = card.select_one('.heading'); p = card.select_one('.heading-desc-wrapper p')
    a = None
    for cand in card.select('a'):
        if clean_text(cand.get_text()) and cand.find_parent(class_='heading') is None: a = cand; break
    cell = ''
    if lab and clean_text(lab.get_text()): cell += f'<p><strong>{esc(clean_text(lab.get_text()))}</strong></p>'
    dt = card.select_one('.date-time')  # source label row: type chip · date (right-aligned); authored as an emphasised paragraph
    if dt is not None and clean_text(dt.get_text()): cell += f'<p><em>{esc(clean_text(dt.get_text()))}</em></p>'
    if h and clean_text(h.get_text(' ')): cell += f'<h3>{esc(clean_text(h.get_text(" ")))}</h3>'
    if p and clean_text(p.get_text()): cell += f'<p>{esc(clean_text(p.get_text()))}</p>'
    if a: cell += f'<p><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></p>'
    img = card.select_one('.image-wrapper img, picture img')
    if img is None:
        dl = card.get('data-cmp-data-layer') or ''
        m = re.search(r'"repo:path":"(/content/dam/[^"]+)"', html.unescape(dl))
        if m: return [f'<img src="{esc(LIVE + m.group(1))}" alt="{esc(clean_text(h.get_text(" ")) if h else "")}">', cell]
    return [img_html(img), cell] if img is not None and img_html(img) else [cell]

def blog_card_row(card):
    img = card.select_one('.image-wrapper img, picture img')
    dt = card.select_one('.date-time'); h = card.select_one('.heading'); ha = h.find('a') if h else None
    authors = card.select('.authors-links a'); tags = card.select('.tag-holder a'); cta = card.select_one('.cta a')
    cell = ''
    if dt: cell += f'<p>{esc(clean_text(dt.get_text()))}</p>'
    if h:
        t = clean_text(h.get_text(' ')); href = localize(ha.get('href')) if ha is not None else (localize(cta.get('href')) if cta is not None else None)
        cell += f'<h3><a href="{esc(href)}">{esc(t)}</a></h3>' if href else f'<h3>{esc(t)}</h3>'
    if authors: cell += '<p>By ' + ', '.join(f'<a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a>' for a in authors) + '</p>'
    if tags: cell += '<p>Tags: ' + ', '.join(f'<a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a>' for a in tags) + '</p>'
    if cta is not None and clean_text(cta.get_text()): cell += f'<p><a href="{esc(localize(cta.get("href")))}">{esc(clean_text(cta.get_text()))}</a></p>'
    return [img_html(img), cell] if img is not None and img_html(img) else [cell]

def mra_card_row(item):
    """Author archive row (source: .cmp-blogsdev__mra-item-container): thumb | label · title · byline · date/read · tags."""
    img = item.select_one('.cmp-blogsdev__mra-image img, img')
    lab = item.select_one('.cmp-blogsdev__mra-right .label, .label'); h = item.select_one('.cmp-blogsdev__mra-title'); ha = h.find('a') if h else None
    dt = item.select_one('.cmp-blogsdev__mra-date-time'); by = item.select_one('.cmp-blogsdev__mra-author'); tags = item.select_one('.cmp-blogsdev__mra-tags')
    cell = ''
    if lab is not None and clean_text(lab.get_text()): cell += f'<p><strong>{esc(clean_text(lab.get_text()))}</strong></p>'
    if h is not None:
        t = clean_text(h.get_text(' ')); href = localize(ha.get('href')) if ha is not None else None
        cell += f'<h3><a href="{esc(href)}">{esc(t)}</a></h3>' if href else f'<h3>{esc(t)}</h3>'
    if by is not None and clean_text(by.get_text()): cell += f'<p>{rich_inline_p(by)}</p>'
    if dt is not None and clean_text(dt.get_text()): cell += f'<p>{esc(clean_text(dt.get_text()).replace(" / ", " / ").replace("/", " / ").replace("  ", " "))}</p>'
    if tags is not None and clean_text(tags.get_text()): cell += f'<p>{rich_inline_p(tags)}</p>'
    return [img_html(img), cell] if img is not None and img_html(img) else [cell]

def solution_card_row(card):
    a = card.find('a'); img = card.find('img'); t = card.select_one('.text-hover span'); d = card.select_one('.text-hover p'); b = card.select_one('.text-hover .button')
    cell = ''
    href = localize(a.get('href')) if a is not None and a.get('href') else None
    if t: cell += f'<h3>{esc(clean_text(t.get_text()))}</h3>'
    if d and clean_text(d.get_text()): cell += f'<p>{esc(clean_text(d.get_text()))}</p>'
    if href: cell += f'<p><a href="{esc(href)}">{esc(clean_text(b.get_text()) if b else "Learn More")}</a></p>'
    return [img_html(img), cell] if img is not None and img_html(img) else [cell]

def handle_banner_carousel(sec, page):
    rows = []
    for item in sec.select('.cmp-carousel__item'):
        b = item.find(class_='component-banner')
        if b is None: continue
        img = b.select_one('.dm-desktop img, img')
        mimg = b.select_one('.dm-mobile img')  # separate mobile rendition on the source: authored as a second image in the cell
        t = b.find(['h1', 'h2', 'h3']) or b.select_one('.title p, .text-size-larger, .text-size-normal')
        title = clean_text(t.get_text(' ')) if t else clean_text(item.get('title') or '')
        sub = b.select_one('.sub-title, .component-text p:not(:first-child)')
        ctas = ''.join(cta_html(a) for a in b.select('.component-button a'))
        tag = 'h1' if not page.h1_used else 'h2'
        if tag == 'h1': page.h1_used = True
        cell = (f'<{tag}>{esc(title)}</{tag}>' if title else '') + (f'<p>{esc(clean_text(sub.get_text()))}</p>' if sub and clean_text(sub.get_text()) and clean_text(sub.get_text()) != title else '') + ctas
        imgs = img_html(img) if img is not None else ''
        if mimg is not None and mimg is not img and img_html(mimg): imgs += img_html(mimg)
        rows.append([imgs, cell] if imgs else [cell])
    if rows: page.add_block(block_table('hero carousel', rows)); COVERAGE['hero carousel'] += 1
    return bool(rows)

def people_rows(cols):
    rows = []
    for c in cols:
        img = c.find('img'); h = c.find(['h2', 'h3'], class_='title') or c.find(['h2', 'h3'])
        name = clean_text(h.get_text(' ')) if h else ''
        body = ''
        for p in c.select('.component-text p'):
            if clean_text(p.get_text()): body += f'<p>{rich_inline_p(p)}</p>'
        rows.append([img_html(img, name) if img is not None else '', (f'<h3>{esc(name)}</h3>' if name else '') + body])
    return rows

def rich_inline_p(p):
    out = ''
    for c in p.children:
        if isinstance(c, NavigableString): out += esc(str(c))
        elif c.name == 'a' and c.get('href'): out += f'<a href="{esc(localize(c["href"]))}">{esc(clean_text(c.get_text()))}</a>'
        elif c.name in ('strong', 'b'): out += f'<strong>{esc(clean_text(c.get_text()))}</strong>'
        elif c.name == 'br': out += '<br>'
        else: out += esc(clean_text(c.get_text()))
    return re.sub(r'\s+', ' ', out).strip()

def handle_carousel(col, page):
    sec = col.find(class_='cmp-carousel') or col.find(class_='cmp-dynamiccards') or col.find(class_='component-content-carousel')
    if sec is None: return False
    if sec.get('carousel-type') == 'banner-carousel' or sec.select_one('.cmp-carousel__item .component-banner'):
        return handle_banner_carousel(sec, page)
    style = bg_of(col)
    cards = [c for c in sec.select('.component-assetcard, .component-card-b') if 'slick-cloned' not in ' '.join(c.get('class') or []) and (c.find_parent(class_='slick-cloned') is None)]
    if not cards:
        imgs = [i for i in sec.select('img') if i.find_parent(class_='slick-cloned') is None and img_html(i)]
        seen = set(); rows = []
        for i in imgs:
            k = biggest_src(i)
            if k in seen: continue
            seen.add(k); a = i.find_parent('a'); cap = i.get('alt') or ''
            rows.append([img_html(i), (f'<p><a href="{esc(localize(a.get("href")))}">{esc(cap or "View")}</a></p>' if a is not None and a.get('href') else '')])
        if rows: page.add_block(block_table('carousel images', rows), style); COVERAGE['carousel images'] += 1; return True
        return False
    if cards[0].name and 'component-card-b' in (cards[0].get('class') or []):
        rows = [blog_card_row(c) for c in cards]; name = 'carousel blog'
    else:
        rows = [asset_card_row(c) for c in cards]; name = 'carousel resources'
    page.add_block(block_table(name, rows), style); COVERAGE[name] += 1
    return True

def handle_cards_grid(cards, page, style):
    if not cards: return
    if 'component-card-b' in (cards[0].get('class') or []):
        rows = [blog_card_row(c) for c in cards]; name = 'cards blog'
    else:
        rows = [asset_card_row(c) for c in cards]; name = 'cards asset'
    page.add_block(block_table(name, rows), style); COVERAGE[name] += 1

def handle_column(col, page):
    sec = col.find(class_='component-column')
    if sec is None: return False
    style = bg_of(col)
    cols = [c for c in sec.find_all(recursive=False) if isinstance(c, Tag) and 'snps-col-divider' not in ' '.join(c.get('class') or [])]
    def span_of(c):
        m = re.search(r'col-sm-(\d+)', ' '.join(c.get('class') or [])); return int(m.group(1)) if m else 12
    # single column whose grid starts with text components (a heading band) followed by a component (cards XF, box links…):
    # emit the text first as default content, then let the remainder pick its block pattern
    if len(cols) == 1:
        kids = grid_children(cols[0]) or []
        lead = []
        for k in kids:
            if col_type(k) in ('text',) and k.select_one('.component-textcomp, .component-text, .component-rte') is not None: lead.append(k)
            else: break
        if lead and len(kids) > len(lead):
            for k in lead: convert_column(k, page); k.decompose()
    # a slick/dynamic-cards carousel nested in the column (source "Continue Reading") keeps its carousel nature
    car = sec.select_one('.component-content-carousel, .slick-carousel, .cmp-dynamiccards')
    if car is not None and car.select_one('.component-card-b, .component-assetcard') and not sec.select_one('.component-author-profile'):
        carcol = car.find_parent(class_=re.compile('aem-GridColumn')) or car
        if handle_carousel(carcol, page):
            # the carousel is one component of the column, not the column: drop it from the tree and keep converting the rest
            carcol.decompose()
            cols = [c for c in sec.find_all(recursive=False) if isinstance(c, Tag) and 'snps-col-divider' not in ' '.join(c.get('class') or [])]
            if not any(clean_text(c.get_text()) or c.find('img') for c in cols): return True
    # article 25/75 layout: left rail (toc / subscribe / share / blurbs) + right content column
    if any('two2575' in ' '.join(c.get('class') or []) for c in cols) or (len(cols) == 2 and sec.select_one('.cmp-tableofcontents')):
        left = next((c for c in cols if 'two2575' in ' '.join(c.get('class') or []) or c.select_one('.cmp-tableofcontents')), cols[0])
        for c in cols:
            for sub in grid_children(c) or [c]:
                st = col_type(sub)
                if c is left and st == 'socialShare':
                    # source .cmp-socialshare (X / LinkedIn / Facebook / email) → `share` block in the rail; links are built at runtime
                    page.new_section('rail'); page.add_block(block_table('share', [['<p>Share</p>']])); page.sections[-1]['style'] = 'rail'; page.new_section(); COVERAGE['share'] += 1; continue
                if c is left and st not in ('tableOfContents', 'subscriptionForm', 'marketoFormsContainer', 'marketoForm', 'socialShare', 'search'):
                    before = len(page.sections)
                    page.new_section('rail'); convert_column(sub, page)
                    for sct in page.sections[before:]: sct['style'] = 'rail' if not sct['style'] or sct['style'] == 'rail' else sct['style'] + ', rail'
                    page.new_section()
                else: convert_column(sub, page)
        COVERAGE['article-layout'] += 1
        return True
    # author page: profile column → `author` block in the right rail, archive list → `cards author`
    prof = sec.select_one('.component-author-profile')
    if prof is not None:
        img = prof.find('img'); h = prof.find(['h2', 'h3']); name = clean_text(h.get_text(' ')) if h else ''
        paras = [x for x in prof.select('.component-text p') if clean_text(x.get_text()) and not x.find('img')]
        follow = prof.select_one('.follow')
        rows = []
        if img is not None and img_html(img, name): rows.append([f'<p>{img_html(img, name)}</p>'])
        if name: rows.append([f'<h2>{esc(name)}</h2>'])
        if paras: rows.append([''.join(f'<p>{rich_inline_p(x)}</p>' for x in paras)])
        if follow is not None:
            links = [a for a in follow.select('a[href]')]
            lab = follow.find('p')
            rows.append([(f'<p>{esc(clean_text(lab.get_text()))}</p>' if lab is not None and clean_text(lab.get_text()) else '') + '<p>' + ' '.join(f'<a href="{esc(a.get("href"))}">{esc(clean_text(a.get_text()) or a.get("href").split("/")[2].split(".")[-2].capitalize())}</a>' for a in links) + '</p>'])
        page.new_section('rail-right'); page.add_block(block_table('author', rows), 'rail-right'); COVERAGE['author'] += 1
        before = len(page.sections); page.new_section('main')
        for c in cols:
            if c.select_one('.component-author-profile') is not None: continue
            for sub in grid_children(c) or [c]:
                if col_type(sub) == 'blogsDev' and sub.select_one('.component-card-b, .cmp-blogsdev__mra-item-container'):
                    items = sub.select('.cmp-blogsdev__mra-item-container')
                    rows = [mra_card_row(x) for x in items[:60]] if items else [blog_card_row(x) for x in sub.select('.component-card-b')[:60]]
                    page.add_block(block_table('cards author', rows), 'main'); COVERAGE['cards author'] += 1
                else: convert_column(sub, page)
        for sct in page.sections[before:]: sct['style'] = 'main' if not sct['style'] or sct['style'] == 'main' else sct['style'] + ', main'
        page.new_section()
        COVERAGE['author-layout'] += 1
        return True
    # right rail: wide content column + narrow column of rail cards / downloads / CTAs (source col-sm-9 + col-sm-3)
    if len(cols) == 2 and span_of(cols[1]) <= 4 and span_of(cols[0]) >= 8 and cols[1].select_one('.component-railCard, .component-downloads, .component-calltoaction'):
        rail = cols[1]; main = cols[0]
        page.new_section('rail-right')
        def rail_walk(node):
            kids = grid_children(node) or []
            if not kids:
                inh = node.select_one('.par, .iparys_inherited')
                kids = [c for c in (inh.find_all(recursive=False) if inh is not None else node.find_all(recursive=False)) if isinstance(c, Tag) and c.name not in ('br', 'script', 'style')]
            for sub in kids:
                st = col_type(sub)
                if st == 'experiencefragment': rail_walk(sub); continue
                if sub.select_one('form') and not sub.select_one('.component-calltoaction, a[href]'): continue
                cta = sub.select_one('.component-calltoaction')
                if cta is not None:
                    page.add_default(''.join(cta_html(a, 'secondary' if 'btn-secondary' in ' '.join(a.get('class') or []) else 'primary') for a in cta.select('a[href]')), 'rail-right'); continue
                if st == 'downloads' or sub.select_one('.component-downloads'):
                    page.add_default(''.join(f'<p><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></p>' for a in sub.select('a[href]') if clean_text(a.get_text())), 'rail-right'); continue
                before2 = len(page.sections); convert_column(sub, page)
                for sct in page.sections[before2:]: sct['style'] = 'rail-right' if not sct['style'] or sct['style'] == 'rail-right' else sct['style'] + ', rail-right'
                if page.cur is not None and page.cur['style'] != 'rail-right' and not page.cur['items']: page.cur['style'] = 'rail-right'
        rail_walk(rail)
        before = len(page.sections); page.new_section('main')
        for sub in grid_children(main) or [main]: convert_column(sub, page)
        for sct in page.sections[before:]: sct['style'] = 'main' if not sct['style'] or sct['style'] == 'main' else sct['style'] + ', main'
        page.new_section()
        COVERAGE['rail-layout'] += 1
        return True
    # text + lone image columns (source col-sm-9 text / col-sm-3 image): media columns with the image span as variant
    if len(cols) == 2:
        imgc = next((c for c in cols if c.select_one('.image, .component-image') is not None and not clean_text(c.get_text())), None)
        if imgc is not None and span_of(imgc) <= 4:
            other = cols[1] if imgc is cols[0] else cols[0]
            sp = span_of(imgc); variant = 'narrow' if sp <= 3 else 'third'
            ih = ''.join(f'<p>{linked_img_html(i)}</p>' for i in imgc.select('img') if img_html(i))
            th = ''.join(convert_inline_column(sub, page) for sub in grid_children(other) or [other])
            if ih and th:
                cells = [ih, th] if imgc is cols[0] else [th, ih]
                page.add_block(block_table('columns media' + (' ' + variant if variant else '') + ('' if imgc is cols[0] else ' image-right'), [cells]), style); COVERAGE['columns media'] += 1
                return True
    # one content column with MIXED grid children (text bands + a cards grid + more text): convert in authored order —
    # a block pattern (cards / box links / people) must never swallow the sibling text components
    content_cols = [c for c in cols if clean_text(c.get_text()) or c.find('img') is not None]
    if len(content_cols) == 1:
        kids = grid_children(content_cols[0]) or []
        types = [col_type(k) for k in kids]
        if len(kids) > 1 and any(t in ('text', 'richTextEditor', 'htmlTextOnly') for t in types) and any(t not in ('text', 'richTextEditor', 'htmlTextOnly') for t in types):
            for sub in kids: convert_column(sub, page, inherited_style=style)
            COVERAGE['mixed-column'] += 1
            return True
    cards_b = sec.select('.component-card-b')[:60]  # html2md caps a document at 200 images (author archive pages)
    # author layout fallback: a NARROW profile column (photo + name) beside a card list — never a full-width content column
    bio = next((c for c in cols if span_of(c) <= 4 and c.find('img') is not None and c.find(['h2', 'h3']) is not None and not c.select_one('.component-card-b')), None)
    if cards_b and len(cards_b) >= 2 and bio is not None:
        h = bio.find(['h2', 'h3']); name = clean_text(h.get_text(' ')) if h else ''
        img = bio.find('img'); paras = [p for p in bio.select('p') if clean_text(p.get_text()) and not p.find('img')]
        tag = 'h1' if not page.h1_used else 'h2'; page.h1_used = page.h1_used or tag == 'h1'
        bio_html = (f'<p>{img_html(img, name)}</p>' if img is not None and img_html(img) else '') + (f'<{tag}>{esc(name)}</{tag}>' if name else '') + ''.join(f'<p>{rich_inline_p(x)}</p>' for x in paras)
        page.add_default(bio_html, style)
        page.add_block(block_table('cards blog', [blog_card_row(c) for c in cards_b]), style); COVERAGE['author-layout'] += 1
        return True
    sols = sec.select('.component-solutioncard')
    if sols and len(sols) >= max(2, len(cols) - 1):
        page.add_block(block_table('cards pillars', [solution_card_row(c) for c in sols]), style); COVERAGE['cards pillars'] += 1; return True
    ppl = [c for c in cols if c.find('img') is not None and c.find(['h2', 'h3']) is not None]
    if ppl and len(ppl) >= len([c for c in cols if clean_text(c.get_text())]) and any('leadership' in ' '.join(c.get('class') or []) or 'headshot' in str(c.find('img').get('class')) for c in ppl):
        page.add_block(block_table('cards people', people_rows(ppl)), style); COVERAGE['cards people'] += 1; return True
    kbs = sec.select('.cmp-key-benefits')
    if kbs and len(cols) == 1:
        # single wrapper column around a nested multi-column layout: descend so the inner layout decides
        inner = cols[0].select_one('.column.aem-GridColumn')
        if inner is not None and inner.find(class_='component-column') is not None and len([c for c in inner.find(class_='component-column').find_all(recursive=False) if isinstance(c, Tag)]) > 1:
            # grid siblings that precede the nested column (source: the "Design the Future Today with Synopsys" text) are content
            for sib in grid_children(cols[0]):
                if sib is inner or inner in sib.descendants: break
                convert_column(sib, page)
            return handle_column(inner, page)
    if kbs and len(kbs) >= len(cols):
        # headed benefit lists side by side (home "Industry | Technology"): columns benefits, one cell per column
        heads = [c.select_one('.component-textcomp .title') for c in cols]
        if len(cols) == 2 and all(h is not None for h in heads) and all(c.select('.cmp-key-benefits') for c in cols):
            cells = []
            for c, hd in zip(cols, heads):
                lis = ''
                for kb in c.select('.cmp-key-benefits'):
                    img = kb.find('img'); t = kb.select_one('.cmp-key-benefits__title'); d = kb.select_one('.cmp-key-benefits__description')
                    title = clean_text(t.get_text(' ')) if t else ''
                    desc = rich(d, allow_headings=False) if d and clean_text(d.get_text()) else ''
                    link = kb.select_one('a.cmp-key-benefits__link'); href = localize(link.get('href')) if link is not None and link.get('href') else None
                    ttl = f'<a href="{esc(href)}">{esc(title)}</a>' if href else esc(title)
                    lis += f'<li>{img_html(img, title) if img else ""}<p><strong>{ttl}</strong></p>{desc}</li>'
                cells.append(f'<h3>{esc(clean_text(hd.get_text(" ")))}</h3><ul>{lis}</ul>')
            page.add_block(block_table('columns benefits', [cells]), style); COVERAGE['columns benefits'] += 1; return True
        page.add_block(block_table('cards benefits', kb_rows(kbs)), style); COVERAGE['cards benefits'] += 1; return True
    cards = [c for c in sec.select('.component-assetcard, .component-card-b') if c.find_parent(class_='cmp-carousel') is None]
    if cards and len(cards) >= max(2, len(cols) - 1):
        handle_cards_grid(cards, page, style); return True
    boxes = sec.select('.component-boxLink')
    if boxes:
        rows = []
        for b in boxes:
            lab = b.select_one('.topLabel'); links = b.select('.dropdown-link a')
            rows.append([box_label_html(lab), '<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></li>' for a in links) + '</ul>'])
        page.add_block(block_table('box-links', rows), style); COVERAGE['box-links'] += 1; return True
    if len(cols) >= 2:
        cells = []; has_img_only = False
        for c in cols:
            inner = ''
            for sub in grid_children(c) or [c]:
                inner += convert_inline_column(sub, page)
            cells.append(inner)
            if c.find('img') is not None and not clean_text(c.get_text()): has_img_only = True
        if any(clean_text(re.sub('<[^>]+>', '', x)) or '<img' in x for x in cells):
            variant = 'features' if has_img_only and len(cols) == 2 else ''
            if 'divider-row' in ' '.join(sec.get('class') or []): variant = (variant + ' divided').strip()  # source: vertical hairlines between the columns
            page.add_block(block_table('columns' + (' ' + variant if variant else ''), [cells]), style); COVERAGE['columns'] += 1
        return True
    # single column: flatten
    for c in cols:
        for sub in grid_children(c) or [c]: convert_column(sub, page, inherited_style=style)
    return True

def convert_inline_column(col, page):
    """Convert a nested grid column to cell-safe default HTML (no nested blocks — D2)."""
    t = col_type(col)
    if t in ('text', 'richTextEditor', 'pageTitle', 'image', 'htmlTextOnly', 'button'):
        sec = col.find(class_='component-textcomp') or col.find(class_='component-rte') or col
        h = ''
        title = sec.find(['h2', 'h3', 'h4'], class_='title')
        if title is not None and clean_text(title.get_text(' ')):
            tag = 'h3' if 'text-size-smaller' in ' '.join(title.get('class') or []) else title.name  # source: .text-size-smaller = 24px purple
            h += f'<{tag}>{rich_inline(title)}</{tag}>'
        body = sec.select_one('.component-text') or sec
        h += rich(body, allow_headings=True, h_shift=0)
        for b in sec.select('.component-button a, a.component-button, a.cta-link, .buttons a'):
            if b.find_parent(class_='component-text') is not None: continue
            if 'cta-link' in (b.get('class') or []): h += f'<p><a href="{esc(localize(b.get("href")))}">{esc(clean_text(b.get_text(" ")))}</a></p>'
            else: h += cta_html(b, 'secondary' if 'secondary' in ' '.join(b.get('class') or []) else 'primary')
        return h
    if t == 'pageList' or col.select_one('.component-pageList') is not None:
        pl = col.select_one('.component-pageList') or col; ttl = pl.select_one('h2, h3, h4, .title')
        items = [a for a in pl.select('a[href]') if clean_text(a.get_text())]
        return (f'<p><strong>{esc(clean_text(ttl.get_text(" ")))}</strong></p>' if ttl is not None and clean_text(ttl.get_text()) else '') + ('<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text(" ")))}</a></li>' for a in items) + '</ul>' if items else '')
    if t == 'image':
        im = col.find('img')
        return f'<p>{linked_img_html(im)}</p>' if im is not None and img_html(im) else ''
    if t == 'faq':
        out = ''
        for it in col.select('.accordion-list .item'):
            q = it.select_one('.title h4, .title h3, .title'); d = it.select_one('.detail')
            out += (f'<p><strong>{esc(clean_text(q.get_text(" ")))}</strong></p>' if q else '') + (rich(d, allow_headings=False) if d else '')
        return out
    if t == 'keyBenefits':
        return ''.join(f'<p>{img_html(kb.find("img"))}</p><p>{esc(clean_text(kb.select_one(".cmp-key-benefits__title").get_text()))}</p>' for kb in col.select('.cmp-key-benefits'))
    if t in ('cards',):
        return ''.join(''.join(asset_card_row(c)) for c in col.select('.component-assetcard'))
    if t in ('imageTextCta', 'textImage2Column', 'mediaLinkTile'):
        return rich(col, allow_headings=True)
    if t == 'quote':
        q = col.select_one('.quote-text'); at = col.select('.quote-attribution')
        return (f'<p><em>{esc(clean_text(q.get_text()))}</em></p>' if q else '') + ('<p>' + ' | '.join(esc(clean_text(a.get_text())) for a in at) + '</p>' if at else '')
    if t == 'video':
        return video_default(col)
    return rich(col, allow_headings=True)

def video_link(col):
    ifr = col.find('iframe'); src = (ifr.get('src') or ifr.get('data-src')) if ifr else None
    v = col.find('video'); vid = col.find(attrs={'data-video-id': True}); pl = col.find(attrs={'data-playlist-id': True})
    if src and ('youtube' in src or 'vimeo' in src): return absurl(src), 'Watch video'
    node = pl if pl is not None else (vid if vid is not None else v)
    if node is not None and (node.get('data-video-id') or node.get('data-playlist-id')):
        acct = node.get('data-account') or '5748441669001'; player = node.get('data-player') or 'default'
        q = f'playlistId={node["data-playlist-id"]}' if node.get('data-playlist-id') else f'videoId={node["data-video-id"]}'
        return f'https://players.brightcove.net/{acct}/{player}_default/index.html?{q}', ('Watch playlist' if node.get('data-playlist-id') else 'Watch video')
    return None, None

def video_default(col):
    ifr = col.find('iframe'); src = ifr.get('src') or ifr.get('data-src') if ifr else None
    v = col.find('video'); vid = col.find(attrs={'data-video-id': True})
    poster = None
    if v is not None and v.get('poster'): poster = v['poster']
    thumb = col.select_one('.cmp-video__thumbnail-img img, img')
    out = ''
    if thumb is not None and img_html(thumb): out += f'<p>{img_html(thumb)}</p>'
    elif poster: out += f'<p><img src="{esc(absurl(poster))}" alt=""></p>'
    if src and 'youtube' in src or (src and 'vimeo' in src): out += f'<p><a href="{esc(absurl(src))}">{esc(absurl(src))}</a></p>'
    elif vid is not None:
        acct = vid.get('data-account') or '5748441669001'; out += f'<p><a href="https://players.brightcove.net/{esc(acct)}/default_default/index.html?videoId={esc(vid["data-video-id"])}">Watch video</a></p>'
    return out

def handle_generic(col, page, name):
    UNMAPPED[name] += 1
    h = rich(col, allow_headings=True)
    if clean_text(re.sub('<[^>]+>', '', h)) or '<img' in h: page.add_default(h, bg_of(col))

COMPONENT_TYPE = {'component-railCard': 'rightRailItem', 'component-pageList': 'pageList', 'component-calltoaction': 'callToAction', 'component-textcomp': 'text', 'component-rte': 'text', 'component-downloads': 'downloads', 'component-image': 'image', 'component-faq': 'faq', 'component-boxLink': 'boxLink'}
def convert_column(col, page, inherited_style=''):
    t = col_type(col)
    if t.startswith('component-'): t = COMPONENT_TYPE.get(t, t[len('component-'):])
    if t in ('background-component', 'container') and col.find(class_='component-column') is not None and col.find(class_='aem-Grid') is None:
        # bare column row inside a background/container wrapper (DesignWare PHP pages): the column layouts apply
        if handle_column(col, page): return
    cls = ' '.join(col.get('class') or [])
    if 'cmp-experiencefragment--topnav' in str(col.get('class')): return
    if t in ('experiencefragment',):
        xf = col.find(class_='cmp-experiencefragment')
        xcls = ' '.join(xf.get('class') or []) if xf else ''
        if 'contact-us' in xcls:
            b = col.find(class_='componentSkinnyBanner')
            if b is not None: handle_banner(col, page)
            return
        if any(k in xcls for k in ('topnav', 'footer', 'chatbot', 'ask-synopsys')): return
        for sub in grid_children(xf or col): convert_column(sub, page)
        COVERAGE['experiencefragment'] += 1; return
    if t == 'anchor':
        a = col.find(class_='component-anchor'); aid = (a.get('id') if a else None) or col.get('id')
        if aid: page.set_anchor(aid)
        return
    if t == 'breadcrumb':
        items = col.select('nav > ul > li > a.parent') or col.select('nav ul > li > a')
        if items:
            lis = ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></li>' for a in items)
            page.add_block(block_table('breadcrumbs', [[f'<ul>{lis}</ul>']])); COVERAGE['breadcrumbs'] += 1
        return
    if t == 'banner': handle_banner(col, page) or handle_generic(col, page, t); return
    if t == 'blogBanner': handle_blogbanner(col, page) or handle_generic(col, page, t); return
    if t == 'pageTitle':
        h = col.find(['h1', 'h2'])
        if h is not None:
            tag = 'h1' if not page.h1_used else 'h2'; page.h1_used = page.h1_used or tag == 'h1'
            page.add_default(f'<{tag}>{esc(clean_text(h.get_text(" ")))}</{tag}>'); COVERAGE['pageTitle'] += 1
        return
    if t == 'tableOfContents': handle_toc(col, page) or handle_generic(col, page, t); return
    if t in ('text', 'richTextEditor'): handle_text(col, page) or handle_generic(col, page, t); return
    if t == 'column': handle_column(col, page); return
    if t == 'keyBenefits':
        page.add_block(block_table('cards benefits', kb_rows(col.select('.cmp-key-benefits'))), bg_of(col)); COVERAGE['cards benefits'] += 1; return
    if t in ('carousel', 'dynamicCards', 'contentCarousel'):
        before = len(page.sections); cur_items = len(page.cur['items']) if page.cur else 0
        handle_carousel(col, page) or handle_generic(col, page, t)
        if t == 'dynamicCards':
            for sct in page.sections[max(0, before - 1):]:
                sct['items'] = [re.sub(r'class="(cards asset|carousel resources|cards blog|carousel blog)"', r'class="\1 feed"', x) if x.startswith('<div class="') else x for x in sct['items']]
        return
    if t in ('cards',):
        sols = col.select('.component-solutioncard')
        if sols: page.add_block(block_table('cards pillars', [solution_card_row(c) for c in sols]), bg_of(col)); COVERAGE['cards pillars'] += 1; return
        cards = col.select('.component-assetcard, .component-card-b')
        if cards: handle_cards_grid(cards, page, bg_of(col))
        else: handle_generic(col, page, t)
        return
    if t == 'cardContainer':
        cards = col.select('.component-assetcard, .component-card-b, .component-eventcard')
        if cards and 'component-eventcard' not in (cards[0].get('class') or []): handle_cards_grid(cards, page, bg_of(col)); return
        # generic: each card col → a cards row of its default HTML
        cols = col.select('.card-col')
        cols = [cc for cc in cols if 'snps-col-divider' not in ' '.join(cc.get('class') or [])]
        rows = [[convert_inline_column(cc, page) if not grid_children(cc) else ''.join(convert_inline_column(s, page) for s in grid_children(cc))] for cc in cols]
        rows = [r for r in rows if clean_text(re.sub('<[^>]+>', '', r[0])) or '<img' in r[0]]
        if rows: page.add_block(block_table('cards tiles', rows), bg_of(col)); COVERAGE['cards tiles'] += 1
        return
    if t == 'boxLink' or t == 'boxLinkContainer':
        boxes = col.select('.component-boxLink'); rows = []
        for b in boxes:
            lab = b.select_one('.topLabel'); links = b.select('.dropdown-link a')
            rows.append([box_label_html(lab), '<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></li>' for a in links) + '</ul>'])
        if rows: page.add_block(block_table('box-links', rows), bg_of(col)); COVERAGE['box-links'] += 1
        return
    if t == 'floatingTabs':
        rows = []
        for tab in col.select('.floating-tab'):
            title = tab.select_one('.tab-header-title'); body = tab.select_one('.tab-body')
            inner = ''.join(convert_inline_column(s, page) for s in grid_children(body)) if body is not None else ''
            rows.append([f'<p><strong>{esc(clean_text(title.get_text()))}</strong></p>' if title else '', inner])
        if rows: page.add_block(block_table('tabs', rows), bg_of(col)); COVERAGE['tabs'] += 1
        return
    if t == 'faq':
        rows = []
        for it in col.select('.accordion-list .item'):
            q = it.select_one('.title h4, .title h3, .title'); d = it.select_one('.detail')
            rows.append([f'<p><strong>{esc(clean_text(q.get_text(" ")))}</strong></p>' if q else '', rich(d, allow_headings=False) if d else ''])
        if rows: page.add_block(block_table('accordion', rows), bg_of(col)); COVERAGE['accordion'] += 1
        return
    if t == 'quote':
        q = col.select_one('.quote-text'); at = col.select('.quote-attribution'); img = col.select_one('.quote-img img')
        cell = (f'<p>{esc(clean_text(q.get_text()))}</p>' if q else '') + ('<p>' + ' | '.join(esc(clean_text(a.get_text())) for a in at) + '</p>' if at else '')
        rows = [[cell]] + ([[img_html(img)]] if img is not None and img_html(img) else [])
        page.add_block(block_table('quote', rows), bg_of(col)); COVERAGE['quote'] += 1; return
    if t == 'logoCarousel':
        imgs = [s.find('img') for s in col.select('.slick-slide') if 'slick-cloned' not in ' '.join(s.get('class') or [])] or col.select('img')
        seen = set(); cells = []
        for im in imgs:
            if im is None: continue
            k = biggest_src(im)
            if k in seen: continue
            seen.add(k); a = im.find_parent('a')
            cells.append((f'<a href="{esc(localize(a.get("href")))}">' if a is not None and a.get('href') else '') + img_html(im) + ('</a>' if a is not None and a.get('href') else ''))
        if cells: page.add_block(block_table('logos', [[c] for c in cells]), bg_of(col)); COVERAGE['logos'] += 1
        return
    if t in ('imageTextCta', 'textImage2Column', 'mediaLinkTile'):
        sec = col.find(class_=re.compile('component-(imageTextCta|text-image-2-column|mediaLinkTile)'))
        img_col = col.select_one('.img-col'); text_col = col.select_one('.text-col') or (col.select_one('[class*="col-sm-8"]') if col.select_one('[class*="col-sm-8"]') else None)
        img_first = True
        if img_col is not None and 'col-sm-push-6' in ' '.join(img_col.get('class') or []): img_first = False
        ih = ''.join(f'<p>{img_html(i)}</p>' for i in (img_col.select('img') if img_col else []) if img_html(i)) or video_default(img_col) if img_col else ''
        th = rich(text_col, allow_headings=True) if text_col is not None else rich(col, allow_headings=True)
        cells = [ih, th] if img_first else [th, ih]
        half = text_col is not None and 'col-sm-6' in ' '.join(text_col.get('class') or [])
        page.add_block(block_table('columns media' + (' half' if half else '') + ('' if img_first else ' image-right'), [cells]), bg_of(col)); COVERAGE['columns media'] += 1; return
    if t == 'contentTile':
        a = col.find('a'); img = col.select_one('img'); date = col.select_one('.content-tile-date-desktop'); typ = col.select_one('.content-tile-type'); title = col.select_one('.content-tile-title')
        cell = ''
        if typ: cell += f'<p><strong>{esc(clean_text(typ.get_text()))}</strong></p>'
        if title: cell += f'<h3><a href="{esc(localize(a.get("href")))}">{esc(clean_text(title.get_text()))}</a></h3>' if a is not None and a.get('href') else f'<h3>{esc(clean_text(title.get_text()))}</h3>'
        if date: cell += f'<p>{esc(clean_text(date.get_text()))}</p>'
        page.add_block(block_table('cards news', [[img_html(img), cell] if img is not None and img_html(img) else [cell]]), bg_of(col)); COVERAGE['cards news'] += 1; return
    if t == 'video' or (t in ('htmlTextOnly', 'text', 'embed') and (col.find('video') is not None or col.find(attrs={'data-video-id': True}) is not None or col.find(attrs={'data-playlist-id': True}) is not None)):
        href, label = video_link(col)
        if href:
            thumb = col.select_one('.cmp-video__thumbnail-img img, img'); poster = (col.find('video') or {}).get('poster') if col.find('video') else None
            pimg = img_html(thumb) if thumb is not None and img_html(thumb) else (f'<img src="{esc(absurl(poster))}" alt="">' if poster else '')
            rows = ([[f'<p>{pimg}</p>']] if pimg else []) + [[f'<p><a href="{esc(href)}">{esc(label)}</a></p>']]
            page.add_block(block_table('video', rows), bg_of(col)); COVERAGE['video'] += 1; return
        h = video_default(col)
        if h: page.add_default(h, bg_of(col)); COVERAGE['video'] += 1
        return
    if t == 'image':
        im = col.find('img')
        if im is not None and img_html(im):
            a = im.find_parent('a')
            ih = f'<a href="{esc(localize(a.get("href")))}">{img_html(im)}</a>' if a is not None and a.get('href') and not a.get('href').startswith(('#', 'javascript:')) else img_html(im)
            page.add_default(f'<p>{ih}</p>', bg_of(col)); COVERAGE['image'] += 1
        return
    if t in ('subscriptionForm', 'marketoFormsContainer', 'marketoForm'):
        # text column (title/description) → default content; the form → form block (labels + submit)
        wrap = col.select_one('.component-marketo-form-container, .cmp-subscription-form')
        wcls = ' '.join(wrap.get('class') or []) if wrap is not None else ''
        form_style = 'purple' if 'purpleGradient' in wcls else ('dark' if 'darkGrey' in wcls or 'darkGradient' in wcls or 'blackGradient' in wcls else bg_of(col))
        text_col = col.select_one('.text-col')
        if text_col is not None:
            page.add_default(rich(text_col, allow_headings=True).replace('<h1>', '<h1>' if not page.h1_used else '<h2>').replace('</h1>', '</h1>' if not page.h1_used else '</h2>'), form_style)
            page.h1_used = True
        form_title = col.select_one('.form-title, .form-col .title, .marketo-form-title') or next((x for x in col.select('.component-marketo-form-container .title, .cmp-subscription-form .title') if x.find_parent(class_='text-col') is None and clean_text(x.get_text())), None)
        wrap = col.select_one('.component-marketo-form-container, .cmp-subscription-form')
        wcls = ' '.join(wrap.get('class') or []) if wrap is not None else ''
        form_style = 'purple' if 'purpleGradient' in wcls else ('dark' if 'darkGrey' in wcls or 'darkGradient' in wcls or 'blackGradient' in wcls else bg_of(col))
        labels = [clean_text(l.get_text()).rstrip(':').replace('*', '').strip() for l in col.select('label.mktoLabel')]
        labels = [l for l in labels if l]
        submit = col.select_one('button.mktoButton, .mktoButton')
        rows = [[f'<p><strong>{esc(clean_text(form_title.get_text()))}</strong></p>' if form_title else '<p><strong>Register</strong></p>']]
        rows += [[f'<p>{esc(l)}</p>'] for l in labels] or [['<p>Business Email</p>'], ['<p>First Name</p>'], ['<p>Last Name</p>'], ['<p>Company</p>'], ['<p>Country/Region</p>']]
        rows.append([f'<p><strong>{esc(clean_text(submit.get_text()) if submit else "Submit")}</strong></p>'])
        page.add_block(block_table('form', rows), form_style); COVERAGE['form'] += 1; return
    if t == 'blogsDev' and col.select_one('.cmp-blogsdev[data-blogsdev-type="categoryPage"]'):
        # category listing (source: JS-paged feed; the server-rendered items are the fallback rows)
        items = col.select('.cmp-blogsdev__mra-item-container')
        rows = [mra_card_row(x) for x in items[:60]]
        page.add_block(block_table('listing', rows or [['<p>Loading…</p>']])); COVERAGE['listing'] += 1; return
    if t == 'blogsDev' and col.select_one('.cmp-blogsdev[data-blogsdev-type="mostRecentArticles"][data-page-type="category"]'):
        return  # duplicate of the category listing on category pages
    if t == 'blogsDev':
        hd = col.find(['h2', 'h3'])
        if 'browseByTagsHolder' in cls or (hd is not None and clean_text(hd.get_text()).lower().startswith('browse by tags')) or len(col.select('.cmp-blogsdev__pagetags-container a')) > 25: return
        tags = col.select('.cmp-blogsdev__pagetags-container a')
        head = col.find(['h2', 'h3']); p = col.select_one('p')
        h = ''
        if head is not None: h += f'<h2>{esc(clean_text(head.get_text()))}</h2>'
        if p is not None and clean_text(p.get_text()): h += f'<p>{esc(clean_text(p.get_text()))}</p>'
        if tags and head is None and p is None:
            # page tag chips (source ul.cmp-blogsdev__pagetags-container) → `tags` block
            page.add_block(block_table('tags', [['<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></li>' for a in tags if clean_text(a.get_text())) + '</ul>']]), bg_of(col)); COVERAGE['tags'] += 1; return
        if tags: h += '<p>' + ('Tags: ' if head is None else '') + ', '.join(f'<a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a>' for a in tags) + '</p>'
        if h: page.add_default(h); COVERAGE['tags'] += 1
        return
    if t == 'table':
        h = rich(col, allow_headings=True)
        if h: page.add_default(h, bg_of(col)); COVERAGE['table'] += 1
        return
    if t == 'pageList' or col.select_one('.component-pageList') is not None and t in ('pageList', 'column'):
        pl = col.select_one('.component-pageList') or col
        ttl = pl.select_one('h2, h3, h4, .title')
        items = [a for a in pl.select('ul.pageLinks a[href], a.pageLink[href]') if clean_text(a.get_text())]
        if items:
            h = (f'<p><strong>{esc(clean_text(ttl.get_text(" ")))}</strong></p>' if ttl is not None and clean_text(ttl.get_text()) else '') + '<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text(" ")))}</a></li>' for a in items) + '</ul>'
            page.add_default(h, bg_of(col)); COVERAGE['pageList'] += 1; return
    if t in ('socialShare', 'search', 'separator', 'synopsysContainer', 'topNavAd', 'navList', 'subNavLinks'):
        if t == 'synopsysContainer':
            for sub in grid_children(col): convert_column(sub, page)
        return
    if t == 'list':
        links = col.select('.cmp-list__item-link, .cmp-list__nav-list-item-url')
        groups = col.select('.cmp-list__group-wrapper')
        if groups:
            for g in groups:
                hd = g.select_one('.cmp-list__group-header'); its = g.select('.cmp-list__item-link')
                h = (f'<h3>{esc(clean_text(hd.get_text()))}</h3>' if hd else '') + '<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text(" ")))}</a></li>' for a in its) + '</ul>'
                page.add_default(h)
        elif links:
            page.add_default('<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text(" ")))}</a></li>' for a in links) + '</ul>')
        COVERAGE['list'] += 1; return
    if t == 'htmlTextOnly':
        for s in col.select('style, script, link, noscript, template'): s.decompose()
        inner_cols = col.select('.component-column')
        if inner_cols:
            for ic in inner_cols:
                if ic.find_parent(class_='component-column') is not None and ic.find_parent(class_='component-column') in inner_cols: continue
                wrapper = BeautifulSoup('<div class="column aem-GridColumn"></div>', 'html.parser').div
                wrapper.append(ic.extract()); handle_column(wrapper, page)
            COVERAGE['htmlTextOnly'] += 1; return
        h = rich(col, allow_headings=True)
        txt = clean_text(re.sub('<[^>]+>', '', h))
        if ('<img' in h and txt) or len(txt) >= 120 or col.find('a') is not None and len(txt) >= 40:
            page.add_default(h, bg_of(col)); COVERAGE['htmlTextOnly'] += 1
        else: UNMAPPED['htmlTextOnly-skipped'] += 1
        return
    if t == 'spotlight':
        title = col.select_one('.spotlight-title')
        body_html = ''.join(rich(sub, allow_headings=True) for sub in grid_children(col.select_one('.component-spotlight .row:nth-of-type(2), .component-spotlight') or col))
        body_html = re.sub(r'<h2>\s*</h2>', '', body_html)
        rows = [[f'<h2>{esc(clean_text(title.get_text()))}</h2>' if title is not None else '<p>Definition</p>'], [body_html or '<p></p>']]
        page.add_block(block_table('spotlight', rows), bg_of(col)); COVERAGE['spotlight'] += 1; return
    if t == 'rightRailItem':
        cards = col.select('.component-railCard'); rows = []
        for c in cards:
            flag = c.select_one('.flag .text, .flag a, .flag'); body = c.select_one('.component-text') or c
            head = (f'<p><strong><a href="{esc(localize(flag.get("href")))}">{esc(clean_text(flag.get_text()))}</a></strong></p>' if flag is not None and flag.name == 'a' and flag.get('href') else (f'<p><strong>{esc(clean_text(flag.get_text()))}</strong></p>' if flag is not None else ''))
            links = [a for a in body.select('a') if clean_text(a.get_text()) and a is not flag and a.find_parent(class_='flag') is None]
            lst = '<ul>' + ''.join(f'<li><a href="{esc(localize(a.get("href")))}">{esc(clean_text(a.get_text()))}</a></li>' for a in links) + '</ul>' if links else rich(body, allow_headings=False)
            rows.append([head + lst])
        if rows: page.add_block(block_table('cards rail', rows)); COVERAGE['cards rail'] += 1
        return
    # everything else: default-content extraction, counted as unmapped
    handle_generic(col, page, t or cls[:30])

# ------------------------------------------------------------------ page assembly
def import_page(raw_html, url, page_type=None):
    global PAGES, PAGE_URL
    PAGES += 1; PAGE_URL = url
    soup = BeautifulSoup(raw_html, 'html.parser')
    title = clean_text(soup.title.get_text()) if soup.title else ''
    desc_el = soup.find('meta', attrs={'name': 'description'}); desc = clean_text(desc_el.get('content')) if desc_el else ''
    ogi = soup.find('meta', attrs={'property': 'og:image'}); og_image = ogi.get('content') if ogi else ''
    root = soup.select_one('.root.synopsysContainer') or soup.select_one('.site-content') or soup.body
    page = Page(); page.h1_used = False; page.banner_family = banner_family(soup)
    if not page_type:
        path = url.replace(LIVE, '')
        tmpl = (soup.body.get('data-template') if soup.body else '') or ''
        if tmpl == 'glossary-template': page_type = 'glossary'
        elif tmpl == 'chip-design-author-page': page_type = 'author'
        elif root is not None and root.select_one('.cmp-blogbanner'): page_type = 'article'
        elif root is not None and root.select_one('.component-marketo-form-container, .cmp-subscription-form') and not root.select_one('.cmp-blogbanner'): page_type = 'form'
        elif path in ('', '/', '/index.html'): page_type = 'landing'
        elif re.match(r'^/(blogs/[^/]+\.html|authors\.html|success-stories(/view-all)?\.html|webinars\.html|resources\.html|events\.html|newsroom\.html|articles\.html|glossary\.html)$', path): page_type = 'listing'
        elif re.match(r'^/(company|partners|academic-research|startup-innovation|careers|support|community|services|sitemap|authors/)', path): page_type = 'static'
        else: page_type = 'program' 
    global PAD_TOKENS
    PAD_TOKENS = page_type not in ('landing',)  # every template except the home page carries its authored band padding as section tokens
    top = root.find(class_='aem-Grid') if root else None
    cols = [c for c in (top.find_all(recursive=False) if top else []) if isinstance(c, Tag)]
    if root is not None and 'site-content' in (root.get('class') or []):
        # DesignWare PHP pages (dw/ipdir, dw/doc…): no AEM grid; .site-content > container(breadcrumb) / container(page title) / background-component(column row)
        cols = []
        for c in root.find_all(recursive=False):
            if not isinstance(c, Tag) or c.name in ('br', 'script', 'style'): continue
            if c.find(class_='component-breadcrumb') is not None: c['class'] = ['breadcrumb']       # dispatch as the breadcrumb component
            elif c.find(class_='component-page-title') is not None: c['class'] = ['pageTitle']     # dispatch as the page title (single h1)
            cols.append(c)
        page_type = 'dw'; PAD_TOKENS = True
    for col in cols: convert_column(col, page)
    if page_type == 'listing' and re.match(r'^/(blogs/[^/]+|articles|glossary)\.html$', url.replace(LIVE, '')) and not any('class="listing"' in x for sct in page.sections for x in sct['items']):
        page.new_section(); page.add_block(block_table('listing', [['<p>Most recent</p>']])); COVERAGE['listing'] += 1
    # metadata
    meta_rows = [['<div>Title</div>', f'<div>{esc(title)}</div>'], ['<div>Description</div>', f'<div>{esc(desc)}</div>']]
    # source: the nav row sits transparent over the home banner carousel (nav absolute, white brand/links)
    if soup.select_one('[carousel-type="banner-carousel"]') is not None: meta_rows.append(['<div>Header-Theme</div>', '<div>dark</div>'])
    if page_type == 'dw': meta_rows.append(['<div>Header-Theme</div>', '<div>plain</div>'])  # source PHP pages carry no utility bar
    if page_type: meta_rows.append(['<div>Template</div>', f'<div>{esc(page_type)}</div>'])
    page.template = page_type
    # index metadata for the article family (source: .cmp-blogbanner authors/date/read-time, eyebrow, page tags)
    bb = root.select_one('.cmp-blogbanner') if root is not None else None
    if bb is not None:
        authors = [clean_text(a.get_text()) for a in bb.select('.authors a') if clean_text(a.get_text())]
        if not authors: authors = [clean_text(x.get_text()) for x in bb.select('.authors .author, .author') if clean_text(x.get_text())]
        d = bb.select_one('.date'); rt = bb.select_one('.read-time')
        crumbs = [clean_text(a.get_text()) for a in bb.select('a') if a.find_parent(class_='authors') is None and a.find_parent(class_='author') is None and clean_text(a.get_text())]
        if authors: meta_rows.append(['<div>Author</div>', f'<div>{esc(", ".join(authors))}</div>'])
        if d is not None and clean_text(d.get_text()): meta_rows.append(['<div>Published</div>', f'<div>{esc(clean_text(d.get_text()))}</div>'])
        if rt is not None and clean_text(rt.get_text()): meta_rows.append(['<div>Readtime</div>', f'<div>{esc(clean_text(rt.get_text()))}</div>'])
        if crumbs: meta_rows.append(['<div>Category</div>', f'<div>{esc(" / ".join(crumbs[:2]))}</div>'])
        for cont in root.select('.blogsDev .cmp-blogsdev__pagetags-container'):
            pt = [clean_text(a.get_text()) for a in cont.select('a') if clean_text(a.get_text())]
            if 0 < len(pt) <= 25: meta_rows.append(['<div>Tags</div>', f'<div>{esc(", ".join(dict.fromkeys(pt)))}</div>']); break
    if og_image: meta_rows.append(['<div>Image</div>', f'<div><img src="{esc(absurl(og_image))}" alt=""></div>'])
    meta = '<div class="metadata">' + ''.join('<div>' + ''.join(r) + '</div>' for r in meta_rows) + '</div>'
    out = ['<body>', '  <header></header>', '  <main>', f'    <div>{meta}</div>']
    if not page.h1_used:
        # promote the first h2 in default content to h1 (one h1 per page)
        for s in page.sections:
            for i, it in enumerate(s['items']):
                if '<h2>' in it and not it.startswith('<div class="'):
                    s['items'][i] = it.replace('<h2>', '<h1>', 1).replace('</h2>', '</h1>', 1); page.h1_used = True; break
            if page.h1_used: break
    if not page.h1_used:
        t = re.sub(r'\s*[|–-]\s*Synopsys.*$', '', title).strip() or title
        target = next((s for s in page.sections if s['items'] and not any(x.startswith('<div class="breadcrumbs') or x.startswith('<div class="hero') for x in s['items'])), None)
        h1 = f'<h1>{esc(t)}</h1>'
        if target is None: page.new_section(); page.cur['items'].append(h1)
        elif target['block']: target['items'].insert(0, h1)
        else: target['items'].insert(0, h1)
        page.h1_used = True; COVERAGE['h1-from-title'] += 1
    for s in page.sections:
        if not s['items']: continue
        body = '\n'.join(s['items'])
        meta_kv = []
        if s['style']: meta_kv.append(('style', s['style']))
        if s['anchor']: meta_kv.append(('anchor', s['anchor']))
        if meta_kv: body += '<div class="section-metadata">' + ''.join(f'<div><div>{k}</div><div>{esc(v)}</div></div>' for k, v in meta_kv) + '</div>'
        out.append(f'    <div>\n{body}\n    </div>')
    out += ['  </main>', '  <footer></footer>', '</body>', '']
    return '\n'.join(out), {'title': title, 'sections': len([s for s in page.sections if s['items']]), 'h1': page.h1_used}

def out_path_for(url, out_dir):
    p = url.replace(LIVE, ''); p = re.sub(r'\.html(?=[#?]|$)', '', p) or '/'
    p = slug_path(p).strip('/')
    if not p: p = 'index'
    return os.path.join(out_dir, p + '.html')

if __name__ == '__main__':
    args = sys.argv[1:]; out_dir = 'content'; ptype = None
    if '--out' in args: out_dir = args[args.index('--out') + 1]; args = [a for i, a in enumerate(args) if a != '--out' and args[i - 1] != '--out']
    if '--type' in args: ptype = args[args.index('--type') + 1]; args = [a for i, a in enumerate(args) if a != '--type' and args[i - 1] != '--type']
    index = json.load(open('stardust/raw/_index.json')) if os.path.exists('stardust/raw/_index.json') else {}
    results = {}
    for f in args:
        slug = os.path.basename(f)[:-5]
        rec = index.get(slug, {}); url = rec.get('url') or (LIVE + '/' + slug.replace('__', '/') + '.html')
        html_raw = open(f, encoding='utf-8', errors='ignore').read()
        try:
            frag, info = import_page(html_raw, url, ptype)
        except Exception as e:  # keep the batch going; record the failure
            results[slug] = {'error': str(e)[:200]}; UNMAPPED['IMPORT-ERROR'] += 1; continue
        op = out_path_for(url, out_dir); os.makedirs(os.path.dirname(op), exist_ok=True); open(op, 'w').write(frag)
        results[slug] = {**info, 'out': op}
        if PAGES % 200 == 0: print(f'{PAGES} pages', flush=True)
    json.dump({'pages': PAGES, 'coverage': COVERAGE.most_common(), 'unmapped': UNMAPPED.most_common(), 'results': results}, open('stardust/import-coverage.json', 'w'), indent=1)
    print(json.dumps({'pages': PAGES, 'coverage': dict(COVERAGE), 'unmapped': dict(UNMAPPED)}, indent=0)[:1500])
