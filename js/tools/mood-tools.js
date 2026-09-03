/* ============================================================================
   كله — Kollo | AI Tools: Mood & Journal Tools
   ============================================================================ */
/* --- مزاج/جورنال --- */
registerTool({
  name: 'log_mood',
  description: 'Log mood 1-5 with optional reasons.',
  risk: 'write',
  parameters: P({ mood: S_NUM, energy: S_NUM, reasons: { type: 'array', items: S_STR }, date: S_STR }, ['mood']),
  handler: async a => {
    const m = clamp(num(a.mood, 3), 1, 5);
    const r = await R.moodLogs.add({
      mood: m,
      energy: num(a.energy),
      reasons: a.reasons || [],
      date: a.date ? parseNatDate(a.date) : today()
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'add_journal_entry',
  description: 'Add a journal entry.',
  risk: 'write',
  parameters: P({ body: S_STR, date: S_STR, gratitude: S_STR }, ['body']),
  handler: async a => {
    const r = await R.journal.add({
      body: a.body,
      gratitude: a.gratitude || '',
      date: a.date ? parseNatDate(a.date) : today()
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'add_gratitude',
  description: 'Add a one-line gratitude entry.',
  risk: 'write',
  parameters: P({ text: S_STR }, ['text']),
  handler: async a => {
    const r = await R.journal.add({ body: '', gratitude: a.text, date: today() });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'mood_correlation_report',
  description: 'Descriptive correlation between mood and logged tasks/habits. Correlation, not causation. No diagnosis.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const logs = await R.moodLogs.all();
    if (logs.length < 5) return OK({ enough: false, message: 'الداتا لسه قليلة — محتاجين ٥ تسجيلات مزاج على الأقل' });
    const tasks = await R.tasks.all();
    const hl = await R.habitLogs.all();
    const good = logs.filter(l => +l.mood >= 4).map(l => l.date);
    const bad = logs.filter(l => +l.mood <= 2).map(l => l.date);
    const doneOn = d => tasks.filter(t => t.doneAt && String(t.doneAt).slice(0, 10) === d).length;
    const habOn = d => hl.filter(x => x.date === d).length;
    const avg = a => a.length ? a.reduce((s, d) => s + d, 0) / a.length : 0;
    return OK({
      goodDays: good.length,
      badDays: bad.length,
      goodDayAvgTasks: +avg(good.map(doneOn)).toFixed(2),
      badDayAvgTasks: +avg(bad.map(doneOn)).toFixed(2),
      goodDayAvgHabits: +avg(good.map(habOn)).toFixed(2),
      badDayAvgHabits: +avg(bad.map(habOn)).toFixed(2),
      disclaimer: 'ارتباط وصفي مش سبب، ومش تشخيص'
    });
  }
});

