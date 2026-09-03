/* ============================================================================
   كله — Kollo | AI Tools: Automation Tools
   ============================================================================ */
/* --- أوتوميشن --- */
registerTool({
  name: 'create_automation',
  description: 'Create an automation: trigger → action.',
  risk: 'write',
  parameters: P({ name: S_STR, trigger: S_STR, action: S_STR, payload: { type: 'object' } }, ['name', 'trigger', 'action']),
  handler: async a => {
    if (!Auto.triggers[a.trigger]) return ERR('trigger مش معروف. المتاح: ' + Object.keys(Auto.triggers).join(', '));
    if (!Auto.actions[a.action]) return ERR('action مش معروف. المتاح: ' + Object.keys(Auto.actions).join(', '));
    const r = await R.automations.add({
      name: a.name,
      trigger: a.trigger,
      action: a.action,
      payload: a.payload || {},
      active: true,
      runs: 0
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'list_automations',
  description: 'List automations.',
  risk: 'read',
  parameters: P({}),
  handler: async () => OK(cap((await R.automations.all()).map(x => ({
    id: x.id,
    name: x.name,
    trigger: x.trigger,
    action: x.action,
    active: x.active !== false,
    runs: x.runs || 0
  }))))
});

registerTool({
  name: 'toggle_automation',
  description: 'Enable/disable an automation.',
  risk: 'write',
  parameters: P({ id: S_STR, active: S_BOOL }, ['id', 'active']),
  handler: async a => {
    if (!await R.automations.get(a.id)) return ERR('مش موجود');
    const r = await R.automations.patch(a.id, { active: !!a.active });
    return OK({ id: r.id, active: r.active }, { affected: 1 });
  }
});

registerTool({
  name: 'simulate_automation',
  description: 'Dry-run all automations and report what would happen.',
  risk: 'read',
  parameters: P({}),
  handler: async () => OK({ wouldRun: await Auto.run(true) })
});

