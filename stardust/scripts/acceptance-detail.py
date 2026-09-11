#!/usr/bin/env python3
"""acceptance-detail.py <template> <field> [n] — show concrete missing items with their source container for sample pages."""
import sys, json, os, re, html, collections
from bs4 import BeautifulSoup
args = list(sys.argv[1:]); sys.argv = ['x']
sys.path.insert(0, 'stardust/scripts'); import importlib.util
spec = importlib.util.spec_from_file_location('imp', 'stardust/scripts/importer.py'); IMP = importlib.util.module_from_spec(spec); spec.loader.exec_module(IMP)
INDEX = json.load(open('stardust/raw/_index.json')); LIVE = 'https://www.synopsys.com'
tmpl, field, n = args[0], args[1], int(args[2]) if len(args) > 2 else 3
rows = [r for r in json.load(open('stardust/content-acceptance.json'))['rows'] if r.get('template') == tmpl and (r.get(field) if field != 'imageDelta' else r.get('imageDelta', 0) < 0) and (field != 'wordRatio' or (r.get('wordRatio') or 1) < 0.9)]
print(f'{len(rows)} {tmpl} pages with {field}')
def norm(t): return re.sub(r'\s+', ' ', html.unescape(t or '')).strip().lower()
def container(e):
    for p in e.parents:
        cls = ' '.join(p.get('class') or [])
        if re.search(r'component-|cmp-|aem-GridColumn', cls): return cls[:70]
    return '?'
inv = {}
for r in json.load(open('stardust/raw/_index.json')).items(): pass
slug_by_path = {}
for slug, rec in INDEX.items():
    url = rec.get('url') or (LIVE + '/' + slug.replace('__', '/') + '.html'); slug_by_path['/' + IMP.out_path_for(url, 'content')[len('content/'):-5]] = slug
import random; random.seed(1)
for r in random.sample(rows, min(n, len(rows))):
    slug = slug_by_path.get(r['path']); raw = f'stardust/raw/{slug}.html'
    print(f"\n### {r['path']}  src={r['src']} build={r['build']} wordRatio={r.get('wordRatio')}")
    if not os.path.exists(raw): print('  no raw'); continue
    s = BeautifulSoup(open(raw, encoding='utf-8', errors='ignore').read(), 'html.parser')
    root = s.select_one('.root.synopsysContainer') or s.body
    for sel in ['.cmp-experiencefragment--topnav', '.cmp-experiencefragment--chatbot', '.cmp-experiencefragment--footer', 'header.topNav', 'footer', '#legal-overlay', '.slick-cloned', '[data-blogsdev-type="browseByTags"]', '.component-breadcrumb', 'script', 'style']:
        for e in root.select(sel): e.decompose()
    b = open(f"content{r['path']}.html", encoding='utf-8', errors='ignore').read(); btext = norm(BeautifulSoup(b, 'html.parser').get_text(' '))
    if field == 'imageDelta':
        bsrcs = set(re.findall(r'<img[^>]+src="([^"]+)"', b))
        miss = [i for i in root.find_all('img') if i.get('src') and not i['src'].startswith('data:') and html.unescape(i['src']) not in bsrcs and IMP.absurl(html.unescape(i['src'])) not in bsrcs]
        for i in miss[:6]: print('  img', (i.get('src') or '')[:80], '| in', container(i), '| visible-ish:', 'hidden' not in str(i.parent.get('class')))
    elif field in ('droppedLinks', 'unlinked'):
        for h, t in r[field][:6]:
            a = next((a for a in root.find_all('a') if norm(a.get_text(' ')) == t), None)
            print('  link', repr(t)[:40], h[:50], '| in', container(a) if a else '?')
    elif field == 'droppedHeadings':
        for t in r[field][:6]:
            e = next((e for e in root.find_all(['h1', 'h2', 'h3', 'h4']) if norm(e.get_text(' ')) == t), None)
            print('  h', repr(t)[:50], '| in', container(e) if e else '?', '|', (e.name if e else ''))
    elif field == 'wordRatio':
        # largest text blocks in source whose first 60 chars are absent in build
        cands = []
        for e in root.find_all(['p', 'li', 'td', 'div']):
            if e.find(['p', 'li', 'div', 'table']): continue
            t = norm(e.get_text(' '))
            if len(t) > 40 and t[:60] not in btext: cands.append((len(t), t[:70], container(e)))
        for L, t, c in sorted(cands, reverse=True)[:6]: print('  text', L, repr(t), '| in', c)
