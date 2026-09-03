/* ============================================================================
   كله — Kollo | AI Tools: Goals & OKR Tools
   ============================================================================ */
/* --- أهداف --- */
registerTool({
  name: 'create_goal',
  description: 'Create a goal with life area and horizon.',
  risk: 'write',
  parameters: P({ title: S_STR, area: S_STR, horizon: S_STR, why: S_STR }, ['title']),
  handler: async a => {
    const r = await R.goals.add({
      title: a.title,
      area: a.area || 'شغل',
      horizon: a.horizon || 'quarter',
      why: a.why || '',
      status: 'active'
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'add_key_result',
  description: 'Add a measurable key result to a goal.',
  risk: 'write',
  parameters: P({ goalId: S_STR, name: S_STR, target: S_NUM, unit: S_STR }, ['goalId', 'name', 'target']),
  handler: async a => {
    if (!await R.goals.get(a.goalId)) return ERR('الهدف مش موجود');
    const r = await R.keyResults.add({
      goalId: a.goalId,
      name: a.name,
      target: num(a.target),
      current: 0,
      unit: a.unit || ''
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'update_key_result_progress',
  description: 'Update current value of a key result.',
  risk: 'write',
  parameters: P({ id: S_STR, current: S_NUM }, ['id', 'current']),
  handler: async a => {
    const k = await R.keyResults.get(a.id);
    if (!k) return ERR('النتيجة مش موجودة');
    const r = await R.keyResults.patch(a.id, { current: num(a.current) });
    return OK({ id: r.id, pct: Math.round((r.current / (r.target || 1)) * 100) }, { affected: 1 });
  }
});

registerTool({
  name: 'goal_progress_report',
  description: 'Progress for all goals from real key results.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const gs = await R.goals.all();
    const krs = await R.keyResults.all();
    return OK(gs.map(g => {
      const mine = krs.filter(k => k.goalId === g.id);
      return {
        id: g.id,
        title: g.title,
        area: g.area,
        keyResults: mine.map(k => ({
          name: k.name,
          current: k.current,
          target: k.target,
          pct: Math.round((k.current / (k.target || 1)) * 100)
        })),
        pct: mine.length ? Math.round((mine.reduce((s, k) => s + clamp(k.current / (k.target || 1), 0, 1), 0) / mine.length) * 100) : null
      };
    }));
  }
});

registerTool({
  name: 'generate_weekly_review_draft',
  description: 'Generate the weekly review draft from real data (markdown).',
  risk: 'read',
  parameters: P({}),
  handler: async () => OK({ markdown: await weeklyReview() })
});

