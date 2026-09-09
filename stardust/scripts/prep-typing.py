#!/usr/bin/env python3
"""prep-typing.py — extract --prep additions: page typing, typed slots, module candidates.

Writes: stardust/state.json (pages[] with type + status extracted),
        per-page `slots` section into stardust/current/pages/<slug>.json,
        stardust/current/_module-candidates.json (merged into DESIGN.json.extensions.modules by write-design).
Typing is LLM/heuristic-inferred from URL pattern + heading shape; user refines later.
"""
import json, glob, os, re, collections, datetime, hashlib

CUR = 'stardust/current'
NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
pages = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(f'{CUR}/pages/*.json'))}

LISTING = {'blogs-chip-design-html', 'authors-html', 'success-stories-html', 'success-stories-view-all-html', 'glossary-html', 'webinars-html', 'resources-html', 'events-html', 'newsroom-html', 'articles-html'}
FORM = {'success-stories-electronics-digital-twins-volvo-cars-html', 'success-stories-intel-self-timed-sram-timing-verification-nanotime-html', 'resources-mastering-ai-chip-complexity-ebook-html', 'webinars-deep-dive-synopsys-ai-html', 'events-virtual-prototyping-day-html'}
UNIQUE = {'index': 'landing', 'authors-sassine-ghazi-html': 'unique', 'sitemap-html': 'unique', 'company-contact-synopsys-office-locations-html': 'unique'}

def page_type(slug, d):
    if slug in UNIQUE: return UNIQUE[slug]
    if slug in LISTING: return 'listing'
    if slug in FORM: return 'form'
    path = d['url'].replace('https://www.synopsys.com', '')
    if re.match(r'^/(blogs/chip-design/|articles/|glossary/)', path): return 'article'
    if re.match(r'^/(company|partners|academic-research|startup-innovation|careers|support|community|services|sitemap)', path): return 'static'
    if re.match(r'^/(solutions|ai|cloud|verification|designware-ip|manufacturing|implementation-and-signoff)', path): return 'program'
    return 'unique'

def strip_chrome(d):
    """Body/headings minus the site chrome (nav labels, footer columns)."""
    CHROME_H = {'Company', 'Resources', 'Trending', 'Learn'}
    heads = [h for h in d['headings'] if not (h['tag'] == 'h3' and h['text'].strip() in CHROME_H)]
    return heads

def big_imgs(d):
    return [i for i in d['media']['imgs'] if (i.get('w') or 0) >= 600 and 'logo' not in (i.get('src') or '')]

def slots_for(t, slug, d):
    heads = strip_chrome(d)
    h1 = next((h['text'] for h in heads if h['tag'] == 'h1'), None)
    h2s = [h['text'] for h in heads if h['tag'] == 'h2']
    h4s = [h['text'] for h in heads if h['tag'] == 'h4']
    body = d['body']
    imgs = big_imgs(d)
    s = {'_provenance': 'inferred', 'basis': 'URL pattern + heading shape + body[] of the live capture'}
    if t == 'article':
        i_cr = h2s.index('Continue Reading') if 'Continue Reading' in h2s else len(h2s)
        date = next((b for b in body if re.search(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2}, \d{4}', b) and len(b) < 60), None)
        s.update({'headline': h1 or d['title'], 'deck': d.get('description'), 'byline': None, 'meta': date, 'lead-image': (imgs[0]['src'] if imgs else None), 'body': {'sections': h2s[:i_cr]}, 'pullquotes': [], 'related': h4s[:3] if 'Continue Reading' in h2s else []})
    elif t == 'listing':
        s.update({'index-headline': h1 or d['title'].split('|')[0].strip(), 'filter-controls': any('Sort by' in b or 'Results per page' in b for b in body), 'card-grid': {'cardTitles': (h4s or h2s)[:12], 'cardCount': len(h4s or h2s), 'subSlots': ['image', 'label', 'title', 'meta', 'link']}})
    elif t == 'program':
        kb = 'Key Benefits' in h2s
        s.update({'program-headline': h1 or d['title'].split('|')[0].strip(), 'summary': d.get('description'), 'hero': 'purple gradient band + optional background image', 'anchor-nav': any(c['label'] == 'Get Started' for c in d['ctas']), 'feature-grid': {'present': kb, 'items': h4s[:6]}, 'sections': h2s, 'cta-band': any(b.strip().lower() == 'connect with us' for b in body)})
    elif t == 'form':
        labels = [b.rstrip(':').strip() for b in body if re.fullmatch(r'(Business Email|First Name|Last Name|Phone|Job Title|Company|Country/Region|State|Email)\s*:?\s*\*?', b.strip())]
        submit = next((c['label'] for c in d['ctas'] if c['label'] and c['label'].strip().lower() in ('submit', 'download', 'register', 'watch now')), None)
        s.update({'headline': h1 or d['title'].split('|')[0].strip(), 'deck': d.get('description'), 'form-title': next((h for h in h2s if h not in ('Agenda', 'Speaker')), None), 'form-fields': labels, 'submit': submit, 'body': {'sections': [h for h in h2s]}})
    elif t == 'landing':
        s.update({'hero-carousel': True, 'tagline': next((h['text'] for h in heads if 'Powering' in h['text']), None), 'sections': h2s, 'cards': h4s[:8], 'partner-logos': [i.get('alt') for i in d['media']['imgs'] if 'partner' in (i.get('src') or '')][:10]})
    else:
        s.update({'headline': h1 or d['title'].split('|')[0].strip(), 'summary': d.get('description'), 'sections': h2s[:20], 'items': h4s[:20]})
    return s

# ---- state.json + slots ----
state_pages = []
type_counts = collections.Counter()
for slug, d in pages.items():
    t = page_type(slug, d); type_counts[t] += 1
    d['slots'] = slots_for(t, slug, d)
    d['pageType'] = t
    json.dump(d, open(f'{CUR}/pages/{slug}.json', 'w'), indent=2)
    state_pages.append({'slug': slug, 'url': d['url'], 'title': d['title'], 'type': t, 'status': 'extracted', 'history': [{'status': 'extracted', 'at': d['fetchedAt']}], 'stale': False, 'staleReason': None, 'currentStatePath': f'{CUR}/pages/{slug}.json', 'prototypePath': None, 'migratedPath': None})
state = {
    '_provenance': {'writtenBy': 'stardust:extract', 'writtenAt': NOW, 'stardustVersion': '0.19.8'},
    'site': {'originUrl': 'https://www.synopsys.com', 'deployUrl': 'https://main--synopsis-sd--paolomoz.aem.live', 'extractedAt': NOW, 'pageCap': 64, 'totalDiscovered': 6679, 'crawled': len(pages), 'discoveryNote': 'sitemap lists 6679 www.synopsys.com URLs (4598 en-US after locale exclusion); prep run scoped to a 64-page representative roster per hands-off volume policy (header/footer-linked pages, section landings, template spread)'},
    'direction': None,
    'handsOff': True,
    'pages': state_pages,
}
os.makedirs('stardust', exist_ok=True)
json.dump(state, open('stardust/state.json', 'w'), indent=2)

# ---- module candidates (signals: headings > CTA labels > css backgrounds > forms > body corroboration) ----
def inst(pred):
    return [s for s, d in pages.items() if pred(s, d)]
def has_h(text, tag=None):
    return lambda s, d: any(h['text'].strip() == text and (tag is None or h['tag'] == tag) for h in d['headings'])
def has_body(text):
    return lambda s, d: any(b.strip().lower() == text.lower() for b in d['body'])
def has_cta(label):
    return lambda s, d: any((c['label'] or '').strip() == label for c in d['ctas'])
cands = [
    ('page-title-hero', 'Purple-gradient page title band with breadcrumb (h1 60/300 white, optional background photo, optional secondary CTA)', 'headings[h1] + cssBackgrounds', lambda s, d: d['pageType'] in ('program', 'static', 'form') and s not in ('company-management-team-html',), [('eyebrow-breadcrumb', 'text'), ('title', 'text'), ('subtitle', 'text'), ('background', 'image'), ('cta', 'link')]),
    ('anchor-nav', 'In-page anchor navigation strip (Overview · Key Benefits · … ) with dark "Get Started" button', 'ctas[Get Started]', has_cta('Get Started'), [('items', 'link[]'), ('cta', 'link')]),
    ('key-benefits', '3-up icon + title + copy feature tiles under an h2 "Key Benefits"', 'headings[h2=Key Benefits]', has_h('Key Benefits', 'h2'), [('heading', 'text'), ('items[].icon', 'image'), ('items[].title', 'text'), ('items[].copy', 'text')]),
    ('whats-new-carousel', 'Resource card carousel (image, type chip, title, date, link) under "What\'s New"', "headings[h2 startswith What's New]", lambda s, d: any(h['text'].strip().startswith("What's New") or h['text'].strip().startswith('What’s New') for h in d['headings']), [('heading', 'text'), ('cards[].image', 'image'), ('cards[].label', 'text'), ('cards[].title', 'text'), ('cards[].date', 'text'), ('cards[].link', 'link')]),
    ('resources-carousel', 'Resource card carousel under h2 "Resources" inside main (white paper / blog chips, Download / Learn More links)', 'headings[h2=Resources]', has_h('Resources', 'h2'), [('heading', 'text'), ('cards[].label', 'text'), ('cards[].title', 'text'), ('cards[].link', 'link')]),
    ('continue-reading', 'Three related-article cards under h2 "Continue Reading" (image, read time, title, author, tags, Read Article link)', 'headings[h2=Continue Reading]', has_h('Continue Reading', 'h2'), [('cards[].image', 'image'), ('cards[].meta', 'text'), ('cards[].title', 'text'), ('cards[].author', 'text'), ('cards[].tags', 'text[]'), ('cards[].link', 'link')]),
    ('connect-with-us-band', 'Full-bleed purple gradient CTA band "Connect with Us" with white outlined Contact Sales button', 'body[Connect with Us] + ctas[Contact Sales]', has_body('Connect with Us'), [('heading', 'text'), ('cta', 'link')]),
    ('gated-asset-form', 'Two-column gated asset: title + summary + "What You\'ll Learn" list left, grey form card right (Business Email, First/Last Name, Phone, Job Title, Company, Country/Region, State, submit)', 'body[Business Email:] + headings[h2 Read Success Story|Watch On-Demand|Download]', lambda s, d: any('Business Email' in b for b in d['body']), [('title', 'text'), ('summary', 'text'), ('learn-list', 'text[]'), ('logo', 'image'), ('form-title', 'text'), ('form-fields', 'field[]'), ('submit', 'text')]),
    ('subscribe-blog-form', 'Blog sidebar: table of contents + "Subscribe to Our Blog" form (Business Email, Country/Region)', 'headings/body[Subscribe to Our Blog]', lambda s, d: any('Subscribe to Our Blog' in b for b in d['body']), [('toc', 'link[]'), ('fields', 'field[]'), ('submit', 'text')]),
    ('icon-tile-grid', 'Grid of purple line-icon tiles: icon, title, copy, purple button (3-col)', 'ctas[Learn More] x>=3 + headings h2/h3 tiles', lambda s, d: sum(1 for c in d['ctas'] if (c['label'] or '').strip() == 'Learn More') >= 3 and d['pageType'] in ('static', 'program'), [('items[].icon', 'image'), ('items[].title', 'text'), ('items[].copy', 'text'), ('items[].cta', 'link')]),
    ('people-grid', 'Portrait grid: photo, name (h2 purple), role, "View Bio | PDF" links', 'headings[h2 person names] + ctas[View Bio]', lambda s, d: sum(1 for c in d['ctas'] if 'View Bio' in (c['label'] or '')) >= 3, [('people[].photo', 'image'), ('people[].name', 'text'), ('people[].role', 'text'), ('people[].links', 'link[]')]),
    ('blog-listing', 'Spotlight card + 8-card grid + faceted "Explore Blogs" list with filters, sort and pagination', 'body[Sort by] + headings[h2 Spotlight/Explore Blogs]', lambda s, d: any('Sort by' in b or 'Results per page' in b for b in d['body']), [('spotlight', 'card'), ('grid', 'card[]'), ('facets', 'filter[]'), ('list', 'card[]'), ('pagination', 'control')]),
    ('partner-logo-row', 'Row of grey partner logos under h2 "Ecosystem Partners"', 'headings[h2=Ecosystem Partners] + imgs[partner-logo]', has_h('Ecosystem Partners', 'h2'), [('heading', 'text'), ('logos[]', 'image')]),
    ('glossary-definition', 'Glossary article: h1 question, "Definition" h2, h6 term list, related start-guide promo', 'headings[h2=Definition]', has_h('Definition', 'h2'), [('question', 'text'), ('definition', 'text'), ('terms[]', 'text'), ('promo', 'card')]),
]
modules = []
for mid, desc, signal, pred, slots in cands:
    ins = inst(pred)
    if len(ins) < 2: continue
    conf = 'high' if signal.startswith('headings') or signal.startswith('ctas') else 'medium'
    modules.append({'id': f'candidate-{hashlib.sha1(mid.encode()).hexdigest()[:6]}', 'name': mid, 'description': desc, 'signal': signal, 'confidence': conf, 'slots': [{'name': n, 'type': t, 'required': False} for n, t in slots], 'instances': [{'slug': s, 'selector': None} for s in ins], 'instanceCount': len(ins), 'status': 'candidate'})
json.dump({'_provenance': {'writtenBy': 'stardust:extract --prep', 'writtenAt': NOW}, 'modules': modules}, open(f'{CUR}/_module-candidates.json', 'w'), indent=2)
print('types:', dict(type_counts))
for m in modules: print(f"  {m['name']:24} {m['instanceCount']:3} {m['confidence']:6} e.g. {[i['slug'] for i in m['instances'][:3]]}")
