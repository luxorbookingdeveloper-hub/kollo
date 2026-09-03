/* ============================================================================
   كله — Kollo | AI Tools: Search & Context Tools
   ============================================================================ */
/* --- بحث وسياق --- */
registerTool({
  name: 'search_everything',
  description: 'Full-text fuzzy search across tasks, notes, people, transactions, events, goals, books, documents. Use it before answering any question about the user data.',
  risk: 'read',
  parameters: P({ query: S_STR, limit: S_NUM }, ['query']),
  handler: async a => {
    if (!a.query) return ERR('لازم query');
    const res = await searchEverything(a.query, num(a.limit, 25));
    return OK(cap(res));
  }
});

registerTool({
  name: 'get_today_brief',
  description: 'Get today brief: open tasks, overdue tasks, today events, habits status, mental load score.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const ml = await mentalLoad();
    const tasks = (await R.tasks.all()).filter(t => t.status !== 'done');
    const ev = await R.events.byIndex('start', IDBKeyRange.only(today()));
    const habits = (await R.habits.all()).filter(h => h.active !== false);
    const logs = await R.habitLogs.byIndex('date', IDBKeyRange.only(today()));
    return OK({
      date: today(),
      mentalLoad: ml,
      tasksOpen: tasks.slice(0, 40).map(t => ({ id: t.id, title: t.title, due: t.due, priority: t.priority, postponed: t.postponed || 0 })),
      events: ev.map(e => ({ id: e.id, title: e.title, time: e.time, place: e.place })),
      habits: habits.map(h => ({ id: h.id, name: h.name, doneToday: logs.some(l => l.habitId === h.id) }))
    });
  }
});

registerTool({
  name: 'get_context_summary',
  description: 'Counts and high-level state of every module, to know what data exists before asking the user.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const out = {};
    for (const s of Object.keys(SCHEMA)) out[s] = (await R[s].all()).length;
    const nw = await netWorth();
    return OK({
      counts: out,
      currency: S.settings.currency,
      netWorth: { cash: nw.cash, owe: nw.owe, lent: nw.lent, net: nw.net },
      budgets: await budgetStatus(monthKey()),
      today: today()
    });
  }
});

registerTool({
  name: 'find_by_natural_date',
  description: 'Resolve Egyptian-Arabic natural date phrases (بكرة، الأسبوع الجاي، آخر الشهر) to ISO date, and list items on it.',
  risk: 'read',
  parameters: P({ phrase: S_STR }, ['phrase']),
  handler: async a => {
    const d = parseNatDate(a.phrase);
    if (!d) return ERR('مش فاهم التاريخ ده');
    const tasks = await R.tasks.byIndex('due', IDBKeyRange.only(d));
    const ev = await R.events.byIndex('start', IDBKeyRange.only(d));
    return OK({
      date: d,
      label: relDay(d),
      tasks: tasks.map(t => ({ id: t.id, title: t.title })),
      events: ev.map(e => ({ id: e.id, title: e.title, time: e.time }))
    });
  }
});

