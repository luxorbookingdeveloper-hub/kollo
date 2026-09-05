/* ============================================================================
   كله — Kollo | Tests: Real Tools Execution Suite
   ============================================================================ */

window.runToolsTests = async function (ctx) {
  const { T2, mk, tmp, snap, same, diff } = ctx;

  /* ================= 14) التولز على داتا حقيقية ================= */
  await T2('كل تولز القراءة بترد شكل صح وميغيّروش الداتا', async () => {
    const b = await snap();
    const bad = [];
    const fake = t => {
      const a = {};
      const props = (t.parameters && t.parameters.properties) || {};
      (t.parameters && t.parameters.required || []).forEach(k => {
        const ty = (props[k] || {}).type;
        if (ty === 'number') a[k] = 1;
        else if (ty === 'boolean') a[k] = false;
        else if (ty === 'array') a[k] = ['اختبار'];
        else if (/date|from|to|start|due|phrase|month/i.test(k)) a[k] = today();
        else if (/^id$|Id$/.test(k)) a[k] = 'no-such-id-' + uid().slice(0, 6);
        else if (/store/i.test(k)) a[k] = 'tasks';
        else if (/groupBy/i.test(k)) a[k] = 'type';
        else if (/type$/i.test(k)) a[k] = 'نوم';
        else a[k] = 'اختبار';
      });
      return a;
    };
    for (const n of Object.keys(TOOLS)) {
      const t = TOOLS[n];
      if (t.risk !== 'read') continue;
      try {
        const r = await t.handler(fake(t));
        if (!r || typeof r.ok !== 'boolean') bad.push(n + ' (شكل رد غلط)');
      } catch (e) {
        bad.push(n + ' (' + String(e.message || e).slice(0, 40) + ')');
      }
    }
    const a = await snap();
    if (!same(b, a)) bad.push('غيّروا الداتا: ' + diff(b, a));
    return { ok: !bad.length, note: bad.length ? bad.slice(0, 4).join(' · ') : fmtN(Object.keys(TOOLS).filter(n => TOOLS[n].risk === 'read').length, 0) + ' تول قراءة نضيفين' };
  });

  await T2('تول create_task بيعمل مهمة حقيقية بتاريخ مصري', async () => {
    const r = await TOOLS.create_task.handler({ title: 'من الأسطى (اختبار)', due: 'بكرة', priority: 1 });
    if (r.ok) tmp.push(['tasks', r.data.id]);
    const row = r.ok ? await R.tasks.get(r.data.id) : null;
    return { ok: r.ok === true && r.affected === 1 && !!row && row.due === addDays(today(), 1), note: 'الاستحقاق: ' + (row && row.due) };
  });

  await T2('تول add_transaction بيعمل الحساب والتصنيف لو مش موجودين', async () => {
    const cn = 'اختبار-تصنيف-' + uid().slice(0, 4), an = 'اختبار-حساب-' + uid().slice(0, 4);
    const r = await TOOLS.add_transaction.handler({ type: 'expense', amount: 33, category: cn, account: an, note: 'اختبار' });
    const tr = (await R.txns.all()).find(x => x.note === 'اختبار' && +x.amount === 33);
    if (tr) tmp.push(['txns', tr.id]);
    const acc = (await R.accounts.all()).find(a => a.name === an);
    if (acc) tmp.push(['accounts', acc.id]);
    const cat = (await R.categories.all()).find(c => c.name === cn);
    if (cat) tmp.push(['categories', cat.id]);
    return { ok: r.ok && !!tr && !!acc && !!cat, note: 'اتعمل حساب وتصنيف جديدين مع المعاملة' };
  });

  await T2('تول parse_and_add_expenses_from_text بيسجّل صح', async () => {
    const r = await TOOLS.parse_and_add_expenses_from_text.handler({ text: 'صرفت ١٥ قهوة و١٠ مواصلات' });
    if (r.ok) r.data.items.forEach(i => tmp.push(['txns', i.id]));
    return { ok: r.ok && r.data.items.length === 2 && r.data.total === 25, note: '٢ معاملات · إجمالي ' + fmtN(r.ok ? r.data.total : 0, 0) };
  });

  await T2('العادات: streak بيتحسب من التسجيلات الحقيقية', async () => {
    const h = await mk('habits', { name: 'اختبار-عادة', freq: 'daily', target: 1, active: true });
    for (let i = 0; i < 3; i++) {
      await mk('habitLogs', { habitId: h.id, date: addDays(today(), -i), value: 1 });
    }
    const r = await TOOLS.get_habit_stats.handler({ habitId: h.id });
    return { ok: r.ok && r.data.streak === 3 && r.data.total === 3, note: '٣ أيام ورا بعض = streak ' + fmtN(r.ok ? r.data.streak : 0, 0) };
  });

  await T2('التقويم: find_free_slot بيلاقي وقت فاضي', async () => {
    await mk('events', { title: 'اختبار-ميعاد', start: today(), time: '09:00', duration: 60 });
    const r = await TOOLS.find_free_slot.handler({ date: today(), minutes: 30 });
    return { ok: r.ok && r.data.found === true && r.data.start >= '10:00', note: 'أقرب فرصة: ' + (r.ok ? r.data.start : '—') };
  });

  await T2('المستندات: تنبيه الانتهاء خلال ٩٠ يوم', async () => {
    const d = await mk('documents', { name: 'اختبار-مستند', kind: 'بطاقة', expiry: addDays(today(), 10) });
    const r = await TOOLS.list_expiring_documents.handler({ days: 90 });
    return { ok: r.ok && r.data.documents.some(x => x.id === d.id), note: 'ظهر في القايمة قبل الانتهاء بـ١٠ يوم' };
  });

  await T2('الناس: who_should_i_call بيرجّع المتأخر بس', async () => {
    const p = await mk('people', { name: 'اختبار-شخص', relation: 'صاحب', cadence: 1, lastContact: addDays(today(), -5) });
    const q = await mk('people', { name: 'اختبار-شخص-٢', relation: 'صاحب', cadence: 30, lastContact: today() });
    const r = await TOOLS.who_should_i_call.handler({});
    const rows = r.data.rows || r.data;
    return { ok: r.ok && rows.some(x => x.id === p.id) && !rows.some(x => x.id === q.id), note: 'المتأخر بس هو اللي بيظهر' };
  });

  await T2('aggregate بيجمّع صح من داتا حقيقية', async () => {
    const acc = await mk('accounts', { name: 'اختبار-جمع', type: 'cash', opening: 0 });
    await mk('txns', { type: 'expense', amount: 10, date: today(), accountId: acc.id, note: 'اختبار' });
    await mk('txns', { type: 'expense', amount: 15, date: today(), accountId: acc.id, note: 'اختبار' });
    const r = await TOOLS.aggregate.handler({ store: 'txns', groupBy: 'type', sumField: 'amount', from: today(), to: today() });
    const g = (r.data.groups || []).find(x => x.k === 'expense');
    return { ok: r.ok && !!g && g.v >= 25, note: 'مجموع النهاردة للمصروف: ' + fmtN(g ? g.v : 0, 0) };
  });

  await T2('الجمعية: تسجيل دور بيعمل مصروف كمان', async () => {
    const g = await mk('gam3iyat', { name: 'اختبار-جمعية', amount: 100, members: 5, myTurn: 2, startDate: today(), rounds: [], status: 'active' });
    const before = await dbCount('txns');
    const r = await TOOLS.record_gam3ia_round.handler({ id: g.id });
    const after = await dbCount('txns');
    const t = (await R.txns.all()).find(x => x.note === 'جمعية: اختبار-جمعية');
    if (t) tmp.push(['txns', t.id]);
    return { ok: r.ok && r.data.rounds === 1 && after === before + 1, note: 'دور واحد + معاملة مصروف' };
  });
};
