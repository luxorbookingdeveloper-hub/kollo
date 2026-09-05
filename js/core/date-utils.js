/* ============================================================================
   كله — Kollo | Core Date & Formatting Utilities
   Egyptian locale formatting, Hijri dates, natural language dates, and money
   ============================================================================ */
var NUMLOC = 'ar-EG-u-nu-latn';

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

Object.assign(window, {
  NUMLOC, ymd, today, addDays, monthKey, startOfMonth, endOfMonth,
  dowAr, monAr, fmtN, money, fmtDate, hijri, relDay, parseNatDate
});
