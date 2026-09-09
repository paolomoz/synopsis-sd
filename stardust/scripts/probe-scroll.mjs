import { chromium } from 'playwright';
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900},userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'});const p=await ctx.newPage();
await p.goto('https://www.synopsys.com/verification/simulation/vcs.html',{waitUntil:'domcontentloaded'});try{await p.locator('#onetrust-accept-btn-handler').click({timeout:6000})}catch{}
await p.waitForTimeout(1500);
const m=async()=>p.evaluate(()=>{const q=s=>document.querySelector(s);const g=(s)=>{const e=q(s);if(!e)return null;const r=e.getBoundingClientRect();const c=getComputedStyle(e);return [Math.round(r.y+scrollY),Math.round(r.height),c.position,c.top,c.marginTop,c.paddingTop,c.minHeight]};return {scrollY,doc:document.documentElement.scrollHeight,pre:g('.pre-header'),topNav:g('.topNav'),navTop:g('.component-nav-top'),wrapper:g('.nav-top-wrapper'),mainNav:g('nav.main-nav'),logo:g('.nav-top-wrapper .logo'),bc:g('.breadcrumb'),hero:g('.componentSkinnyBanner'),toc:g('.table-of-contents-product-layout'),tocParent:g('.tableOfContents'),firstBand:g('.background-component'),siteWrapper:g('.site-wrapper'),root:g('.root'),bodyCls:document.body.className.trim(),navCls:q('.component-nav-top').className,topNavCls:q('.topNav').className, siteWrapperCls:q('.site-wrapper').className, htmlCls:document.documentElement.className}});
console.log('T0',JSON.stringify(await m()));
await p.evaluate(()=>window.scrollTo(0,700));await p.waitForTimeout(900);console.log('S700',JSON.stringify(await m()));
await p.evaluate(()=>window.scrollTo(0,1500));await p.waitForTimeout(900);console.log('S1500',JSON.stringify(await m()));
await b.close();
