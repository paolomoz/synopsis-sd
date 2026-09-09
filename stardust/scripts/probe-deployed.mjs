import { chromium } from 'playwright';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:360,height:900}});
await p.goto('https://main--synopsis-sd--paolomoz.aem.page/verification/simulation/vcs',{waitUntil:'networkidle'}); await p.waitForTimeout(2000);
const st=()=>p.evaluate(()=>{const q=s=>document.querySelector(s);const r=e=>{const x=e.getBoundingClientRect();return [Math.round(x.y+scrollY),Math.round(x.height),getComputedStyle(e).position]};return {scrollY,anchor:[q('.anchor-nav').className,...r(q('.anchor-nav'))],wrapperTop:q('.anchor-nav-wrapper').offsetTop,wrapperParent:q('.anchor-nav-wrapper').offsetParent?.tagName+'.'+q('.anchor-nav-wrapper').offsetParent?.className.slice(0,30),navRowH:q('header .nav-row')?.getBoundingClientRect().height,bc:r(q('.breadcrumbs')),hero:r(q('.hero')),kb3:(()=>{const e=[...document.querySelectorAll('.cards.benefits .cards-card-body p')][2];const c=getComputedStyle(e);return {text:JSON.stringify(e.textContent),ff:c.fontFamily,fw:c.fontWeight,fs:c.fontSize,ls:c.letterSpacing,ws:c.wordSpacing,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,wb:c.wordBreak,ow:c.overflowWrap}})()}});
console.log('top',JSON.stringify(await st()));
await p.evaluate(()=>window.scrollTo(0,2000));await p.waitForTimeout(500);await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(800);
console.log('after-scroll-back',JSON.stringify(await st()));
await b.close();
