/**
 * form — gated-asset / subscription lead form (source: Marketo forms). The live forms post to Marketo;
 * this block renders the same field set as a real <form> and confirms on submit (no backend on EDS yet —
 * wire `action` to the Marketo/endpoint later). Rows: [p strong title] then one field label per row,
 * last row [p strong submit-label].
 * @ew-exempt <p> field labels + submit — text-as-control (rendered as <label>/<button>)
 */
/**
 * Backend hook: /config/marketo-forms.json carries the source's Marketo munchkin id and the form id(s) per page
 * (from MktoForms2.loadForm in the source). With `endpoint` set, the field payload is POSTed there as JSON;
 * without it (default) no request is made and the block keeps its confirmation-only behaviour.
 */
let configPromise;
const loadConfig = () => {
  configPromise ||= fetch(`${window.hlx?.codeBasePath || ''}/config/marketo-forms.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return configPromise;
};
async function postToBackend(form, block) {
  const cfg = await loadConfig();
  if (!cfg.endpoint) return null;
  const path = window.location.pathname;
  const ids = cfg.forms?.[path] || [];
  const nth = [...document.querySelectorAll('.form.block')].indexOf(block);
  const payload = { munchkinId: cfg.munchkinId, formId: ids[nth] || ids[0] || null, page: window.location.href, fields: Object.fromEntries(new FormData(form).entries()) };
  try {
    const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return res.ok;
  } catch (err) { return false; }
}

const NOTICE = 'By providing your information, you agree to the processing of your personal data for the purposes of providing the activity and for related communications, including cross-border transfers (i.e., Synopsys is a global company) and inter-company and third-party sharing (including our subsidiaries), as detailed in the <a href="/company/legal/privacy-policy">Privacy Notice</a>.';
const REQUIRED = new Set(['business email', 'email', 'first name', 'last name', 'company', 'country/region', 'state']);
export default async function decorate(block) {
  const rows = [...block.children].map((r) => r.textContent.trim()).filter(Boolean);
  const title = rows.shift() || 'Register';
  let submit = rows.length ? rows.pop() : 'Submit';
  // the source renders the Marketo form's real field set at runtime; when the page maps to a known form id, render that
  // set (captured per id in the config) instead of the authored labels — same fields, same order, same height
  let spec = null;
  try {
    const cfg = await loadConfig(); const ids = cfg.forms?.[window.location.pathname] || [];
    const nth = [...document.querySelectorAll('.form.block')].indexOf(block);
    spec = cfg.fields?.[ids[nth] || ids[0]] || null;
    if (spec) { submit = spec.button || submit; block.dataset.formId = ids[nth] || ids[0]; }
  } catch (e) { spec = null; }
  // panel = title (an h2 on the source, outside the Marketo form) + the form itself
  const panel = document.createElement('div');
  panel.className = 'form-panel';
  const h = document.createElement('h2');
  h.className = 'form-title';
  h.textContent = title;
  panel.append(h);
  const form = document.createElement('form');
  form.className = 'form-fields';
  form.noValidate = true;
  const addRequired = () => { const req = document.createElement('p'); req.className = 'form-required'; req.innerHTML = 'Required Fields <span>*</span>'; form.append(req); };
  const addNotice = () => { const note = document.createElement('p'); note.className = 'form-note'; note.innerHTML = NOTICE; form.append(note); };
  if (!spec) addRequired();
  const fieldRows = spec ? spec.rows : rows.map((label) => ({ kind: 'field', label }));
  fieldRows.forEach((row, i) => {
    const sized = (el) => { if (spec && row.h) el.style.minHeight = `${row.h}px`; form.append(el); };
    if (row.kind === 'required') { const req = document.createElement('p'); req.className = 'form-required'; req.innerHTML = 'Required Fields <span>*</span>'; sized(req); return; }
    if (row.kind === 'notice') { const note = document.createElement('p'); note.className = 'form-note'; note.innerHTML = NOTICE; sized(note); return; }
    if (row.kind === 'html') { const p = document.createElement('p'); p.className = 'form-html'; p.textContent = row.text; form.append(p); return; }
    if (row.kind === 'checkbox') { const wrap = document.createElement('div'); wrap.className = 'form-field form-checkbox'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `f-${i}-consent`; cb.name = cb.id; cb.required = !!row.required; const lab = document.createElement('label'); lab.htmlFor = cb.id; lab.textContent = row.label || 'I agree'; wrap.append(cb, lab); sized(wrap); return; }
    const label = row.label;
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    const id = `f-${i}-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = `${label}:`;
    const isReq = spec ? !!row.required : REQUIRED.has(label.toLowerCase());
    if (isReq) { const s = document.createElement('span'); s.className = 'form-req'; s.textContent = ' *'; lab.append(s); }
    let input;
    if (row.type === 'textarea') {
      input = document.createElement('textarea'); input.rows = 2;
    } else if (row.type === 'select' || (!spec && /country|state|region|industry|job level/i.test(label))) {
      input = document.createElement('select');
      const o = document.createElement('option'); o.textContent = /country/i.test(label) ? 'United States' : 'Select...'; input.append(o);
    } else {
      input = document.createElement('input');
      input.type = /email/i.test(label) ? 'email' : /phone/i.test(label) ? 'tel' : 'text';
    }
    input.id = id; input.name = id; input.required = isReq;
    wrap.append(lab, input);
    if (spec && row.h) wrap.style.minHeight = `${row.h}px`;
    form.append(wrap);
  });
  if (!spec) addNotice();
  const btn = document.createElement('button');
  btn.type = 'submit'; btn.className = 'form-submit'; btn.textContent = submit;
  form.append(btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    btn.disabled = true;
    const sent = await postToBackend(form, block);
    const ok = document.createElement('p'); ok.className = 'form-thanks';
    ok.textContent = sent === false ? 'Sorry, your request could not be sent. Please try again later.' : 'Thank you. Your request has been received.';
    form.replaceChildren(ok);
  });
  panel.append(form);
  block.replaceChildren(panel);
}
