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

const REQUIRED = new Set(['business email', 'email', 'first name', 'last name', 'company', 'country/region', 'state']);
export default async function decorate(block) {
  const rows = [...block.children].map((r) => r.textContent.trim()).filter(Boolean);
  const title = rows.shift() || 'Register';
  const submit = rows.length ? rows.pop() : 'Submit';
  const form = document.createElement('form');
  form.className = 'form-panel';
  form.noValidate = true;
  const h = document.createElement('div');
  h.className = 'form-title';
  h.textContent = title;
  form.append(h);
  const req = document.createElement('p');
  req.className = 'form-required';
  req.innerHTML = 'Required Fields <span>*</span>';
  form.append(req);
  rows.forEach((label, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    const id = `f-${i}-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = `${label}:`;
    const isReq = REQUIRED.has(label.toLowerCase());
    if (isReq) { const s = document.createElement('span'); s.className = 'form-req'; s.textContent = ' *'; lab.append(s); }
    let input;
    if (/country|state|region|industry|job level/i.test(label)) {
      input = document.createElement('select');
      const o = document.createElement('option'); o.textContent = /country/i.test(label) ? 'United States' : 'Select...'; input.append(o);
    } else {
      input = document.createElement('input');
      input.type = /email/i.test(label) ? 'email' : /phone/i.test(label) ? 'tel' : 'text';
    }
    input.id = id; input.name = id; input.required = isReq;
    wrap.append(lab, input);
    form.append(wrap);
  });
  const note = document.createElement('p');
  note.className = 'form-note';
  note.innerHTML = 'By providing your information, you agree to the processing of your personal data for the purposes of providing the activity and for related communications, including cross-border transfers (i.e., Synopsys is a global company) and inter-company and third-party sharing (including our subsidiaries), as detailed in the <a href="/company/legal/privacy-policy">Privacy Notice</a>.';
  form.append(note);
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
    form.replaceChildren(h, ok);
  });
  block.replaceChildren(form);
}
