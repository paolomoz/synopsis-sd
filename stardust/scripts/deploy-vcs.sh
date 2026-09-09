#!/bin/bash
# deploy-vcs.sh — DA delivery of the VCS pilot page + chrome documents (per stardust:deploy
# § Deploy / da-deploy-protocol.md). Requires a FRESH DA_TOKEN in /Users/paolo/.claude/.env.
#   set -a; source /Users/paolo/.claude/.env; set +a; bash stardust/scripts/deploy-vcs.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
ORG=paolomoz; REPO=synopsis-sd; BRANCH=main
CURL=/usr/bin/curl; NODE=$(command -v node)
: "${DA_TOKEN:?DA_TOKEN missing — set -a; source /Users/paolo/.claude/.env; set +a}"
auth=(-H "Authorization: Bearer $DA_TOKEN")

echo "== 0. token smoke test"
code=$($CURL -s -o /dev/null -w '%{http_code}' "${auth[@]}" "https://admin.da.live/list/$ORG/$REPO/")
[ "$code" = "200" ] || { echo "DA_TOKEN rejected ($code) — re-login at https://da.live and refresh DA_TOKEN"; exit 1; }

echo "== 1. media: key-benefit icons → DA /media"
for f in star-purple automate-purple native-integration-purple; do
  c=$($CURL -s -o /dev/null -w '%{http_code}' -X PUT "${auth[@]}" -F "data=@stardust/prototypes/assets/icons/$f.svg.imgo.svg;type=image/svg+xml" \
      "https://admin.da.live/source/$ORG/$REPO/media/icons/$f.svg"); echo "  $f → $c"
done
# re-point authored icons at DA media and regenerate content
python3 - <<'EOF'
p='stardust/scripts/eds-content.py'; s=open(p).read()
s=s.replace("MEDIA = 'https://www.synopsys.com/content/dam/synopsys'","MEDIA = 'https://content.da.live/paolomoz/synopsis-sd/media'")
s=s.replace("('star-purple.svg.imgo.svg'","('star-purple.svg'").replace("('automate-purple.svg.imgo.svg'","('automate-purple.svg'").replace("('native-integration-purple.svg.imgo.svg'","('native-integration-purple.svg'")
s=s.replace('{MEDIA}/icon/{f}','{MEDIA}/icons/{f}')
open(p,'w').write(s)
EOF
python3 stardust/scripts/eds-content.py

echo "== 2. gates"
$NODE scripts/deploy/localize-links.mjs --source-host www.synopsys.com --content content >/dev/null
$NODE scripts/deploy/localize-links.mjs --source-host www.synopsys.com --content content --check
$NODE scripts/deploy/davids-model-lint.mjs content/ | tail -1

echo "== 3. force code sync + wait for blocks on the branch host"
$CURL -sS -o /dev/null -w '  code sync %{http_code}\n' -X POST "${auth[@]}" "https://admin.hlx.page/code/$ORG/$REPO/$BRANCH/*"
until $CURL -s --compressed "https://$BRANCH--$REPO--$ORG.aem.page/blocks/anchor-nav/anchor-nav.js" | grep -q 'anchor-nav-strip'; do sleep 3; done; echo "  blocks live"

echo "== 4. write + preview + publish"
for P in nav footer verification/simulation/vcs; do
  $NODE scripts/deploy/sanitise.js "content/$P.html"
  put=$($CURL -sS -o /dev/null -w '%{http_code}' -X PUT "${auth[@]}" -F "data=@content/$P.html;type=text/html" "https://admin.da.live/source/$ORG/$REPO/$P.html")
  prev=$($CURL -sS -o /dev/null -w '%{http_code}' -X POST "${auth[@]}" "https://admin.hlx.page/preview/$ORG/$REPO/$BRANCH/$P")
  live=$($CURL -sS -o /dev/null -w '%{http_code}' -X POST "${auth[@]}" "https://admin.hlx.page/live/$ORG/$REPO/$BRANCH/$P")
  echo "  $P: put=$put preview=$prev live=$live"
done

echo "== 5. delivered-page asserts"
U="https://$BRANCH--$REPO--$ORG.aem.page/verification/simulation/vcs"
plain=$($CURL -s "$U.plain.html"); echo "  h1 count: $(grep -o '<h1' <<<"$plain" | wc -l | tr -d ' ')  about:error: $(grep -c 'about:error' <<<"$plain" || true)  imgs: $(grep -o '<img' <<<"$plain" | wc -l | tr -d ' ')"
$NODE -e "
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('$U',{waitUntil:'networkidle'});await p.waitForTimeout(2000);
console.log(JSON.stringify(await p.evaluate(()=>({sections:document.querySelectorAll('main .section').length,tinted:document.querySelectorAll('main .section.tinted').length,anchors:[...document.querySelectorAll('main .section[id]')].map(s=>s.id),blocks:[...document.querySelectorAll('[data-block-name]')].map(b=>b.dataset.blockName+':'+b.dataset.blockStatus),cardsGrid:getComputedStyle(document.querySelector('.cards.benefits > ul')).display,columnsFlex:getComputedStyle(document.querySelector('.columns.features > div')).display,brokenImgs:[...document.images].filter(i=>i.naturalWidth===0||i.clientWidth===0).map(i=>i.src.slice(0,80)),h1:document.querySelectorAll('h1').length}))));
console.log('pageerrors',errs);await b.close();})()"
echo "== done: $U  (live: https://$BRANCH--$REPO--$ORG.aem.live/verification/simulation/vcs)"
