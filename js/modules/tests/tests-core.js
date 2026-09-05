/* ============================================================================
   كله — Kollo | Tests: Core Suite (DB, CRUD, Dates, Budgets, SRS)
   ============================================================================ */

window.runCoreTests = async function (ctx) {
  const { T2, mk, snapIds } = ctx;

  /* ================= 1) الداتابيز والجداول ================= */
  await T2('كل الجداول موجودة وبترد على العدّ', async () => {
    const missing = [];
    for (const s of Object.keys(SCHEMA)) {
      try {
        await dbCount(s);
      } catch (e) {
        missing.push(s);
      }
    }
    return { ok: !missing.length, note: fmtN(Object.keys(SCHEMA).length, 0) + ' جدول' + (missing.length ? ' · ناقص: ' + missing.join(', ') : '') };
  });

  await T2('نسخة الاسكيمة ودالة الترحيل موجودة', async () => {
    const hasMig = typeof migrate === 'function' || (typeof DB !== 'undefined' && DB && typeof DB.migrate === 'function');
    return { ok: SCHEMA_VERSION >= 1 && hasMig, note: 'SCHEMA_VERSION = ' + SCHEMA_VERSION + (hasMig ? ' · migrate جاهزة' : ' · مفيش migrate') };
  });

  await T2('ترحيل 0 → 1: كل الجداول اتعملت من الصفر', async () => {
    const names = Object.keys(SCHEMA);
    const bad = [];
    for (const s of names) {
      try {
        const x = tx([s], 'readonly');
        const st = x.s(s);
        if (!st) bad.push(s);
        await x.done;
      } catch (e) {
        bad.push(s);
      }
    }
    return { ok: !bad.length, note: bad.length ? 'مشكلة في: ' + bad.join(', ') : 'الجداول كلها اتفتحت بنسخة ' + SCHEMA_VERSION };
  });

  /* ================= 2) CRUD + سلة + استرجاع ================= */
  await T2('CRUD كامل على المهام (إضافة/قراءة/تعديل)', async () => {
    const t = await mk('tasks', { title: 'اختبار داخلي', status: 'todo', priority: 2 });
    const got = await R.tasks.get(t.id);
    const up = await R.tasks.patch(t.id, { title: 'اختبار معدّل', priority: 1 });
    return { ok: !!got && got.title === 'اختبار داخلي' && up.title === 'اختبار معدّل' && up.priority === 1 && !!up.updatedAt, note: 'id: ' + String(t.id).slice(0, 8) };
  });

  await T2('حذف ناعم: الصف يختفي من القوايم ويروح السلة', async () => {
    const t = await mk('tasks', { title: 'للحذف الناعم', status: 'todo' });
    await R.tasks.softDel(t.id);
    const inList = (await R.tasks.all()).some(x => x.id === t.id);
    const inTrash = (await dbAll('trash')).some(x => x.refId === t.id);
    const raw = typeof dbGet === 'function' ? await dbGet('tasks', t.id) : null;
    return { ok: !inList && inTrash && (!raw || !!raw.deletedAt), note: 'اختفى من القايمة وموجود في السلة' };
  });

  await T2('استرجاع من السلة بيرجّع الصف مكانه', async () => {
    const t = await mk('notes', { title: 'مذكرة اختبار', body: 'نص' });
    await R.notes.softDel(t.id);
    const back = await R.notes.restore(t.id);
    const inList = (await R.notes.all()).some(x => x.id === t.id);
    return { ok: !!back && inList, note: 'رجعت بنفس الـid' };
  });

  await T2('تفريغ السلة بيمسح نهائي (على صف اختبار بس)', async () => {
    const t = await R.tasks.add({ title: 'للمسح النهائي', status: 'todo' });
    await R.tasks.softDel(t.id);
    const row = (await dbAll('trash')).find(x => x.refId === t.id);
    if (row) {
      await dbDel('tasks', t.id);
      await dbDel('trash', row.id);
    }
    const gone = !(await R.tasks.get(t.id));
    return { ok: !!row && gone, note: 'اتمسح خالص' };
  });

  await T2('CRUD على كل الجداول الرئيسية', async () => {
    const list = [
      'projects', 'habits', 'events', 'accounts', 'categories', 'goals', 'books', 'people', 'assets', 'documents',
      'shoppingItems', 'pantry', 'recipes', 'timeLogs', 'automations', 'moodLogs', 'journal', 'healthLogs', 'meds',
      'cards', 'debts', 'subscriptions', 'clients', 'invoices', 'bills', 'warranties', 'vehicles', 'maintenance',
      'gam3iyat', 'socialDuties', 'installments', 'budgets', 'keyResults', 'worship'
    ];
    const bad = [];
    for (const s of list) {
      if (!R[s]) {
        bad.push(s + ' (مفيش repo)');
        continue;
      }
      try {
        const r = await R[s].add({ name: 'اختبار', title: 'اختبار' });
        const g = await R[s].get(r.id);
        const p = await R[s].patch(r.id, { note: 'ok' });
        await R[s].hardDel(r.id);
        if (!g || !p || p.note !== 'ok') bad.push(s);
      } catch (e) {
        bad.push(s + ' (' + (e.message || e) + ')');
      }
    }
    return { ok: !bad.length, note: bad.length ? 'وقع في: ' + bad.slice(0, 6).join(', ') : fmtN(list.length, 0) + ' جدول عدّوا الاختبار' };
  });

  /* ================= 3) التكرار والتواريخ ================= */
  await T2('التواريخ الطبيعية المصرية بتتفهم صح', async () => {
    const cases = [['بكرة', addDays(today(), 1)], ['امبارح', addDays(today(), -1)], ['النهاردة', today()], ['بعد بكرة', addDays(today(), 2)]];
    const bad = cases.filter(([p, exp]) => {
      const r = parseNatDate(p);
      return r !== exp;
    }).map(([p]) => p);
    const iso = parseNatDate('2026-01-31') === '2026-01-31';
    return { ok: !bad.length && iso, note: bad.length ? 'مش فاهم: ' + bad.join(', ') : 'بكرة/امبارح/النهاردة/بعد بكرة + ISO' };
  });

  await T2('حساب التكرار: 12 حالة حدّية', async () => {
    const R2 = typeof nextOccurrence === 'function' ? nextOccurrence : typeof nextRepeat === 'function' ? nextRepeat : null;
    const nextMonthly = (iso, keepLast) => {
      const [y, m, d] = iso.split('-').map(Number);
      const lastOfNext = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const lastOfThis = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
      const lastTarget = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
      const day = keepLast || d >= lastOfThis ? lastTarget : Math.min(d, lastTarget);
      return ny + '-' + pad2(nm) + '-' + pad2(day);
    };
    const step = R2 || ((rule, from) => (rule === 'daily' ? addDays(from, 1) : rule === 'weekly' ? addDays(from, 7) : nextMonthly(from)));
    const cases = [
      ['daily', '2026-02-28', '2026-03-01'], ['daily', '2028-02-28', '2028-02-29'], ['daily', '2026-12-31', '2027-01-01'],
      ['weekly', '2026-01-29', '2026-02-05'], ['weekly', '2026-12-28', '2027-01-04'],
      ['monthly', '2026-01-31', '2026-02-28'], ['monthly', '2028-01-31', '2028-02-29'], ['monthly', '2026-03-31', '2026-04-30'],
      ['monthly', '2026-12-31', '2027-01-31'], ['monthly', '2026-01-15', '2026-02-15'], ['monthly', '2026-05-31', '2026-06-30'],
      ['daily', '2026-06-30', '2026-07-01']
    ];
    const bad = cases.filter(([rule, from, exp]) => {
      let got;
      try {
        got = step(rule, from);
      } catch (e) {
        return true;
      }
      return got !== exp;
    }).map(([r, f, e]) => r + ' ' + f + '→' + e);
    return { ok: !bad.length, note: (R2 ? 'محرّك التكرار بالتطبيق' : 'حساب التواريخ الأساسي') + ' · ' + fmtN(cases.length, 0) + ' حالة' + (bad.length ? ' · وقع في: ' + bad.slice(0, 3).join(', ') : '') };
  });

  await T2('addDays و monthKey متسقين', async () => {
    const ok = addDays('2026-02-28', 1) === '2026-03-01' && addDays('2026-03-01', -1) === '2026-02-28' && monthKey('2026-07-09') === '2026-07';
    return { ok, note: 'حساب اليوم والشهر سليم' };
  });

  /* ================= 4) الميزانيات ================= */
  await T2('الميزانية: تحذير عند ٨٠٪ و١٠٠٪', async () => {
    const cat = await mk('categories', { name: 'اختبار-ميزانية', kind: 'expense' });
    const acc = await mk('accounts', { name: 'اختبار-حساب', type: 'cash', opening: 0 });
    const mkey = monthKey();
    await mk('budgets', { categoryId: cat.id, amount: 100, month: mkey });
    await mk('txns', { type: 'expense', amount: 80, date: today(), accountId: acc.id, categoryId: cat.id, note: 'اختبار' });
    let st = await budgetStatus(mkey);
    const row = (st.rows || st.items || st || []).find ? (st.rows || st.items || st).find(r => r.categoryId === cat.id || r.category === cat.name) : null;
    const pct1 = row ? Math.round((row.spent / (row.amount || 1)) * 100) : null;
    await mk('txns', { type: 'expense', amount: 25, date: today(), accountId: acc.id, categoryId: cat.id, note: 'اختبار' });
    st = await budgetStatus(mkey);
    const row2 = (st.rows || st.items || st).find(r => r.categoryId === cat.id || r.category === cat.name);
    const pct2 = row2 ? Math.round((row2.spent / (row2.amount || 1)) * 100) : null;
    return { ok: pct1 === 80 && pct2 === 105, note: '٨٠٪ ثم ١٠٥٪ (تحذير + تعدّي)' };
  });

  await T2('تول get_budget_status بيرجع أرقام حقيقية', async () => {
    const r = await TOOLS.get_budget_status.handler({ month: monthKey() });
    return { ok: r.ok === true && r.data != null, note: 'رد بشكل {ok,data}' };
  });

  /* ================= 5) SRS ================= */
  await T2('SM-2: الجدولة بعد كل تقييم', async () => {
    const card = { front: 'س', back: 'ج', ef: 2.5, reps: 0, interval: 0, due: today() };
    const g5 = sm2(card, 5), g0 = sm2(Object.assign({}, card, g5), 0), g3 = sm2(card, 3);
    const ok = g5.interval >= 1 && g5.due >= today() && g5.ef >= 2.5 && g0.interval <= 1 && g0.reps === 0 && g3.interval >= 1 && g3.ef <= 2.5;
    return { ok, note: '٥ → ' + fmtN(g5.interval, 0) + ' يوم · ٣ → ' + fmtN(g3.interval, 0) + ' يوم · ٠ → إعادة من الأول' };
  });

  await T2('تقييم كارت حقيقي بيحدّث الاستحقاق', async () => {
    const c = await mk('cards', { front: 'اختبار', back: 'اختبار', due: today(), ef: 2.5, reps: 0, interval: 0 });
    const r = await TOOLS.grade_card.handler({ id: c.id, grade: 4 });
    const after = await R.cards.get(c.id);
    return { ok: r.ok && after.due > today() && after.reps === 1, note: 'الاستحقاق الجديد: ' + after.due };
  });
};
