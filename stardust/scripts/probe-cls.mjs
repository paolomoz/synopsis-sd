import { chromium } from 'playwright';
const url='https://main--synopsis-sd--paolomoz.aem.page/verification/simulation/vcs';
const b=await chromium.launch();
for (const w of [1440,360]) {
  const ctx=await b.newContext({viewport:{width:w,height:900}});
  // slow the font + nav fetches to reproduce a slow-network swap
  await ctx.route(/fonts\/.*\.woff2|\/nav\.plain\.html|\/footer\.plain\.html/, async (route)=>{ await new Promise(r=>setTimeout(r,1500)); route.continue(); });
  const p=await ctx.newPage();
  await p.addInitScript(()=>{ window.__cls=0; window.__shifts=[]; new PerformanceObserver((l)=>{for(const e of l.getEntries()){ if(!e.hadRecentInput){ window.__cls+=e.value; window.__shifts.push({v:Math.round(e.value*1000)/1000, src:(e.sources||[]).map(s=>s.node&&(s.node.className||s.node.tagName)).slice(0,2)}); } }}).observe({type:'layout-shift',buffered:true}); });
  await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(4000);
  console.log(w, JSON.stringify(await p.evaluate(()=>({cls:Math.round(window.__cls*1000)/1000, shifts:window.__shifts.slice(0,8)}))));
  await ctx.close();
}
await b.close();
