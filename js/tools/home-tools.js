/* ============================================================================
   كله — Kollo | AI Tools: Home, Vehicle & Document Tools
   ============================================================================ */
/* --- بيت/ممتلكات/مستندات --- */
registerTool({
  name: 'add_asset',
  description: 'Add an owned asset.',
  risk: 'write',
  parameters: P({ name: S_STR, category: S_STR, value: S_NUM, boughtAt: S_STR }, ['name']),
  handler: async a => {
    const r = await R.assets.add({
      name: a.name,
      category: a.category || 'متنوع',
      value: num(a.value),
      boughtAt: a.boughtAt ? parseNatDate(a.boughtAt) : null
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'add_warranty',
  description: 'Add a warranty with expiry.',
  risk: 'write',
  parameters: P({ name: S_STR, expiry: S_STR, note: S_STR }, ['name', 'expiry']),
  handler: async a => {
    const r = await R.warranties.add({
      name: a.name,
      expiry: parseNatDate(a.expiry),
      note: a.note || ''
    });
    return OK({ id: r.id, expiry: r.expiry }, { affected: 1 });
  }
});

registerTool({
  name: 'add_vehicle_service',
  description: 'Schedule vehicle maintenance by date or km.',
  risk: 'write',
  parameters: P({ vehicleId: S_STR, title: S_STR, due: S_STR, km: S_NUM, cost: S_NUM }, ['title']),
  handler: async a => {
    const r = await R.maintenance.add({
      vehicleId: a.vehicleId || null,
      title: a.title,
      due: a.due ? parseNatDate(a.due) : null,
      km: num(a.km),
      cost: num(a.cost)
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'schedule_maintenance',
  description: 'Alias for scheduling a home/asset maintenance item.',
  risk: 'write',
  parameters: P({ title: S_STR, due: S_STR, cost: S_NUM }, ['title']),
  handler: async a => TOOLS.add_vehicle_service.handler(a)
});

registerTool({
  name: 'add_bill_reading',
  description: 'Add a utility bill reading/amount.',
  risk: 'write',
  parameters: P({ kind: S_STR, reading: S_NUM, amount: S_NUM, date: S_STR }, ['kind']),
  handler: async a => {
    const r = await R.bills.add({
      kind: a.kind,
      reading: num(a.reading),
      amount: num(a.amount),
      date: a.date ? parseNatDate(a.date) : today()
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'list_expiring_documents',
  description: 'Documents/warranties expiring within N days (default 90).',
  risk: 'read',
  parameters: P({ days: S_NUM }),
  handler: async a => {
    const lim = addDays(today(), num(a.days, 90));
    const docs = (await R.documents.all()).filter(d => d.expiry && d.expiry <= lim).map(d => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      expiry: d.expiry,
      inDays: Math.round((new Date(d.expiry) - new Date(today())) / dayMs)
    }));
    const w = (await R.warranties.all()).filter(d => d.expiry && d.expiry <= lim).map(d => ({
      id: d.id,
      name: d.name,
      kind: 'ضمان',
      expiry: d.expiry
    }));
    return OK({ documents: docs, warranties: w, total: docs.length + w.length });
  }
});

