/* ============================================================================
   كله — Kollo | Automation Engine (triggers, actions, evaluator)
   ============================================================================ */
const Auto = {
  triggers: {
    daily_morning: 'كل يوم الصبح',
    task_overdue: 'مهمة فاتت',
    budget_80: 'الميزانية وصلت ٨٠٪',
    doc_expiry: 'مستند قرب ينتهي',
    habit_missed: 'عادة فاتت',
    sub_due: 'اشتراك قرب'
  },
  actions: {
    create_task: 'اعمل مهمة',
    notify: 'نبّهني',
    log_note: 'سجّل مذكرة'
  },
  async run(dry) {
    const out = [];
    const list = (await R.automations.all()).filter(a => a.active !== false);
    const ctx = {
      overdue: (await R.tasks.all()).filter(t => t.status !== 'done' && t.due && t.due < today()),
      docs: (await R.documents.all()).filter(d => d.expiry && d.expiry <= addDays(today(), 30)),
      subs: (await R.subscriptions.all()).filter(s => s.nextDue && s.nextDue <= addDays(today(), 7))
    };

    for (const a of list) {
      let fire = false, why = '';
      if (a.trigger === 'daily_morning') {
        fire = (a.lastRun || '') < today();
        why = 'يوم جديد';
      }
      if (a.trigger === 'task_overdue') {
        fire = ctx.overdue.length > 0;
        why = ctx.overdue.length + ' مهمة فاتت';
      }
      if (a.trigger === 'doc_expiry') {
        fire = ctx.docs.length > 0;
        why = ctx.docs.length + ' مستند قرب ينتهي';
      }
      if (a.trigger === 'sub_due') {
        fire = ctx.subs.length > 0;
        why = ctx.subs.length + ' اشتراك قرب';
      }
      if (a.trigger === 'budget_80') {
        const st = await budgetStatus(monthKey());
        fire = st.some(b => b.pct >= 80);
        why = 'ميزانية قربت تخلص';
      }
      if (!fire) continue;
      out.push({ automation: a.name, why, action: a.action, payload: a.payload || {} });
      if (dry) continue;

      if (a.action === 'create_task') {
        await R.tasks.add({
          title: (a.payload && a.payload.title) || a.name,
          status: 'todo',
          due: today(),
          priority: 2,
          tags: ['أوتوميشن']
        });
      }
      if (a.action === 'notify') UI.toast('⚙️ ' + a.name + ' — ' + why);
      if (a.action === 'log_note') {
        await R.notes.add({
          title: 'أوتوميشن: ' + a.name,
          body: why,
          tags: ['أوتوميشن']
        });
      }
      await R.automations.patch(a.id, { lastRun: today(), runs: (a.runs || 0) + 1 });
    }
    return out;
  }
};

window.Auto = Auto;
