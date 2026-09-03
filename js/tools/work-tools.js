/* ============================================================================
   كله — Kollo | AI Tools: Work, Time & Invoice Tools
   ============================================================================ */
/* --- شغل/وقت --- */
registerTool({
  name: 'start_timer',
  description: 'Start a work timer (stored in session).',
  risk: 'write',
  parameters: P({ title: S_STR, projectId: S_STR }, ['title']),
  handler: async a => {
    S.cache.timer = { title: a.title, projectId: a.projectId || null, at: Date.now() };
    return OK({ started: true, title: a.title });
  }
});

registerTool({
  name: 'stop_timer',
  description: 'Stop the running timer and log the minutes.',
  risk: 'write',
  parameters: P({}),
  handler: async () => {
    const t = S.cache.timer;
    if (!t) return ERR('مفيش تايمر شغّال');
    const mins = Math.max(1, Math.round((Date.now() - t.at) / 60000));
    S.cache.timer = null;
    const r = await R.timeLogs.add({ title: t.title, minutes: mins, date: today(), projectId: t.projectId });
    return OK({ id: r.id, minutes: mins }, { affected: 1 });
  }
});

registerTool({
  name: 'log_work',
  description: 'Log work time manually.',
  risk: 'write',
  parameters: P({ title: S_STR, minutes: S_NUM, date: S_STR, projectId: S_STR }, ['title', 'minutes']),
  handler: async a => {
    const r = await R.timeLogs.add({
      title: a.title,
      minutes: num(a.minutes),
      date: a.date ? parseNatDate(a.date) : today(),
      projectId: a.projectId || null
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'start_pomodoro',
  description: 'Open the pomodoro screen (UI action).',
  risk: 'write',
  parameters: P({}),
  handler: async () => {
    Router.go('work?tab=pomo');
    return OK({ opened: true });
  }
});

registerTool({
  name: 'time_report',
  description: 'Time logged per day/project for last N days.',
  risk: 'read',
  parameters: P({ days: S_NUM }),
  handler: async a => {
    const from = addDays(today(), -num(a.days, 14));
    const rows = (await R.timeLogs.all()).filter(l => l.date >= from);
    const byDay = await WK.call({ op: 'agg', rows: rows.map(r => ({ k: r.date, v: +r.minutes || 0 })) });
    return OK({ from, totalMinutes: rows.reduce((s, r) => s + (+r.minutes || 0), 0), byDay });
  }
});

registerTool({
  name: 'add_client',
  description: 'Add a freelance client.',
  risk: 'write',
  parameters: P({ name: S_STR, rate: S_NUM }, ['name']),
  handler: async a => {
    const r = await R.clients.add({ name: a.name, rate: num(a.rate) });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'create_invoice',
  description: 'Create an invoice for a client.',
  risk: 'write',
  parameters: P({ number: S_STR, clientId: S_STR, amount: S_NUM, due: S_STR }, ['number', 'amount']),
  handler: async a => {
    const r = await R.invoices.add({
      number: a.number,
      clientId: a.clientId || null,
      amount: num(a.amount),
      due: a.due ? parseNatDate(a.due) : null,
      status: 'open'
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'mark_invoice_paid',
  description: 'Mark an invoice paid and log it as income.',
  risk: 'write',
  parameters: P({ id: S_STR }, ['id']),
  handler: async a => {
    const i = await R.invoices.get(a.id);
    if (!i) return ERR('الفاتورة مش موجودة');
    await R.invoices.patch(a.id, { status: 'paid', paidAt: today() });
    const acc = await defaultAccount();
    const c = await ensureCategory('دخل فريلانس', 'income');
    await R.txns.add({
      type: 'income',
      amount: +i.amount || 0,
      date: today(),
      accountId: acc.id,
      categoryId: c.id,
      note: 'فاتورة ' + i.number
    });
    return OK({ id: a.id, amount: i.amount }, { affected: 2 });
  }
});

