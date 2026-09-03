/* ============================================================================
   كله — Kollo | Module: Money (الفلوس)
   Accounts, Transactions, Budgets, Debts, Subscriptions, Gam3iya, and Zakat
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.money = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'overview';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';
  seg.setAttribute('role', 'tablist');
  [
    ['overview', 'نظرة عامة'],
    ['txns', 'المعاملات'],
    ['budgets', 'الميزانية'],
    ['debts', 'ديون وسلف'],
    ['subs', 'اشتراكات وأقساط'],
    ['gam3ia', 'الجمعية'],
    ['zakat', 'زكاة']
  ].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/money?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  const disc = document.createElement('div');
  disc.className = 'card pad xs muted';
  disc.style.marginBottom = '12px';
  disc.textContent = 'تنويه: المعلومات دي تنظيمية بس، وأنا مش مستشار مالي.';
  box.appendChild(disc);

  const nw = await netWorth();

  if (tab === 'overview') {
    const k = document.createElement('div');
    k.className = 'grid g3';
    [
      ['الكاش والحسابات', money(nw.cash)],
      ['عليّ', money(nw.owe)],
      ['ليّ', money(nw.lent)],
      ['الصافي', money(nw.net)]
    ].forEach(([l, v]) => {
      const c = document.createElement('div');
      c.className = 'card kpi';
      const a = document.createElement('div');
      a.className = 'xs dim';
      a.textContent = l;
      const b = document.createElement('b');
      b.textContent = v;
      c.append(a, b);
      k.appendChild(c);
    });
    box.appendChild(k);

    const mk = monthKey();
    const tx = await txnsBetween(mk + '-01', mk + '-31');
    const cats = await R.categories.all();
    const exp = tx.filter(t => t.type === 'expense');
    const byCat = await WK.call({
      op: 'agg',
      rows: exp.map(t => ({
        k: (cats.find(c => c.id === t.categoryId) || {}).name || 'متنوع',
        v: Math.abs(+t.amount || 0)
      }))
    });

    const c1 = document.createElement('div');
    c1.className = 'card pad';
    c1.style.marginTop = '12px';
    const h1 = document.createElement('div');
    h1.style.fontWeight = '800';
    h1.textContent = 'مصاريف ' + monAr[+mk.slice(5) - 1] + ' بالتصنيف';
    c1.appendChild(h1);

    if (byCat.length) {
      c1.appendChild(Chart.donut(byCat.map(x => ({ l: x.k, v: x.v }))));
      const lg = document.createElement('div');
      lg.className = 'row wrap';
      lg.style.marginTop = '8px';
      byCat.slice(0, 8).forEach(x => {
        const s = document.createElement('span');
        s.className = 'chip';
        s.textContent = x.k + ' · ' + money(x.v);
        lg.appendChild(s);
      });
      c1.appendChild(lg);
    } else {
      c1.appendChild(
        UI.empty('مفيش معاملات الشهر ده', 'سجّل أول مصروف — أو قول للأسطى "صرفت ٤٥ قهوة".', {
          label: '＋ معاملة',
          fn: () => addTxn()
        })
      );
    }
    box.appendChild(c1);

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today(), -i);
      days.push({
        l: String(+d.slice(8)),
        v: (await txnsBetween(d, d)).filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(+t.amount || 0), 0)
      });
    }

    const c2 = document.createElement('div');
    c2.className = 'card pad';
    c2.style.marginTop = '12px';
    const h2 = document.createElement('div');
    h2.style.fontWeight = '800';
    h2.textContent = 'آخر ٣٠ يوم';
    c2.appendChild(h2);
    c2.appendChild(Chart.line(days));
    box.appendChild(c2);

    const fc = document.createElement('div');
    fc.className = 'card pad sm';
    fc.style.marginTop = '12px';
    const m6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k2 = monthKey(ymd(d));
      m6.push((await txnsBetween(k2 + '-01', k2 + '-31')).filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(+t.amount || 0), 0));
    }
    const avg = m6.reduce((a, b) => a + b, 0) / (m6.filter(Boolean).length || 1);
    fc.textContent = 'توقّع الشهر الجاي (متوسط آخر ٦ شهور): ' + money(avg) + ' — رقم تقديري من بياناتك بس.';
    box.appendChild(fc);

    const btn = document.createElement('button');
    btn.className = 'b p';
    btn.style.marginTop = '12px';
    btn.textContent = '＋ معاملة';
    btn.onclick = () => addTxn();
    box.appendChild(btn);

    const parse = document.createElement('button');
    parse.className = 'b';
    parse.style.marginTop = '12px';
    parse.textContent = '📝 سجّل بالكلام';
    parse.onclick = () => quickExpenses();
    box.appendChild(parse);
  } else if (tab === 'txns') {
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
  } else if (tab === 'budgets') {
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
  } else if (tab === 'debts') {
    box.appendChild(await collectionView('debts', { emptyTitle: 'مفيش ديون ولا سلف', emptyText: 'الحمد لله — أو سجّل اللي عليك/ليك.' }));
  } else if (tab === 'subs') {
    const g = document.createElement('div');
    g.className = 'grid';
    g.appendChild(await collectionView('subscriptions', { emptyTitle: 'مفيش اشتراكات' }));
    g.appendChild(await collectionView('installments', { emptyTitle: 'مفيش أقساط' }));
    box.appendChild(g);
  } else if (tab === 'gam3ia') {
    const b1 = document.createElement('button');
    b1.className = 'b p';
    b1.textContent = '＋ جمعية';
    b1.onclick = () => openEditor('gam3iyat', null);
    box.appendChild(b1);

    const gs = await R.gam3iyat.all();
    const c = document.createElement('div');
    c.className = 'grid g2';
    c.style.marginTop = '12px';

    if (!gs.length) {
      c.appendChild(
        UI.empty('مفيش جمعيات', 'سجّل الجمعية: القسط، عدد الأعضاء، ودورك — وهنحسبلك.', {
          label: '＋ جمعية',
          fn: () => openEditor('gam3iyat', null)
        })
      );
    }

    gs.forEach(g2 => {
      const cc = document.createElement('div');
      cc.className = 'card pad';
      const t = document.createElement('div');
      t.style.fontWeight = '800';
      t.textContent = g2.name;
      cc.appendChild(t);

      const total = (+g2.amount || 0) * (+g2.members || 0);
      const myMonth = g2.startDate && g2.myTurn ? addDays(g2.startDate, 30 * (+g2.myTurn - 1)) : null;
      const paid = (g2.rounds || []).length;
      const info = document.createElement('div');
      info.className = 'sm muted';
      info.textContent =
        'القسط ' +
        money(g2.amount) +
        ' × ' +
        fmtN(g2.members, 0) +
        ' عضو = ' +
        money(total) +
        ' في دورك' +
        (myMonth ? ' · دورك تقريبًا ' + fmtDate(myMonth) : '') +
        ' · دفعت ' +
        fmtN(paid, 0) +
        ' دور من ' +
        fmtN(g2.members, 0);
      cc.appendChild(info);

      const p = document.createElement('div');
      p.className = 'prog';
      p.style.marginTop = '8px';
      const i = document.createElement('i');
      i.style.width = clamp(g2.members ? (paid / g2.members) * 100 : 0, 0, 100) + '%';
      p.appendChild(i);
      cc.appendChild(p);

      const b = document.createElement('button');
      b.className = 'b sm';
      b.style.marginTop = '8px';
      b.textContent = 'سجّل دور';
      b.onclick = async () => {
        Hist.begin('دور جمعية');
        const rounds = (g2.rounds || []).concat([{ date: today(), amount: +g2.amount || 0 }]);
        await R.gam3iyat.patch(g2.id, { rounds });
        const acc = await defaultAccount();
        const cat = await ensureCategory('جمعية');
        await R.txns.add({
          date: today(),
          amount: +g2.amount || 0,
          type: 'expense',
          accountId: acc.id,
          categoryId: cat.id,
          note: 'جمعية: ' + g2.name
        });
        Hist.commit();
        UI.toast('اتسجّل الدور واتخصم من ' + acc.name, { undo: true });
        Router.render();
      };
      cc.appendChild(b);
      c.appendChild(cc);
    });
    box.appendChild(c);
  } else if (tab === 'zakat') {
    const c = document.createElement('div');
    c.className = 'card pad';
    const h = document.createElement('div');
    h.style.fontWeight = '800';
    h.textContent = 'حاسبة الزكاة (٢.٥٪)';
    c.appendChild(h);

    const p = document.createElement('p');
    p.className = 'sm muted';
    p.textContent = 'دي حسبة رقمية بسيطة على المبلغ اللي إنت تدخله. مش فتوى — لو محتاج تفصيل ارجع لشيخ/مفتي.';
    c.appendChild(p);

    const inp = document.createElement('input');
    inp.className = 'in';
    inp.type = 'number';
    inp.placeholder = 'المبلغ الخاضع للزكاة';
    c.appendChild(inp);

    const out = document.createElement('div');
    out.className = 'num';
    out.style.cssText = 'font-weight:800;font-size:1.3rem;margin-top:8px';
    out.textContent = money(0);
    inp.oninput = () => (out.textContent = money((+inp.value || 0) * 0.025));
    c.appendChild(out);

    const sug = document.createElement('div');
    sug.className = 'xs dim';
    sug.textContent = 'المقترح = المبلغ × ٢.٥٪. الحساب ظاهر بالمعادلة عشان تتأكد بنفسك.';
    c.appendChild(sug);
    box.appendChild(c);
  }
  return box;
};

async function addTxn() {
  const accs = await R.accounts.all();
  const cats = await R.categories.all();
  UI.form({
    title: 'معاملة جديدة',
    fields: [
      {
        k: 'type',
        l: 'النوع',
        t: 'select',
        opts: [
          { v: 'expense', l: 'مصروف' },
          { v: 'income', l: 'دخل' },
          { v: 'transfer', l: 'تحويل' }
        ]
      },
      { k: 'amount', l: 'المبلغ', t: 'money', req: true },
      { k: 'date', l: 'التاريخ', t: 'date', req: true },
      {
        k: 'accountId',
        l: 'الحساب',
        t: 'select',
        opts: accs.length ? accs.map(a => ({ v: a.id, l: a.name })) : [{ v: '', l: '(هنعمل حساب "كاش")' }]
      },
      // Logical Bug Fix: Support toAccountId for transfer
      {
        k: 'toAccountId',
        l: 'إلى حساب (في حالة التحويل)',
        t: 'select',
        opts: [{ v: '', l: '—' }].concat(accs.map(a => ({ v: a.id, l: a.name })))
      },
      {
        k: 'categoryId',
        l: 'التصنيف',
        t: 'select',
        opts: [{ v: '', l: '—' }].concat(cats.map(c => ({ v: c.id, l: c.name })))
      },
      { k: 'newCategory', l: 'أو تصنيف جديد', t: 'text' },
      { k: 'note', l: 'ملاحظة/إيصال', t: 'text' }
    ],
    values: { date: today(), type: 'expense' },
    onSave: async v => {
      Hist.begin('معاملة');
      const acc = v.accountId ? { id: v.accountId } : await defaultAccount();
      let catId = v.categoryId;
      if (!catId && v.newCategory) catId = (await ensureCategory(v.newCategory)).id;
      await R.txns.add({
        type: v.type,
        amount: Math.abs(+v.amount || 0),
        date: v.date,
        accountId: acc.id,
        toAccountId: v.type === 'transfer' ? (v.toAccountId || null) : null,
        categoryId: catId || null,
        note: v.note
      });
      Hist.commit();
      UI.toast(T('save'), { undo: true });
      Router.render();
    }
  });
}

async function quickExpenses() {
  const b = document.createElement('div');
  const p = document.createElement('p');
  p.className = 'sm muted';
  p.textContent = 'اكتب زي ما بتتكلم: «قهوة ٤٥، مواصلات ٢٠ و نت ٣٠٠» — وهنقسّمها لتصنيفات.';
  b.appendChild(p);

  const ta = document.createElement('textarea');
  ta.className = 'in';
  ta.rows = 4;
  b.appendChild(ta);

  const prev = document.createElement('div');
  prev.className = 'sm';
  b.appendChild(prev);

  ta.oninput = () => {
    const items = parseExpenses(ta.value);
    prev.textContent = items.length
      ? items.map(i => i.label + ' → ' + money(i.amount) + ' (' + i.category + ')').join(' · ')
      : '—';
  };

  UI.sheet({
    title: 'سجّل بالكلام',
    body: b,
    actions: [
      { label: 'إلغاء' },
      {
        label: 'سجّل الكل',
        kind: 'p',
        fn: async () => {
          const items = parseExpenses(ta.value);
          if (!items.length) {
            UI.toast('مش لاقي مبالغ في النص');
            return false;
          }
          Hist.begin('مصاريف بالكلام');
          const acc = await defaultAccount();
          for (const it of items) {
            const c = await ensureCategory(it.category);
            await R.txns.add({
              type: 'expense',
              amount: it.amount,
              date: today(),
              accountId: acc.id,
              categoryId: c.id,
              note: it.label
            });
          }
          Hist.commit();
          UI.toast('سجّلنا ' + fmtN(items.length, 0) + ' معاملة بإجمالي ' + money(items.reduce((s, i) => s + i.amount, 0)), {
            undo: true
          });
          Router.render();
        }
      }
    ]
  });
}

async function setBudgetUI() {
  const cats = await R.categories.all();
  UI.form({
    title: 'ميزانية الشهر',
    fields: [
      {
        k: 'categoryId',
        l: 'التصنيف',
        t: 'select',
        opts: cats.length ? cats.map(c => ({ v: c.id, l: c.name })) : [{ v: '', l: '(اكتب تصنيف جديد)' }]
      },
      { k: 'newCategory', l: 'أو تصنيف جديد', t: 'text' },
      { k: 'amount', l: 'السقف', t: 'money', req: true },
      { k: 'month', l: 'الشهر (YYYY-MM)', t: 'text', req: true }
    ],
    values: { month: monthKey() },
    onSave: async v => {
      Hist.begin('ميزانية');
      let id = v.categoryId;
      if (!id && v.newCategory) id = (await ensureCategory(v.newCategory)).id;
      if (!id) {
        UI.toast('اختار تصنيف');
        throw new Error('تصنيف مطلوب');
      }
      await R.budgets.add({ categoryId: id, amount: +v.amount, month: v.month });
      Hist.commit();
      UI.toast(T('save'), { undo: true });
      Router.render();
    }
  });
}

Object.assign(window, {
  addTxn, quickExpenses, setBudgetUI
});
