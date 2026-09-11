#!/usr/bin/env python3
"""anchor-context.py <raw-slug> <link-text-regex> — ancestor chain + markup of matching anchors (or headings with --h)"""
import sys, re
from bs4 import BeautifulSoup
slug, pat = sys.argv[1], sys.argv[2]; mode = sys.argv[3] if len(sys.argv) > 3 else 'a'
s = BeautifulSoup(open(f'stardust/raw/{slug}.html', encoding='utf-8', errors='ignore').read(), 'html.parser')
els = [e for e in s.find_all('a' if mode == 'a' else ['h1', 'h2', 'h3', 'h4']) if re.search(pat, e.get_text(' ', strip=True), re.I)]
for e in els[:2]:
    chain = ' < '.join(f"{p.name}.{'.'.join(p.get('class', [])[:3])}" for p in list(e.parents)[:7])
    print(f"## {e.get_text(' ', strip=True)[:50]!r}\n   {chain}\n   {str(e)[:260]}")
