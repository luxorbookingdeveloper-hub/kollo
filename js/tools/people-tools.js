/* ============================================================================
   كله — Kollo | AI Tools: People & Contact Tools
   ============================================================================ */
/* --- ناس --- */
registerTool({
  name: 'add_person',
  description: 'Add a person with relation, birthday, and contact cadence.',
  risk: 'write',
  parameters: P({ name: S_STR, relation: S_STR, phone: S_STR, birthday: S_STR, cadence: S_NUM }, ['name']),
  handler: async a => {
    const r = await R.people.add({
      name: a.name,
      relation: a.relation || '',
      phone: a.phone || '',
      birthday: a.birthday ? parseNatDate(a.birthday) : null,
      cadence: num(a.cadence)
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'log_contact',
  description: 'Record that you contacted a person today.',
  risk: 'write',
  parameters: P({ personId: S_STR, note: S_STR }, ['personId']),
  handler: async a => {
    const p = await R.people.get(a.personId);
    if (!p) return ERR('الشخص مش موجود');
    await R.people.patch(a.personId, { lastContact: today(), lastNote: a.note || '' });
    return OK({ name: p.name, date: today() }, { affected: 1 });
  }
});

registerTool({
  name: 'list_upcoming_birthdays',
  description: 'Birthdays in the next N days (default 30).',
  risk: 'read',
  parameters: P({ days: S_NUM }),
  handler: async a => {
    const d = num(a.days, 30);
    const ppl = (await R.people.all()).filter(p => p.birthday);
    const rows = ppl.map(p => {
      const md = String(p.birthday).slice(5);
      const y = new Date().getFullYear();
      let next = y + '-' + md;
      if (next < today()) next = (y + 1) + '-' + md;
      return {
        name: p.name,
        date: next,
        inDays: Math.round((new Date(next) - new Date(today())) / dayMs)
      };
    }).filter(x => x.inDays <= d).sort((a2, b) => a2.inDays - b.inDays);
    return OK(cap(rows));
  }
});

registerTool({
  name: 'add_social_duty',
  description: 'Record a social duty (wedding/funeral/invitation) with amount.',
  risk: 'write',
  parameters: P({ title: S_STR, kind: S_STR, date: S_STR, amount: S_NUM, personId: S_STR }, ['title']),
  handler: async a => {
    const r = await R.socialDuties.add({
      title: a.title,
      kind: a.kind || '',
      date: a.date ? parseNatDate(a.date) : today(),
      amount: num(a.amount),
      personId: a.personId || null
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'who_should_i_call',
  description: 'People whose contact cadence is overdue, from real lastContact data.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const rows = (await R.people.all())
      .filter(p => p.cadence && (!p.lastContact || new Date(p.lastContact).getTime() < Date.now() - p.cadence * dayMs))
      .map(p => ({ id: p.id, name: p.name, lastContact: p.lastContact || null, cadenceDays: p.cadence }));
    return OK(cap(rows));
  }
});

