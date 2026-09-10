/**
 * delayed.js — third-party tags (Adobe Launch / Data Layer, OneTrust) from /config/third-party.json.
 * Loaded only when the hostname is listed in `production.hosts`; on aem.live / aem.page / localhost nothing is requested.
 */
async function loadThirdParty() {
  try {
    const res = await fetch(`${window.hlx.codeBasePath}/config/third-party.json`);
    if (!res.ok) return;
    const cfg = await res.json();
    const hosts = cfg.production?.hosts || [];
    if (!hosts.includes(window.location.hostname)) return;
    window.adobeDataLayer = window.adobeDataLayer || [];
    const add = (src, attrs = {}) => { if (!src) return; const s = document.createElement('script'); s.src = src; s.async = true; Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v)); document.head.append(s); };
    if (cfg.oneTrust?.src) add(cfg.oneTrust.src, { 'data-domain-script': cfg.oneTrust.domainScript || '', charset: 'UTF-8' });
    add(cfg.adobeLaunch?.src);
  } catch (e) { /* config unavailable: stay first-party only */ }
}
loadThirdParty();
