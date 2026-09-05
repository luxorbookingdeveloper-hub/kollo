/* ============================================================================
   كله — Kollo | Core Helpers: Finance & Expense Calculations
   ============================================================================ */

async function txnsBetween(a, b) {
  return R.txns.byIndex('date', IDBKeyRange.bound(a, b));
}

async function budgetStatus(mk) {
  const buds = (await R.budgets.all()).filter(b => b.month === mk);
  const cats = await R.categories.all();
  const tx = await txnsBetween(mk + '-01', mk + '-31');
  const out = [];
  for (const b of buds) {
    const spent = tx
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((s, t) => s + Math.abs(+t.amount || 0), 0);
    const c = cats.find(c => c.id === b.categoryId);
    out.push({
      id: b.id,
      category: c ? c.name : '—',
      categoryId: b.categoryId,
      amount: +b.amount || 0,
      limit: +b.amount || 0,
      spent,
      pct: b.amount ? Math.round(spent / b.amount * 100) : 0,
      left: (+b.amount || 0) - spent
    });
  }
  return out.sort((x, y) => y.pct - x.pct);
}

async function netWorth() {
  const acc = await R.accounts.all();
  const tx = await R.txns.all();
  const bal = {};
  acc.forEach(a => bal[a.id] = +a.opening || 0);

  tx.forEach(t => {
    const v = +t.amount || 0;
    if (t.type === 'income') bal[t.accountId] = (bal[t.accountId] || 0) + v;
    else if (t.type === 'expense') bal[t.accountId] = (bal[t.accountId] || 0) - Math.abs(v);
    else if (t.type === 'transfer') {
      bal[t.accountId] = (bal[t.accountId] || 0) - Math.abs(v);
      if (t.toAccountId) bal[t.toAccountId] = (bal[t.toAccountId] || 0) + Math.abs(v);
    }
  });

  const debts = await R.debts.all();
  const owe = debts.filter(d => d.dir === 'owe' && d.status !== 'closed').reduce((s, d) => s + (+d.remaining || +d.amount || 0), 0);
  const lent = debts.filter(d => d.dir === 'lent' && d.status !== 'closed').reduce((s, d) => s + (+d.remaining || +d.amount || 0), 0);
  const assets = acc.reduce((s, a) => s + (bal[a.id] || 0), 0);
  return {
    accounts: acc.map(a => ({ id: a.id, name: a.name, type: a.type, balance: bal[a.id] || 0 })),
    cash: assets,
    owe,
    lent,
    net: assets + lent - owe
  };
}

const CAT_HINTS = {
  'قهوة': 'أكل وشرب', 'كافيه': 'أكل وشرب', 'اكل': 'أكل وشرب', 'أكل': 'أكل وشرب', 'غدا': 'أكل وشرب',
  'عشا': 'أكل وشرب', 'سوبر ماركت': 'أكل وشرب', 'مواصلات': 'مواصلات', 'اوبر': 'مواصلات', 'تاكسي': 'مواصلات',
  'مترو': 'مواصلات', 'بنزين': 'مواصلات', 'ايجار': 'إيجار', 'إيجار': 'إيجار', 'كهربا': 'فواتير', 'غاز': 'فواتير',
  'نت': 'فواتير', 'مياه': 'فواتير', 'تليفون': 'فواتير', 'دوا': 'صحة', 'دكتور': 'صحة', 'صيدلية': 'صحة',
  'سيجارة': 'متنوع', 'هدية': 'هدايا', 'قسط': 'أقساط', 'اشتراك': 'اشتراكات', 'مدرسة': 'تعليم', 'كورس': 'تعليم', 'سينما': 'ترفيه'
};

async function ensureCategory(name, kind) {
  const cats = await R.categories.all();
  let c = cats.find(x => x.name === name);
  if (c) return c;
  return R.categories.add({ name, kind: kind || 'expense' });
}

async function defaultAccount() {
  const acc = await R.accounts.all();
  if (acc.length) return acc[0];
  return R.accounts.add({ name: 'كاش', type: 'cash', opening: 0 });
}

function parseExpenses(text) {
  const norm = String(text || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const parts = norm.split(/[،,\n]|(?:\s+و(?=\d|\s))/).map(s => s.trim()).filter(Boolean);
  const out = [];
  parts.forEach(p => {
    const m = p.match(/(-?\d+(?:[.,]\d+)?)/);
    if (!m) return;
    const amount = Math.abs(parseFloat(m[1].replace(',', '.')));
    const label = p.replace(m[1], '').replace(/جنيه|ج\.م|جنية|EGP/gi, '').trim() || 'مصروف';
    let cat = 'متنوع';
    for (const k in CAT_HINTS) {
      if (label.includes(k)) {
        cat = CAT_HINTS[k];
        break;
      }
    }
    out.push({ label, amount, category: cat });
  });
  return out;
}

Object.assign(window, {
  txnsBetween, budgetStatus, netWorth, CAT_HINTS, ensureCategory, defaultAccount, parseExpenses
});
