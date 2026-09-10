#!/usr/bin/env python3
"""fetch-all.py — bulk-fetch the en-US inventory (server-rendered AEM HTML) with a browser UA.
Writes stardust/raw/<slug>.html + stardust/raw/_index.json (url, slug, status, final, bytes, title). Resumable."""
import json, os, re, sys, time, urllib.request, urllib.error, concurrent.futures, html
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
inv=[l.strip() for l in open('stardust/inventory.txt') if l.strip()]
idx_path='stardust/raw/_index.json'
index=json.load(open(idx_path)) if os.path.exists(idx_path) else {}
def slugify(u):
    p=u.replace('https://www.synopsys.com','').strip('/'); p=re.sub(r'\.html$','',p)
    return 'index' if not p else re.sub(r'[^a-z0-9_-]+','-',p.lower().replace('/','__')).strip('-')
def fetch(u):
    slug=slugify(u)
    if slug in index and index[slug].get('status')==200: return slug,index[slug]
    req=urllib.request.Request(u,headers={'User-Agent':UA,'Accept':'text/html,application/xhtml+xml','Accept-Language':'en-US,en;q=0.9'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=45) as r:
                body=r.read(); final=r.geturl(); status=r.status
            text=body.decode('utf-8','ignore')
            t=re.search(r'<title>(.*?)</title>',text,re.S); title=html.unescape(t.group(1).strip()) if t else ''
            open(f'stardust/raw/{slug}.html','w',encoding='utf-8').write(text)
            return slug,{'url':u,'status':status,'final':final,'bytes':len(body),'title':title[:120]}
        except urllib.error.HTTPError as e:
            return slug,{'url':u,'status':e.code,'final':u,'bytes':0,'title':''}
        except Exception as e:
            if attempt==2: return slug,{'url':u,'status':0,'final':u,'bytes':0,'title':'','error':str(e)[:100]}
            time.sleep(2*(attempt+1))
done=0; t0=time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
    for slug,rec in ex.map(fetch,inv):
        index[slug]=rec; done+=1
        if done%100==0:
            json.dump(index,open(idx_path,'w'),indent=0); print(f'{done}/{len(inv)} {time.time()-t0:.0f}s',flush=True)
json.dump(index,open(idx_path,'w'),indent=0)
import collections; print('done',done,collections.Counter(r['status'] for r in index.values()))
