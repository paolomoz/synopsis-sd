import { chromium } from 'playwright';
const b=await chromium.launch();
for (const width of [1440,360]) {
const ctx=await b.newContext({viewport:{width,height:900},userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'});const p=await ctx.newPage();
await p.goto('https://www.synopsys.com/verification/simulation/vcs.html',{waitUntil:'domcontentloaded'});try{await p.locator('#onetrust-accept-btn-handler').click({timeout:6000})}catch{}
await p.waitForTimeout(1200);
console.log(width, JSON.stringify(await p.evaluate(()=>{const q=s=>document.querySelector(s);const r={};
 const path=q('.nav-top-wrapper .logo svg path'); r.logoFill=path?getComputedStyle(path).fill:null; r.logoAttr=path?path.getAttribute('fill'):null; r.logoSvgFill=q('.nav-top-wrapper .logo svg')?getComputedStyle(q('.nav-top-wrapper .logo svg')).fill:null; r.logoColor=getComputedStyle(q('.nav-top-wrapper .logo')).color;
 const bc=q('.component-breadcrumb ul'); r.bcHTML=bc?bc.innerHTML.replace(/<ul class="dropdown-menu".*?<\/ul>/gs,'<ul.dropdown-menu/>').replace(/\s+/g,' ').slice(0,900):null;
 const li2=q('.component-breadcrumb ul > li:nth-child(2)'); r.li2=li2?{cls:li2.className,display:getComputedStyle(li2).display,text:li2.textContent.trim().slice(0,30)}:null;
 const arrow=q('.component-breadcrumb .icon-dropdown-arrow'); r.arrow=arrow?getComputedStyle(arrow).display:null;
 const a2=q('.component-breadcrumb li + li a.parent'); r.a2Before=a2?getComputedStyle(a2,'::before').content+' '+getComputedStyle(a2,'::before').fontSize+' '+getComputedStyle(a2,'::before').color:null;
 const tog=q('.navbar-toggler'); r.togChildren=tog?[...tog.children].map(c=>c.tagName+'.'+String(c.className.baseVal||c.className)+'|'+getComputedStyle(c).display):null;
 r.ell=[...document.querySelectorAll('.component-breadcrumb li')].map(l=>String(l.className)+'|'+getComputedStyle(l).display+'|'+l.textContent.trim().slice(0,12));
 return r;})));
await ctx.close();}
await b.close();
