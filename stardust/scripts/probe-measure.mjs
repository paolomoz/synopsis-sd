import { chromium } from 'playwright';
const b=await chromium.launch();
for (const [name,url] of [['live','https://www.synopsys.com/verification/simulation/vcs.html'],['deployed','https://main--synopsis-sd--paolomoz.aem.page/verification/simulation/vcs']]) {
 const p=await b.newPage({viewport:{width:360,height:900}}); await p.goto(url,{waitUntil:'domcontentloaded'}); try{await p.locator('#onetrust-accept-btn-handler').click({timeout:5000})}catch{} await p.waitForTimeout(3000);
 console.log(name, JSON.stringify(await p.evaluate(async()=>{await document.fonts.ready; const c=document.createElement('canvas').getContext('2d');
  const fam=getComputedStyle(document.querySelector('.cmp-key-benefits__title, .cards.benefits .cards-card-body p')).fontFamily; c.font=`300 20px ${fam}`;
  const m=s=>Math.round(c.measureText(s).width*10)/10; return {fam, a:m('Planning, Coverage & Execution'), b:m('Planning, Coverage & Execution Management'), c:m('Management Native Integration'), light:[...document.fonts].filter(f=>/roboto/i.test(f.family)&&f.weight==='300').map(f=>f.family+':'+f.status+':'+(f.src||'').slice(-50))};})));
 await p.close();
}
await b.close();
