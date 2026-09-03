/* ============================================================================
   كله — Kollo | AI Tools: Health & Medication Tools
   ============================================================================ */
/* --- صحة (وصفي فقط) --- */
registerTool({
  name: 'log_health_metric',
  description: 'Log a health reading as the user states it (pressure/sugar/pulse/note). No interpretation, no targets.',
  risk: 'write',
  parameters: P({ type: S_STR, value: S_STR, date: S_STR, note: S_STR }, ['type', 'value']),
  handler: async a => {
    const r = await R.healthLogs.add({
      type: a.type,
      value: String(a.value),
      date: a.date ? parseNatDate(a.date) : today(),
      note: a.note || ''
    });
    return OK({ id: r.id, note: 'تسجيل فقط — أي تفسير يرجع للدكتور' }, { affected: 1 });
  }
});

registerTool({
  name: 'log_sleep',
  description: 'Log sleep hours as reported.',
  risk: 'write',
  parameters: P({ hours: S_NUM, date: S_STR }, ['hours']),
  handler: async a => {
    const r = await R.healthLogs.add({
      type: 'نوم',
      value: String(num(a.hours)),
      date: a.date ? parseNatDate(a.date) : today()
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'log_water',
  description: 'Log water intake as reported (cups/liters).',
  risk: 'write',
  parameters: P({ amount: S_STR, date: S_STR }, ['amount']),
  handler: async a => {
    const r = await R.healthLogs.add({
      type: 'مياه',
      value: String(a.amount),
      date: a.date ? parseNatDate(a.date) : today()
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'log_workout',
  description: 'Log a workout: type, duration, note. No calorie or weight goals.',
  risk: 'write',
  parameters: P({ kind: S_STR, minutes: S_NUM, note: S_STR }, ['kind']),
  handler: async a => {
    const r = await R.healthLogs.add({
      type: 'تمرين',
      value: a.kind + (a.minutes ? ' · ' + num(a.minutes) + 'د' : ''),
      note: a.note || '',
      date: today()
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'add_medication',
  description: 'Add a medication with the dose exactly as the doctor said. Never suggest doses.',
  risk: 'write',
  parameters: P({ name: S_STR, dose: S_STR, times: S_STR, stock: S_NUM }, ['name']),
  handler: async a => {
    const r = await R.meds.add({
      name: a.name,
      dose: a.dose || '',
      times: a.times || '',
      stock: num(a.stock),
      active: true
    });
    return OK({ id: r.id, note: 'الجرعة زي ما المستخدم قالها — التطبيق مش بيقترح جرعات' }, { affected: 1 });
  }
});

registerTool({
  name: 'log_med_dose',
  description: 'Log taking a medication dose (decrements stock).',
  risk: 'write',
  parameters: P({ medId: S_STR }, ['medId']),
  handler: async a => {
    const m = await R.meds.get(a.medId);
    if (!m) return ERR('الدوا مش موجود');
    const r = await R.medDoses.add({ medId: a.medId, date: today(), at: now() });
    if (m.stock != null) await R.meds.patch(a.medId, { stock: Math.max(0, +m.stock - 1) });
    return OK({ id: r.id, stockLeft: m.stock != null ? Math.max(0, +m.stock - 1) : null }, { affected: 1 });
  }
});

registerTool({
  name: 'get_health_trend',
  description: 'Return raw logged health values for a type over N days (no medical interpretation).',
  risk: 'read',
  parameters: P({ type: S_STR, days: S_NUM }, ['type']),
  handler: async a => {
    const from = addDays(today(), -num(a.days, 30));
    const rows = (await R.healthLogs.all()).filter(l => l.type === a.type && l.date >= from).sort((x, y) => x.date.localeCompare(y.date));
    return OK({
      type: a.type,
      from,
      rows: rows.map(r => ({ date: r.date, value: r.value })),
      count: rows.length,
      disclaimer: 'أرقام مسجّلة من المستخدم — التفسير للدكتور'
    });
  }
});

