/* ============================================================================
   كله — Kollo | AI Tools: Notes & Linking Tools
   ============================================================================ */
/* --- مذكرات --- */
registerTool({
  name: 'create_note',
  description: 'Create a note. Body supports markdown-lite and [[wiki links]].',
  risk: 'write',
  parameters: P({ title: S_STR, body: S_STR, tags: { type: 'array', items: S_STR } }, ['title']),
  handler: async a => {
    const n = await R.notes.add({ title: a.title, body: a.body || '', tags: a.tags || [] });
    return OK({ id: n.id }, { affected: 1 });
  }
});

registerTool({
  name: 'append_to_note',
  description: 'Append text to an existing note.',
  risk: 'write',
  parameters: P({ id: S_STR, text: S_STR }, ['id', 'text']),
  handler: async a => {
    const n = await R.notes.get(a.id);
    if (!n) return ERR('المذكرة مش موجودة');
    const r = await R.notes.patch(a.id, { body: (n.body || '') + '\n' + a.text });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'update_note',
  description: 'Update a note title/body/tags.',
  risk: 'write',
  parameters: P({ id: S_STR, title: S_STR, body: S_STR, tags: { type: 'array', items: S_STR } }, ['id']),
  handler: async a => {
    if (!await R.notes.get(a.id)) return ERR('المذكرة مش موجودة');
    const f = {};
    ['title', 'body', 'tags'].forEach(k => { if (a[k] != null) f[k] = a[k]; });
    const r = await R.notes.patch(a.id, f);
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'search_notes',
  description: 'Search inside notes body and tags.',
  risk: 'read',
  parameters: P({ query: S_STR, limit: S_NUM }, ['query']),
  handler: async a => {
    const notes = await R.notes.all();
    const res = await WK.call({
      op: 'search',
      q: a.query,
      rows: notes.map(n => ({
        id: n.id,
        store: 'notes',
        title: n.title,
        text: (n.title || '') + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ')
      }))
    });
    return OK(cap(res.slice(0, num(a.limit, 20))));
  }
});

registerTool({
  name: 'link_notes',
  description: 'Add a [[wiki link]] from one note to another.',
  risk: 'write',
  parameters: P({ fromId: S_STR, toId: S_STR }, ['fromId', 'toId']),
  handler: async a => {
    const f = await R.notes.get(a.fromId), t = await R.notes.get(a.toId);
    if (!f || !t) return ERR('مذكرة مش موجودة');
    await R.notes.patch(a.fromId, { body: (f.body || '') + '\n[[' + t.title + ']]' });
    await R.noteLinks.add({ from: a.fromId, to: a.toId });
    return OK({ from: f.title, to: t.title }, { affected: 1 });
  }
});

registerTool({
  name: 'summarize_note',
  description: 'Return the note raw content so the model can summarize it (no invented content).',
  risk: 'read',
  parameters: P({ id: S_STR }, ['id']),
  handler: async a => {
    const n = await R.notes.get(a.id);
    if (!n) return ERR('المذكرة مش موجودة');
    return OK({ title: n.title, body: n.body, tags: n.tags, words: String(n.body || '').split(/\s+/).length });
  }
});

