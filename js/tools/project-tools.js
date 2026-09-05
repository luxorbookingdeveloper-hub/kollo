/* ============================================================================
   كله — Kollo | AI Tools: Project & Task Hierarchy / Dependency Tools
   ============================================================================ */
registerTool({
  name: 'create_project',
  description: 'Create a project.',
  risk: 'write',
  parameters: P({ name: S_STR, due: S_STR, note: S_STR }, ['name']),
  handler: async a => {
    const p = await R.projects.add({
      name: a.name,
      status: 'active',
      due: a.due ? parseNatDate(a.due) : null,
      note: a.note || ''
    });
    return OK({ id: p.id }, { affected: 1 });
  }
});

registerTool({
  name: 'breakdown_task_into_subtasks',
  description: 'Split a task into concrete subtasks.',
  risk: 'write',
  parameters: P({ id: S_STR, steps: { type: 'array', items: S_STR } }, ['id', 'steps']),
  handler: async a => {
    const t = await R.tasks.get(a.id);
    if (!t) return ERR('المهمة مش موجودة');
    const steps = (a.steps || []).filter(Boolean);
    if (!steps.length) return ERR('مفيش خطوات');
    const ids = [];
    for (const s of steps) {
      const r = await R.tasks.add({
        title: s,
        status: 'todo',
        parentId: t.id,
        due: t.due,
        priority: t.priority || 3
      });
      ids.push(r.id);
    }
    return OK({ parent: t.title, ids }, { affected: ids.length });
  }
});

registerTool({
  name: 'link_task_dependency',
  description: 'Mark task A blocked by task B.',
  risk: 'write',
  parameters: P({ taskId: S_STR, blockedBy: S_STR }, ['taskId', 'blockedBy']),
  handler: async a => {
    const t = await R.tasks.get(a.taskId);
    if (!t) return ERR('المهمة مش موجودة');
    const r = await R.tasks.patch(a.taskId, { blockedBy: a.blockedBy, status: 'blocked' });
    return OK({ id: r.id }, { affected: 1 });
  }
});
