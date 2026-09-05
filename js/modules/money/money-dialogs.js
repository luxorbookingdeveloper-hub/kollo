/* ============================================================================
   كله — Kollo | Money Module: Transaction & Budget Dialogs
   ============================================================================ */

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
  addTxn,
  quickExpenses,
  setBudgetUI
});
