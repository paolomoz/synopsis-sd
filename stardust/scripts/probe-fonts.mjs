import { chromium } from 'playwright';
const b=await chromium.launch();
for (const w of [1440,360]) {
 const p=await b.newPage({viewport:{width:w,height:900}});
 await p.goto('https://main--synopsis-sd--paolomoz.aem.page/verification/simulation/vcs',{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
 console.log(w, JSON.stringify(await p.evaluate(async()=>{await document.fonts.ready; const faces=[...document.fonts].map(f=>f.family+'/'+f.weight+':'+f.status); const links=[...document.querelectorAll?[]:document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href.split('/').slice(-2).join('/'));
  const meas=(fam)=>{const s=document.createElement('span');s.style.cssText=`position:absolute;font:300 48px ${fam};white-space:nowrap`;s.textContent='VCS: Functional Verification Solution';document.body.append(s);const w=s.getBoundingClientRect().width;s.remove();return Math.round(w)};
  return {faces,links,h1:getComputedStyle(document.querySelector('h1')).fontFamily,wRoboto:meas('roboto'),wFallback:meas('roboto-fallback'),wArial:meas('Arial'),wBogus:meas('__nofont__'),sessionFlag:sessionStorage.getItem('fonts-loaded')};})));
 await p.close();
}
await b.close();
