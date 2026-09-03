/* ============================================================================
   كله — Kollo | AI Tools: Calendar & Event Tools
   ============================================================================ */
/* --- تقويم --- */
registerTool({
  name: 'create_event',
  description: 'Create a calendar event.',
  risk: 'write',
  parameters: P({ title: S_STR, start: S_STR, time: S_STR, place: S_STR, prep: S_NUM, repeat: S_STR }, ['title', 'start']),
  handler: async a => {
    const d = parseNatDate(a.start);
    if (!d) return ERR('التاريخ مش مفهوم');
    const e = await R.events.add({
      title: a.title,
      start: d,
      time: a.time || '',
      place: a.place || '',
      prep: num(a.prep),
      repeat: a.repeat || ''
    });
    return OK({ id: e.id, start: d }, { affected: 1 });
  }
});

registerTool({
  name: 'update_event',
  description: 'Update an event.',
  risk: 'write',
  parameters: P({ id: S_STR, title: S_STR, start: S_STR, time: S_STR, place: S_STR }, ['id']),
  handler: async a => {
    const e = await R.events.get(a.id);
    if (!e) return ERR('الميعاد مش موجود');
    const f = {};
    ['title', 'time', 'place'].forEach(k => { if (a[k] != null) f[k] = a[k]; });
    if (a.start) f.start = parseNatDate(a.start);
    const r = await R.events.patch(a.id, f);
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'delete_event',
  description: 'Soft delete an event.',
  risk: 'destructive',
  parameters: P({ id: S_STR }, ['id']),
  handler: async a => {
    if (!await R.events.get(a.id)) return ERR('الميعاد مش موجود');
    await R.events.softDel(a.id);
    return OK({ id: a.id }, { affected: 1 });
  }
});

registerTool({
  name: 'list_events_between',
  description: 'List events between two dates (inclusive).',
  risk: 'read',
  parameters: P({ from: S_STR, to: S_STR }, ['from', 'to']),
  handler: async a => {
    const f = parseNatDate(a.from), t = parseNatDate(a.to);
    if (!f || !t) return ERR('تواريخ مش مفهومة');
    const rows = await R.events.byIndex('start', IDBKeyRange.bound(f, t));
    return OK(cap(rows.map(e => ({ id: e.id, title: e.title, start: e.start, time: e.time, place: e.place }))));
  }
});

registerTool({
  name: 'find_free_slot',
  description: 'Find a free time slot on a date, given existing events (assumes 09:00-22:00 day).',
  risk: 'read',
  parameters: P({ date: S_STR, minutes: S_NUM }, ['date', 'minutes']),
  handler: async a => {
    const d = parseNatDate(a.date);
    const ev = (await R.events.byIndex('start', IDBKeyRange.only(d))).filter(e => e.time).sort((x, y) => x.time.localeCompare(y.time));
    const need = num(a.minutes, 30);
    let cursor = 9 * 60;
    const busy = ev.map(e => {
      const [h, m] = e.time.split(':').map(Number);
      return [h * 60 + (m || 0), h * 60 + (m || 0) + (num(e.duration, 60))];
    });
    for (const [s, e] of busy) {
      if (s - cursor >= need) break;
      cursor = Math.max(cursor, e);
    }
    if (cursor + need > 22 * 60) return OK({ found: false, reason: 'اليوم مزنوق — مفيش مساحة كافية' });
    return OK({
      found: true,
      date: d,
      start: pad2(Math.floor(cursor / 60)) + ':' + pad2(cursor % 60),
      minutes: need
    });
  }
});

registerTool({
  name: 'schedule_task_into_calendar',
  description: 'Create a calendar event from an existing task in a free slot.',
  risk: 'write',
  parameters: P({ taskId: S_STR, date: S_STR, minutes: S_NUM }, ['taskId']),
  handler: async a => {
    const t = await R.tasks.get(a.taskId);
    if (!t) return ERR('المهمة مش موجودة');
    const slot = await TOOLS.find_free_slot.handler({
      date: a.date || t.due || today(),
      minutes: num(a.minutes, t.estimate || 30)
    });
    if (!slot.ok || !slot.data.found) return ERR('مفيش وقت فاضي — جرّب يوم تاني');
    const e = await R.events.add({
      title: t.title,
      start: slot.data.date,
      time: slot.data.start,
      duration: slot.data.minutes,
      taskId: t.id
    });
    return OK({ id: e.id, date: slot.data.date, time: slot.data.start }, { affected: 1 });
  }
});

