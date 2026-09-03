/* ============================================================================
   كله — Kollo | Personal Life OS
   Core Utilities: dates, money, fuzzy search, uuid, debounce, sanitize
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

const ymd = d => {
  d = d ? new Date(d) : new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
};

const today = () => ymd();
const addDays = (d, n) => ymd(new Date(new Date(d || today()).getTime() + n * dayMs));
const monthKey = d => String(d || today()).slice(0, 7);
const startOfMonth = d => monthKey(d) + '-01';
const endOfMonth = d => {
  const [y, m] = monthKey(d).split('-').map(Number);
  return ymd(new Date(y, m, 0));
};

const dowAr = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
const monAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

let NUMLOC = 'ar-EG-u-nu-latn';

function fmtN(n, d) {
  try {
    return new Intl.NumberFormat(NUMLOC, { maximumFractionDigits: d == null ? 2 : d }).format(Number(n) || 0);
  } catch (e) {
    return String(n);
  }
}

function money(n, cur) {
  const c = cur || (window.S && window.S.settings && window.S.settings.currency ? window.S.settings.currency : 'EGP');
  try {
    return new Intl.NumberFormat(NUMLOC, { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(Number(n) || 0);
  } catch (e) {
    return fmtN(n) + ' ' + c;
  }
}

function fmtDate(d, opt) {
  if (!d) return '—';
  const dt = new Date(d);
  try {
    return new Intl.DateTimeFormat(NUMLOC, Object.assign({ day: 'numeric', month: 'short', year: 'numeric' }, opt || {})).format(dt);
  } catch (e) {
    return ymd(dt);
  }
}

function hijri(d) {
  try {
    const f = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    return f.format(new Date(d || Date.now()));
  } catch (e) {
    return null;
  }
}

function relDay(d) {
  const t = today();
  if (d === t) return 'النهاردة';
  if (d === addDays(t, 1)) return 'بكرة';
  if (d === addDays(t, -1)) return 'إمبارح';
  if (d === addDays(t, 2)) return 'بعد بكرة';
  const diff = Math.round((new Date(d) - new Date(t)) / dayMs);
  if (diff > 0 && diff < 7) return dowAr[new Date(d).getDay()] + ' الجاي';
  if (diff < 0 && diff > -7) return 'فاتت بـ' + fmtN(-diff, 0) + ' يوم';
  return fmtDate(d);
}

function fuzzy(q, s) {
  q = String(q || '').trim().toLowerCase();
  s = String(s || '').toLowerCase();
  if (!q) return 1;
  const norm = x => x.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْ]/g, '');
  q = norm(q);
  s = norm(s);
  if (s.includes(q)) return 2 - (s.indexOf(q) / (s.length + 1));
  let i = 0, sc = 0;
  for (const ch of s) {
    if (ch === q[i]) {
      i++;
      sc += 1;
    }
    if (i === q.length) break;
  }
  return i === q.length ? .5 + sc / (s.length * 4) : 0;
}

/* Markdown-lite sanitizer: بنبني DOM بإيدينا، ممنوع innerHTML لأي محتوى من المستخدم/الموديل */
function mdLite(text) {
  const wrap = document.createElement('div');
  wrap.className = 'md';
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  let i = 0;

  const inline = (el, s) => {
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\[[^\]]+\]\])/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) el.appendChild(document.createTextNode(s.slice(last, m.index)));
      const t = m[0];
      let n;
      if (t.startsWith('**')) {
        n = document.createElement('strong');
        n.textContent = t.slice(2, -2);
      } else if (t.startsWith('`')) {
        n = document.createElement('code');
        n.textContent = t.slice(1, -1);
      } else if (t.startsWith('[[')) {
        n = document.createElement('a');
        n.textContent = t.slice(2, -2);
        n.href = '#/notes?q=' + encodeURIComponent(t.slice(2, -2));
      } else {
        n = document.createElement('em');
        n.textContent = t.slice(1, -1);
      }
      el.appendChild(n);
      last = m.index + t.length;
    }
    if (last < s.length) el.appendChild(document.createTextNode(s.slice(last)));
    return el;
  };

  while (i < lines.length) {
    const L = lines[i];
    if (/^```/.test(L)) {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      code.textContent = buf.join('\n');
      pre.appendChild(code);
      wrap.appendChild(pre);
      continue;
    }
    if (/^\s*[-*]\s+/.test(L)) {
      const ul = document.createElement('ul');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const li = document.createElement('li');
        inline(li, lines[i].replace(/^\s*[-*]\s+/, ''));
        ul.appendChild(li);
        i++;
      }
      wrap.appendChild(ul);
      continue;
    }
    if (/^#{1,4}\s+/.test(L)) {
      const lvl = L.match(/^#+/)[0].length;
      const h = document.createElement('h' + Math.min(4, lvl + 2));
      h.style.fontWeight = '800';
      inline(h, L.replace(/^#+\s+/, ''));
      wrap.appendChild(h);
      i++;
      continue;
    }
    if (!L.trim()) {
      i++;
      continue;
    }
    const p = document.createElement('p');
    inline(p, L);
    wrap.appendChild(p);
    i++;
  }
  return wrap;
}

/* پارسر تواريخ مصري */
function parseNatDate(txt) {
  const s = String(txt || '').trim();
  const t = today();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const map = [
    ['بعد بكرة', 2], ['بعد بكره', 2], ['اول امبارح', -2], ['أول امبارح', -2],
    ['النهاردة', 0], ['اليوم', 0], ['بكرة', 1], ['بكره', 1], ['غدا', 1],
    ['امبارح', -1], ['إمبارح', -1], ['أمس', -1]
  ];
  for (const [k, v] of map) {
    if (s.includes(k)) return addDays(t, v);
  }
  let m = s.match(/بعد\s+(\d+)\s*(يوم|ايام|أيام)/);
  if (m) return addDays(t, +m[1]);
  m = s.match(/بعد\s+(\d+)\s*(اسبوع|أسبوع|اسابيع|أسابيع)/);
  if (m) return addDays(t, 7 * +m[1]);
  if (/(الاسبوع|الأسبوع)\s*(الجاي|القادم)/.test(s)) return addDays(t, 7);
  if (/(اخر|آخر)\s*(الشهر|الشهر ده)/.test(s)) return endOfMonth(t);
  if (/(الشهر)\s*(الجاي|القادم)/.test(s)) {
    const d = new Date(t);
    d.setMonth(d.getMonth() + 1);
    return ymd(d);
  }
  for (let i = 0; i < 7; i++) {
    if (s.includes(dowAr[i])) {
      const cur = new Date(t).getDay();
      let diff = (i - cur + 7) % 7;
      if (diff === 0) diff = 7;
      return addDays(t, diff);
    }
  }
  const d = new Date(s);
  return isNaN(d) ? null : ymd(d);
}

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
  debounce, sleep, dayMs, pad2, ymd, today, addDays, monthKey,
  startOfMonth, endOfMonth, dowAr, monAr, NUMLOC, fmtN, money,
  fmtDate, hijri, relDay, fuzzy, mdLite, parseNatDate, logoSVG
});
