/* ============================================================================
   كله — Kollo | AI Tools: Habit Tools
   ============================================================================ */
/* --- عادات --- */
registerTool({
  name: 'create_habit',
  description: 'Create a habit (daily/weekly/count).',
  risk: 'write',
  parameters: P({ name: S_STR, freq: S_STR, target: S_NUM, unit: S_STR }, ['name']),
  handler: async a => {
    const h = await R.habits.add({
      name: a.name,
      freq: a.freq || 'daily',
      target: num(a.target, 1),
      unit: a.unit || 'مرة',
      active: true
    });
    return OK({ id: h.id }, { affected: 1 });
  }
});

registerTool({
  name: 'log_habit',
  description: 'Log a habit for a date (default today).',
  risk: 'write',
  parameters: P({ habitId: S_STR, date: S_STR, value: S_NUM }, ['habitId']),
  handler: async a => {
    const h = await R.habits.get(a.habitId);
    if (!h) return ERR('العادة مش موجودة');
    const d = a.date ? parseNatDate(a.date) : today();
    const l = await R.habitLogs.add({ habitId: a.habitId, date: d, value: num(a.value, 1) });
    return OK({ id: l.id, habit: h.name, date: d }, { affected: 1 });
  }
});

registerTool({
  name: 'unlog_habit',
  description: 'Remove a habit log for a date.',
  risk: 'write',
  parameters: P({ habitId: S_STR, date: S_STR }, ['habitId']),
  handler: async a => {
    const d = a.date ? parseNatDate(a.date) : today();
    const rows = (await R.habitLogs.byIndex('date', IDBKeyRange.only(d))).filter(l => l.habitId === a.habitId);
    if (!rows.length) return ERR('مفيش تسجيل في اليوم ده');
    for (const r of rows) await R.habitLogs.hardDel(r.id);
    return OK({ removed: rows.length }, { affected: rows.length });
  }
});

registerTool({
  name: 'get_habit_stats',
  description: 'Streak and last-30-days counts for a habit (real numbers only).',
  risk: 'read',
  parameters: P({ habitId: S_STR }, ['habitId']),
  handler: async a => {
    const h = await R.habits.get(a.habitId);
    if (!h) return ERR('العادة مش موجودة');
    const logs = (await R.habitLogs.all()).filter(l => l.habitId === a.habitId);
    const map = {};
    logs.forEach(l => { map[l.date] = (map[l.date] || 0) + 1; });
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = addDays(today(), -i);
      if (map[d]) streak++;
      else if (i > 0) break;
    }
    return OK({
      habit: h.name,
      streak,
      last30: Object.keys(map).filter(d => d >= addDays(today(), -30)).length,
      total: logs.length
    });
  }
});

registerTool({
  name: 'pause_habit',
  description: 'Pause or resume a habit.',
  risk: 'write',
  parameters: P({ habitId: S_STR, active: S_BOOL }, ['habitId']),
  handler: async a => {
    const r = await R.habits.patch(a.habitId, { active: !!a.active });
    return OK({ id: r.id, active: r.active }, { affected: 1 });
  }
});

