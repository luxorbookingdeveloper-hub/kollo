/* ============================================================================
   كله — Kollo | AI Tools: Task Core Tools
   ============================================================================ */
/* --- مهام --- */
registerTool({
  name: 'create_task',
  description: 'Create one task. due accepts ISO date or Egyptian phrase.',
  risk: 'write',
  parameters: P({
    title: S_STR,
    due: S_STR,
    priority: S_NUM,
    estimate: S_NUM,
    projectId: S_STR,
    tags: { type: 'array', items: S_STR },
    note: S_STR
  }, ['title']),
  handler: async a => {
    if (!String(a.title || '').trim()) return ERR('العنوان فاضي');
    const t = await R.tasks.add({
      title: a.title.trim(),
      status: 'todo',
      due: a.due ? parseNatDate(a.due) : null,
      priority: num(a.priority, 3),
      estimate: num(a.estimate),
      projectId: a.projectId || null,
      tags: a.tags || [],
      note: a.note || ''
    });
    return OK({ id: t.id, title: t.title, due: t.due }, { affected: 1 });
  }
});

registerTool({
  name: 'create_tasks_bulk',
  description: 'Create many tasks at once.',
  risk: 'write',
  parameters: P({
    tasks: {
      type: 'array',
      items: P({ title: S_STR, due: S_STR, priority: S_NUM }, ['title'])
    }
  }, ['tasks']),
  handler: async a => {
    const list = (a.tasks || []).filter(t => t && String(t.title || '').trim());
    if (!list.length) return ERR('مفيش مهام');
    const ids = [];
    for (const t of list) {
      const r = await R.tasks.add({
        title: t.title.trim(),
        status: 'todo',
        due: t.due ? parseNatDate(t.due) : null,
        priority: num(t.priority, 3)
      });
      ids.push(r.id);
    }
    return OK({ ids }, { affected: ids.length });
  }
});

registerTool({
  name: 'update_task',
  description: 'Update fields of a task by id.',
  risk: 'write',
  parameters: P({ id: S_STR, title: S_STR, due: S_STR, priority: S_NUM, status: S_STR, note: S_STR }, ['id']),
  handler: async a => {
    const t = await R.tasks.get(a.id);
    if (!t) return ERR('المهمة مش موجودة');
    const f = {};
    ['title', 'priority', 'status', 'note'].forEach(k => { if (a[k] != null) f[k] = a[k]; });
    if (a.due) f.due = parseNatDate(a.due);
    const r = await R.tasks.patch(a.id, f);
    return OK({ id: r.id, title: r.title }, { affected: 1 });
  }
});

registerTool({
  name: 'complete_task',
  description: 'Mark a task done.',
  risk: 'write',
  parameters: P({ id: S_STR }, ['id']),
  handler: async a => {
    const t = await R.tasks.get(a.id);
    if (!t) return ERR('المهمة مش موجودة');
    await R.tasks.patch(a.id, { status: 'done', doneAt: now() });
    return OK({ id: a.id, title: t.title }, { affected: 1 });
  }
});

registerTool({
  name: 'postpone_task',
  description: 'Postpone a task by N days (default 1) and count postponements.',
  risk: 'write',
  parameters: P({ id: S_STR, days: S_NUM }, ['id']),
  handler: async a => {
    const t = await R.tasks.get(a.id);
    if (!t) return ERR('المهمة مش موجودة');
    const r = await R.tasks.patch(a.id, {
      due: addDays(t.due || today(), num(a.days, 1)),
      postponed: (t.postponed || 0) + 1
    });
    return OK({ id: r.id, due: r.due, postponed: r.postponed }, { affected: 1 });
  }
});

registerTool({
  name: 'delete_task',
  description: 'Soft delete a task (goes to trash for 30 days).',
  risk: 'destructive',
  parameters: P({ id: S_STR }, ['id']),
  handler: async a => {
    const t = await R.tasks.get(a.id);
    if (!t) return ERR('المهمة مش موجودة');
    await R.tasks.softDel(a.id);
    return OK({ id: a.id }, { affected: 1 });
  }
});

registerTool({
  name: 'list_tasks',
  description: 'List tasks with filters: status, due_before, due_on, overdue, projectId, tag.',
  risk: 'read',
  parameters: P({
    status: S_STR,
    due_on: S_STR,
    due_before: S_STR,
    overdue: S_BOOL,
    projectId: S_STR,
    tag: S_STR,
    limit: S_NUM
  }),
  handler: async a => {
    let rows = await R.tasks.all();
    if (a.status) rows = rows.filter(t => (t.status || 'todo') === a.status);
    if (a.due_on) rows = rows.filter(t => t.due === parseNatDate(a.due_on));
    if (a.due_before) rows = rows.filter(t => t.due && t.due <= parseNatDate(a.due_before));
    if (a.overdue) rows = rows.filter(t => t.status !== 'done' && t.due && t.due < today());
    if (a.projectId) rows = rows.filter(t => t.projectId === a.projectId);
    if (a.tag) rows = rows.filter(t => (t.tags || []).indexOf(a.tag) > -1);
    const total = rows.length;
    rows = rows.slice(0, num(a.limit, 100));
    return OK(cap(rows.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      due: t.due,
      priority: t.priority,
      postponed: t.postponed || 0
    })), total));
  }
});
