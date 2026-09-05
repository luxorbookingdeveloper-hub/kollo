/* ============================================================================
   كله — Kollo | Personal Life OS
   Core Utilities: DOM selectors, identifiers, debounce, sleep, and math clamps
   ============================================================================ */
window.Kollo = window.Kollo || {};

const AUTH_ENABLED = false; /* طبقة الدخول متعطلة حاليًا — واجهة بس */
const SCHEMA_VERSION = 1;

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const debounce = (fn, ms) => {
  let t;
  return function() {
    const a = arguments;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, a), ms || 200);
  };
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const dayMs = 86400000;
const pad2 = n => String(n).padStart(2, '0');

function logoSVG(sz) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('width', sz || 28);
  s.setAttribute('height', sz || 28);
  s.setAttribute('viewBox', '0 0 32 32');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<rect x="3" y="5" width="26" height="22" rx="5" fill="var(--accent)"/>' +
    '<rect x="7" y="9" width="12" height="2.6" rx="1.3" fill="var(--on-accent)" opacity=".9"/>' +
    '<rect x="7" y="14" width="16" height="2.6" rx="1.3" fill="var(--on-accent)" opacity=".65"/>' +
    '<rect x="7" y="19" width="9" height="2.6" rx="1.3" fill="var(--on-accent)" opacity=".45"/>' +
    '<path d="M25 3l1.6 3.4L30 8l-3.4 1.6L25 13l-1.6-3.4L20 8l3.4-1.6z" fill="var(--amber)"/>';
  return s;
}

// Bind globals
Object.assign(window, {
  AUTH_ENABLED, SCHEMA_VERSION, $, $$, uid, now, esc, clamp,
  debounce, sleep, dayMs, pad2, logoSVG
});
