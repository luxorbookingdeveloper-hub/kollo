/* ============================================================================
   كله — Kollo | Money Module: Transactions & Budgets Tabs
   ============================================================================ */

async function renderMoneyTxns(box) {
  const tx = (await R.txns.all()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cats = await R.categories.all(), accs = await R.accounts.all();

  const b1 = document.createElement('button');
  b1.className = 'b p';
  b1.textContent = '＋ معاملة';
  b1.onclick = () => addTxn();
  box.appendChild(b1);

  const c = document.createElement('div');
  c.className = 'card';
  c.style.marginTop = '12px';

  if (!tx.length) {
    c.appendChild(UI.empty('مفيش معاملات', 'ابدأ بأول واحدة.', { label: '＋ معاملة', fn: () => addTxn() }));
  } else {
    const render = t => {
      const li = document.createElement('div');
      li.className = 'li';
      const m = document.createElement('div');
      m.style.flex = '1';
      const a = document.createElement('div');
      a.className = 't';
      a.textContent =
        (t.type === 'income' ? '⬆️ ' : t.type === 'transfer' ? '↔️ ' : '⬇️ ') +
        (t.note || (cats.find(c => c.id === t.categoryId) || {}).name || 'معاملة');
      const b = document.createElement('div');
      b.className = 'xs dim';
      b.textContent =
        relDay(t.date) +
        ' · ' +
        ((accs.find(x => x.id === t.accountId) || {}).name || '—') +
        ((cats.find(c => c.id === t.categoryId) || {}).name ? ' · ' + (cats.find(c => c.id === t.categoryId) || {}).name : '');
      m.append(a, b);

      const v = document.createElement('div');
      v.className = 'num';
      v.style.fontWeight = '800';
      v.style.color = t.type === 'income' ? 'var(--good)' : t.type === 'expense' ? 'var(--bad)' : 'var(--tx-2)';
      v.textContent = money(t.amount);

      const d = document.createElement('button');
      d.className = 'b sm g';
      d.textContent = '🗑️';
      d.setAttribute('aria-label', 'حذف');
      d.onclick = async () => {
        Hist.begin('حذف معاملة');
        await R.txns.softDel(t.id);
        Hist.commit();
        UI.toast(T('del'), { undo: true });
        Router.render();
      };

      li.append(m, v, d);
      return li;
    };

    if (tx.length > 200) c.appendChild(UI.vlist(tx, render, 70));
    else tx.slice(0, 300).forEach(t => c.appendChild(render(t)));
  }
  box.appendChild(c);
}

async function renderMoneyBudgets(box) {
  const st = await budgetStatus(monthKey());
  const b1 = document.createElement('button');
  b1.className = 'b p';
  b1.textContent = '＋ ميزانية للتصنيف';
  b1.onclick = () => setBudgetUI();
  box.appendChild(b1);

  const c = document.createElement('div');
  c.className = 'card pad';
  c.style.marginTop = '12px';

  if (!st.length) {
    c.appendChild(
      UI.empty('مفيش ميزانيات', 'حدّد سقف لكل تصنيف («أكل/مواصلات/إيجار») وهنقولك باقي كام.', {
        label: '＋ ميزانية',
        fn: () => setBudgetUI()
      })
    );
  }

  st.forEach(b => {
    const w = document.createElement('div');
    w.style.marginBottom = '12px';
    const r = document.createElement('div');
    r.className = 'row';
    const l = document.createElement('div');
    l.style.flex = '1';
    l.style.fontWeight = '700';
    l.textContent = b.category;
    const v = document.createElement('div');
    v.className = 'sm num';
    v.textContent = money(b.spent) + ' / ' + money(b.limit);
    const bd = document.createElement('span');
    bd.className = 'badge ' + (b.pct >= 100 ? 'b' : b.pct >= 80 ? 'w' : 'a');
    bd.textContent = fmtN(b.pct, 0) + '٪';
    r.append(l, v, bd);
    w.appendChild(r);

    const p = document.createElement('div');
    p.className = 'prog';
    const i = document.createElement('i');
    i.style.width = clamp(b.pct, 0, 100) + '%';
    if (b.pct >= 100) i.style.background = 'var(--bad)';
    else if (b.pct >= 80) i.style.background = 'var(--warn)';
    p.appendChild(i);
    w.appendChild(p);

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent = b.left >= 0 ? 'باقي ' + money(b.left) + ' للشهر' : 'زودت ' + money(-b.left);
    w.appendChild(s);
    c.appendChild(w);
  });
  box.appendChild(c);
}

Object.assign(window, {
  renderMoneyTxns,
  renderMoneyBudgets
});
