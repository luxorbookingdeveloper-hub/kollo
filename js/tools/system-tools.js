/* ============================================================================
   كله — Kollo | AI Tools: System & Diagnostic Tools
   ============================================================================ */
/* --- نظام --- */
registerTool({
  name: 'export_backup',
  description: 'Download a full JSON backup of all data.',
  risk: 'destructive',
  parameters: P({ withAttachments: S_BOOL }),
  handler: async a => {
    const data = await exportAll(!!a.withAttachments);
    dl('kashkool-backup-' + today() + '.json', JSON.stringify(data));
    return OK({ rows: Object.keys(data.stores).reduce((s, k) => s + data.stores[k].length, 0) });
  }
});

registerTool({
  name: 'import_backup',
  description: 'Open the import screen (import itself needs the user to pick a file).',
  risk: 'destructive',
  parameters: P({}),
  handler: async () => {
    backupUI();
    return OK({ opened: true, note: 'المستخدم لازم يختار الملف بنفسه' });
  }
});

registerTool({
  name: 'storage_usage',
  description: 'Storage used/available and per-store row counts.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    let est = {};
    try { est = await navigator.storage.estimate(); } catch (e) { est = {}; }
    const counts = {};
    for (const s of Object.keys(SCHEMA)) counts[s] = await dbCount(s);
    return OK({
      usageMB: est.usage ? +(est.usage / 1048576).toFixed(2) : null,
      quotaMB: est.quota ? +(est.quota / 1048576).toFixed(0) : null,
      counts
    });
  }
});

registerTool({
  name: 'undo_last_agent_batch',
  description: 'Undo the last batch of changes the agent made.',
  risk: 'write',
  parameters: P({}),
  handler: async () => {
    const b = await Hist.undo();
    return b ? OK({ undone: b.label, ops: b.ops.length }) : ERR('مفيش حاجة نرجّعها');
  }
});

registerTool({
  name: 'list_recent_activity',
  description: 'Recent activity log entries.',
  risk: 'read',
  parameters: P({ limit: S_NUM }),
  handler: async a => {
    const rows = await R.activityLog.byIndex('at', null, num(a.limit, 30), 'prev');
    return OK(cap(rows.map(r => ({ at: r.at, store: r.store, action: r.action }))));
  }
});

registerTool({
  name: 'restore_from_trash',
  description: 'Restore a soft-deleted item from trash.',
  risk: 'write',
  parameters: P({ store: S_STR, id: S_STR }, ['store', 'id']),
  handler: async a => {
    if (!R[a.store]) return ERR('جدول مش موجود');
    const r = await R[a.store].restore(a.id);
    return r ? OK({ id: r.id }, { affected: 1 }) : ERR('مش موجود');
  }
});

registerTool({
  name: 'empty_trash',
  description: 'Permanently delete everything in trash. Irreversible.',
  risk: 'destructive',
  parameters: P({}),
  handler: async () => {
    const rows = await dbAll('trash');
    for (const r of rows) {
      await dbDel(r.store, r.refId);
      await dbDel('trash', r.id);
    }
    return OK({ purged: rows.length }, { affected: rows.length });
  }
});

registerTool({
  name: 'aggregate',
  description: 'Generic aggregation over any store: group rows by a field and sum another. Use it instead of guessing numbers.',
  risk: 'read',
  parameters: P({
    store: S_STR,
    groupBy: S_STR,
    sumField: S_STR,
    from: S_STR,
    to: S_STR,
    dateField: S_STR
  }, ['store', 'groupBy']),
  handler: async a => {
    if (!R[a.store]) return ERR('جدول مش موجود. المتاح: ' + Object.keys(SCHEMA).join(', '));
    let rows = await R[a.store].all();
    const df = a.dateField || 'date';
    if (a.from) rows = rows.filter(r => String(r[df] || '') >= parseNatDate(a.from));
    if (a.to) rows = rows.filter(r => String(r[df] || '') <= parseNatDate(a.to));
    const agg = await WK.call({ op: 'agg', rows: rows.map(r => ({ k: r[a.groupBy], v: a.sumField ? (+r[a.sumField] || 0) : 1 })) });
    return OK({ store: a.store, groups: agg, rowsCounted: rows.length });
  }
});

