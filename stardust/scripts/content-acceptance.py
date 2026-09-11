#!/usr/bin/env python3
"""content-acceptance.py — per-page content-count acceptance (replica Phase 5 § Content-count acceptance).
Static role inventory of the SOURCE page (stardust/raw/<slug>.html, chrome + JS-only panels excluded) vs the IMPORTED
document (content/<path>.html): headings, links, images, words. Writes stardust/content-acceptance.json and prints a
summary by template. No browser: runs over every page in minutes."""
import sys, os, re, json, html, glob, collections
from multiprocessing import Pool
from bs4 import BeautifulSoup
try:
    import lxml; PARSER = 'lxml'
except ImportError: PARSER = 'html.parser'
sys.argv = ['x']; sys.path.insert(0, 'stardust/scripts')
import importlib.util
spec = importlib.util.spec_from_file_location('imp', 'stardust/scripts/importer.py'); IMP = importlib.util.module_from_spec(spec); spec.loader.exec_module(IMP)
INDEX = json.load(open('stardust/raw/_index.json'))
LIVE = 'https://www.synopsys.com'
# source chrome / JS-only / hidden containers (not authored page content)
EXCLUDE = ['.cmp-experiencefragment--topnav', '.cmp-experiencefragment--chatbot', '.cmp-experiencefragment--footer', 'header.topNav', '.topNav',
           'footer', '#legal-overlay', '.slick-cloned', '.ui-helper-hidden-accessible', '.sr-only', 'script', 'style', 'noscript', 'template',
           '.pre-header', '.search-header', '.utility-nav', '[data-blogsdev-type="browseByTags"]', '[data-blogsdev-type="mostRecentArticles"]',
           '.component-breadcrumb', '.cmp-breadcrumb', 'iframe', 'svg', '.navList',
           '.component-search-result',   # blog sub-nav = Coveo atomic search interface (JS-only, registered residual)
           '.zoom-container',            # lightbox duplicate of an inline figure
           '.cmp-dynamiccards',          # "Continue Reading" JS feed (rebuilt from the query index on EDS)
           'img[src*="_jcr_content/"]']  # AEM rendition duplicates of the same figure

def norm(t): return re.sub(r'\s+', ' ', html.unescape(t or '')).strip().lower()
def nhref(h):
    h = (h or '').strip()
    if not h or h.startswith(('#', 'javascript:', 'mailto:', 'tel:')): return None
    h = h.replace(LIVE, '').replace('http://www.synopsys.com', '')
    h = re.sub(r'\.html(?=$|[?#])', '', h); h = h.split('#')[0].split('?')[0]
    if h.startswith('/'):
        h = IMP.slug_path(h) if hasattr(IMP, 'slug_path') else h
        h = h.rstrip('/') or '/'
    return h.lower()

def container(e):
    for p in e.parents:
        cls = ' '.join(p.get('class') or [])
        m = re.search(r'(component-[a-zA-Z-]+|cmp-[a-zA-Z-]+|navList|pageList|railCard|text|column|carousel|calltoaction)', cls)
        if m: return m.group(1)
    return '?'

def inventory(soup, root):
    for sel in EXCLUDE:
        for e in root.select(sel): e.decompose()
    heads = [norm(h.get_text(' ')) for h in root.find_all(['h1', 'h2', 'h3', 'h4']) if norm(h.get_text(' '))]
    links = {}; lctn = {}
    for a in root.find_all('a'):
        h = nhref(a.get('href')); t = norm(a.get_text(' '))
        if h and (t or a.find('img')): links.setdefault(h, t); lctn.setdefault(h, container(a))
    hctn = {norm(h.get_text(' ')): container(h) for h in root.find_all(['h1', 'h2', 'h3', 'h4'])}
    imgs = {re.sub(r'[?#].*$', '', (i.get('src') or '').strip()) for i in root.find_all('img') if (i.get('src') or '').strip() and not (i.get('src') or '').startswith('data:')}
    text = norm(root.get_text(' '))
    return {'headings': heads, 'links': links, 'images': len(imgs), 'words': len(text.split()), 'text': text, 'lctn': lctn, 'hctn': hctn}

def source_inventory(path):
    soup = BeautifulSoup(open(path, encoding='utf-8', errors='ignore').read(), PARSER)
    root = soup.select_one('.root.synopsysContainer') or soup.select_one('.site-content') or soup.body or soup
    return inventory(soup, root)

def build_inventory(path):
    soup = BeautifulSoup(open(path, encoding='utf-8', errors='ignore').read(), PARSER)
    root = soup.find('main') or soup
    for e in root.select('.metadata, .section-metadata'): e.decompose()
    tmpl = None
    m = re.search(r'<div>Template</div>\s*<div>([a-z-]+)</div>', open(path, encoding='utf-8', errors='ignore').read())
    if m: tmpl = m.group(1)
    inv = inventory(soup, root); inv['template'] = tmpl or 'program'; return inv

def one(raw):
    slug = os.path.basename(raw)[:-5]
    rec = INDEX.get(slug, {}); url = rec.get('url') or (LIVE + '/' + slug.replace('__', '/') + '.html')
    cdir = os.environ.get('CONTENT_DIR', 'content')
    cpath = IMP.out_path_for(url, cdir)
    web = '/' + cpath[len(cdir) + 1:-5]
    if not os.path.exists(cpath): return {'path': web, 'error': 'no imported document'}
    try:
        S = source_inventory(raw); B = build_inventory(cpath)
    except Exception as e:
        return {'path': web, 'error': str(e)[:120]}
    btext = B['text']; bheads = set(B['headings'])
    missing_heads = [h for h in S['headings'] if h not in bheads]
    dropped = [h for h in missing_heads if h not in btext]          # text gone entirely
    retagged = [h for h in missing_heads if h in btext]              # present as other role
    missing_links = [(h, t, S['lctn'].get(h, '?')) for h, t in S['links'].items() if h not in B['links'] and (t and t in btext or not t)]
    missing_link_text = [(h, t, S['lctn'].get(h, '?')) for h, t in S['links'].items() if h not in B['links'] and t and t not in btext]
    dropped = [(h, S['hctn'].get(h, '?')) for h in dropped]
    return {'path': web, 'template': B['template'],
            'src': {'headings': len(S['headings']), 'links': len(S['links']), 'images': S['images'], 'words': S['words']},
            'build': {'headings': len(B['headings']), 'links': len(B['links']), 'images': B['images'], 'words': B['words']},
            'droppedHeadings': dropped[:12], 'retaggedHeadings': retagged[:12],
            'unlinked': missing_links[:15], 'droppedLinks': missing_link_text[:15],
            'wordRatio': round(B['words'] / S['words'], 3) if S['words'] else None,
            'imageDelta': B['images'] - S['images']}

if __name__ == '__main__':
    raws = sorted(f for f in glob.glob('stardust/raw/*.html') if not os.path.basename(f).startswith('_'))
    if len(sys.argv) > 1 and sys.argv[1].isdigit(): raws = raws[:int(sys.argv[1])]
    with Pool(max(2, os.cpu_count() - 2)) as pool: rows = pool.map(one, raws, chunksize=8)
    json.dump({'parser': PARSER, 'pages': len(rows), 'rows': rows}, open(os.environ.get('ACCEPTANCE_OUT', 'stardust/content-acceptance.json'), 'w'), indent=0)
    ok = [r for r in rows if 'error' not in r]
    by = collections.defaultdict(list)
    for r in ok: by[r['template']].append(r)
    print(f"pages {len(rows)}  errors {len(rows)-len(ok)}  parser {PARSER}")
    print(f"{'template':10s} {'pages':>5s} {'dropH':>6s} {'retagH':>6s} {'unlinked':>8s} {'dropLink':>8s} {'img<':>5s} {'words<0.9':>9s}")
    for t, rs in sorted(by.items(), key=lambda x: -len(x[1])):
        print(f"{t:10s} {len(rs):5d} {sum(1 for r in rs if r['droppedHeadings']):6d} {sum(1 for r in rs if r['retaggedHeadings']):6d} {sum(1 for r in rs if r['unlinked']):8d} {sum(1 for r in rs if r['droppedLinks']):8d} {sum(1 for r in rs if r['imageDelta'] < 0):5d} {sum(1 for r in rs if (r['wordRatio'] or 1) < 0.9):9d}")
    dh = collections.Counter(h for r in ok for h, _ in r['droppedHeadings']); print('\ntop dropped headings:', dh.most_common(10))
    dhc = collections.Counter(c for r in ok for _, c in r['droppedHeadings']); print('dropped headings by container:', dhc.most_common(8))
    dlc = collections.Counter(c for r in ok for _, _, c in r['droppedLinks']); print('dropped links by container:', dlc.most_common(10))
    ulc = collections.Counter(c for r in ok for _, _, c in r['unlinked']); print('unlinked by container:', ulc.most_common(8))
    dl = collections.Counter(t for r in ok for _, t, _ in r['droppedLinks']); print('top dropped link texts:', dl.most_common(10))
