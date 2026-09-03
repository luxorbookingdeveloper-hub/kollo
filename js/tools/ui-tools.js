/* ============================================================================
   كله — Kollo | AI Tools: UI Control & Chart Tools
   ============================================================================ */
/* --- تحكم في الواجهة (Agentic UI) --- */
registerTool({
  name: 'navigate_to',
  description: 'Navigate the app to a module: ' + MODULES.map(m => m.k).join(', '),
  risk: 'write',
  parameters: P({ module: S_STR, params: S_STR }, ['module']),
  handler: async a => {
    if (!MODULES.some(m => m.k === a.module)) return ERR('مودول مش موجود');
    Router.go(a.module + (a.params ? '?' + a.params : ''));
    return OK({ module: a.module });
  }
});

registerTool({
  name: 'open_entity',
  description: 'Open an entity editor by store and id.',
  risk: 'write',
  parameters: P({ store: S_STR, id: S_STR }, ['store', 'id']),
  handler: async a => {
    if (!R[a.store]) return ERR('جدول مش موجود');
    const rec = await R[a.store].get(a.id);
    if (!rec) return ERR('العنصر مش موجود');
    openEditor(a.store, rec);
    return OK({ opened: true });
  }
});

registerTool({
  name: 'apply_filter',
  description: 'Apply a filter/query in the current module via URL params.',
  risk: 'write',
  parameters: P({ module: S_STR, params: S_STR }, ['module', 'params']),
  handler: async a => {
    Router.go(a.module + '?' + a.params);
    return OK({ applied: true });
  }
});

registerTool({
  name: 'set_theme',
  description: 'Change theme: light|dark|retro|auto.',
  risk: 'write',
  parameters: P({ theme: S_STR }, ['theme']),
  handler: async a => {
    if (['light', 'dark', 'retro', 'auto'].indexOf(a.theme) < 0) return ERR('ثيم مش معروف');
    await saveSettings({ theme: a.theme });
    return OK({ theme: a.theme });
  }
});

registerTool({
  name: 'toggle_module_visibility',
  description: 'Show/hide a module in navigation.',
  risk: 'write',
  parameters: P({ module: S_STR, visible: S_BOOL }, ['module', 'visible']),
  handler: async a => {
    const m = Object.assign({}, S.settings.modules);
    m[a.module] = !!a.visible;
    await saveSettings({ modules: m });
    buildNav();
    return OK({ module: a.module, visible: !!a.visible });
  }
});

registerTool({
  name: 'render_chart',
  description: 'Render a real chart in chat from the user data. kind: line|bars|donut|radar. Provide data as [{l,v}].',
  risk: 'write',
  parameters: P({ kind: S_STR, title: S_STR, data: { type: 'array', items: P({ l: S_STR, v: S_NUM }, ['l', 'v']) } }, ['kind', 'data']),
  handler: async a => {
    if (!(a.data || []).length) return ERR('مفيش داتا للجراف');
    S.cache.pendingChart = { kind: a.kind, title: a.title || '', data: a.data };
    return OK({ rendered: true, points: a.data.length });
  }
});

registerTool({
  name: 'show_confirm_dialog',
  description: 'Ask the user a yes/no question before a sensitive step.',
  risk: 'write',
  parameters: P({ title: S_STR, text: S_STR }, ['title']),
  handler: async a => {
    const yes = await UI.confirm(a.title, a.text || '');
    return OK({ confirmed: yes });
  }
});

registerTool({
  name: 'highlight_element',
  description: 'Toast a hint pointing the user to a screen.',
  risk: 'write',
  parameters: P({ text: S_STR }, ['text']),
  handler: async a => {
    UI.toast('👉 ' + a.text);
    return OK({ shown: true });
  }
});

registerTool({
  name: 'start_focus_mode',
  description: 'Open focus mode on the top-priority open task.',
  risk: 'write',
  parameters: P({}),
  handler: async () => {
    await startFocus();
    return OK({ started: true });
  }
});

