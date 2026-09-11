#!/usr/bin/env python3
"""trace-import.py <raw-slug> <live-url> <key-text> — log every handle_*/convert_* call whose column contains the key text."""
import sys, re
slug, url, KEY = sys.argv[1], sys.argv[2], sys.argv[3]; sys.argv = ['x']; sys.path.insert(0, 'stardust/scripts')
import importlib.util
spec = importlib.util.spec_from_file_location('imp', 'stardust/scripts/importer.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def present(page): return any(KEY in x for s in page.sections for x in s['items'])
for name in [n for n in dir(m) if n.startswith(('handle_', 'convert_'))]:
    f = getattr(m, name)
    def wrap(f=f, name=name):
        def w(col, page, *a, **k):
            hit = hasattr(col, 'get_text') and KEY in col.get_text()
            b = len(page.sections); r = f(col, page, *a, **k)
            if hit: print(f'{name:24s} ret={str(r)[:5]:5s} col={" ".join(col.get("class", []))[:45]:45s} sections {b}->{len(page.sections)} present={present(page)}')
            return r
        return w
    setattr(m, name, wrap())
frag, info = m.import_page(open(f'stardust/raw/{slug}.html', encoding='utf-8', errors='ignore').read(), url)
print('KEY in output:', KEY in frag)
