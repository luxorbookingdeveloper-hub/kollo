/* ============================================================================
   كله — Kollo | AI Tools: Budget, Debts, Subscriptions & Gam3iyat
   ============================================================================ */

registerTool({
  name: 'set_budget',
  description: 'Set a monthly budget cap for a category.',
  risk: 'write',
  parameters: P({ category: S_STR, amount: S_NUM, month: S_STR }, ['category', 'amount']),
  handler: async a => {
    const c = await ensureCategory(a.category);
    const mk = a.month || monthKey();
    const ex = (await R.budgets.all()).find(b => b.categoryId === c.id && b.month === mk);
    const r = ex
      ? await R.budgets.patch(ex.id, { amount: num(a.amount) })
      : await R.budgets.add({ categoryId: c.id, amount: num(a.amount), month: mk });
    return OK({ id: r.id, category: c.name, month: mk, amount: r.amount }, { affected: 1 });
  }
});

registerTool({
  name: 'get_budget_status',
  description: 'Budget vs actual spending for a month, computed from real transactions.',
  risk: 'read',
  parameters: P({ month: S_STR }),
  handler: async a => OK(await budgetStatus(a.month || monthKey()))
});

registerTool({
  name: 'add_debt',
  description: 'Record a debt: owe (عليّ) or lent (ليّ).',
  risk: 'write',
  parameters: P({ name: S_STR, dir: S_STR, amount: S_NUM, due: S_STR, note: S_STR }, ['name', 'dir', 'amount']),
  handler: async a => {
    if (['owe', 'lent'].indexOf(a.dir) < 0) return ERR('dir لازم owe أو lent');
    const r = await R.debts.add({
      name: a.name,
      dir: a.dir,
      amount: num(a.amount),
      remaining: num(a.amount),
      due: a.due ? parseNatDate(a.due) : null,
      note: a.note || '',
      status: 'open'
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'record_debt_payment',
  description: 'Record a payment against a debt.',
  risk: 'write',
  parameters: P({ id: S_STR, amount: S_NUM }, ['id', 'amount']),
  handler: async a => {
    const d = await R.debts.get(a.id);
    if (!d) return ERR('الدين مش موجود');
    const rem = Math.max(0, (num(d.remaining, num(d.amount, 0))) - num(a.amount, 0));
    const r = await R.debts.patch(a.id, { remaining: rem, status: rem ? 'open' : 'closed' });
    return OK({ id: r.id, remaining: rem, closed: !rem }, { affected: 1 });
  }
});

registerTool({
  name: 'add_subscription',
  description: 'Add a recurring subscription.',
  risk: 'write',
  parameters: P({ name: S_STR, amount: S_NUM, cycle: S_STR, nextDue: S_STR }, ['name', 'amount']),
  handler: async a => {
    const r = await R.subscriptions.add({
      name: a.name,
      amount: num(a.amount),
      cycle: a.cycle || 'monthly',
      nextDue: a.nextDue ? parseNatDate(a.nextDue) : addDays(today(), 30)
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'forecast_next_month',
  description: 'Forecast next month expenses = average of last 6 months of real transactions + known subscriptions/installments.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const m = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = monthKey(ymd(d));
      m.push({
        month: k,
        expense: (await txnsBetween(k + '-01', k + '-31')).filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(+t.amount || 0), 0)
      });
    }
    const nonZero = m.filter(x => x.expense > 0);
    const avg = nonZero.length ? nonZero.reduce((s, x) => s + x.expense, 0) / nonZero.length : 0;
    const subs = (await R.subscriptions.all()).reduce((s, x) => s + (x.cycle === 'monthly' ? +x.amount || 0 : 0), 0);
    const inst = (await R.installments.all()).reduce((s, x) => s + (+x.amount || 0), 0);
    return OK({
      months: m,
      average: Math.round(avg),
      knownSubscriptions: subs,
      knownInstallments: inst,
      forecast: Math.round(avg),
      basis: 'متوسط ' + nonZero.length + ' شهر فيهم معاملات مسجّلة',
      disclaimer: 'رقم تقديري من داتا المستخدم فقط، مش نصيحة مالية'
    });
  }
});

registerTool({
  name: 'spending_by_category',
  description: 'Spending grouped by category for a period.',
  risk: 'read',
  parameters: P({ from: S_STR, to: S_STR }),
  handler: async a => {
    const f = a.from ? parseNatDate(a.from) : startOfMonth(), t = a.to ? parseNatDate(a.to) : today();
    const tx = (await txnsBetween(f, t)).filter(x => x.type === 'expense');
    const cats = await R.categories.all();
    const agg = await WK.call({
      op: 'agg',
      rows: tx.map(x => ({
        k: (cats.find(c => c.id === x.categoryId) || {}).name || 'متنوع',
        v: Math.abs(+x.amount || 0)
      }))
    });
    return OK({ from: f, to: t, total: agg.reduce((s, x) => s + x.v, 0), byCategory: agg });
  }
});

registerTool({
  name: 'net_worth_snapshot',
  description: 'Balances per account, total cash, owed, lent, net — all computed.',
  risk: 'read',
  parameters: P({}),
  handler: async () => OK(await netWorth())
});

registerTool({
  name: 'create_gam3ia',
  description: 'Create a gam3ia (Egyptian saving circle).',
  risk: 'write',
  parameters: P({ name: S_STR, amount: S_NUM, members: S_NUM, myTurn: S_NUM, startDate: S_STR }, ['name', 'amount', 'members']),
  handler: async a => {
    const r = await R.gam3iyat.add({
      name: a.name,
      amount: num(a.amount),
      members: num(a.members),
      myTurn: num(a.myTurn),
      startDate: a.startDate ? parseNatDate(a.startDate) : today(),
      rounds: [],
      status: 'active'
    });
    return OK({ id: r.id, payout: num(a.amount) * num(a.members) }, { affected: 1 });
  }
});

registerTool({
  name: 'record_gam3ia_round',
  description: 'Record paying one gam3ia round (also logs the expense).',
  risk: 'write',
  parameters: P({ id: S_STR }, ['id']),
  handler: async a => {
    const g = await R.gam3iyat.get(a.id);
    if (!g) return ERR('الجمعية مش موجودة');
    const rounds = (g.rounds || []).concat([{ date: today(), amount: +g.amount || 0 }]);
    await R.gam3iyat.patch(a.id, { rounds });
    const acc = await defaultAccount();
    const c = await ensureCategory('جمعية');
    await R.txns.add({
      type: 'expense',
      amount: +g.amount || 0,
      date: today(),
      accountId: acc.id,
      categoryId: c.id,
      note: 'جمعية: ' + g.name
    });
    return OK({ rounds: rounds.length, of: g.members }, { affected: 2 });
  }
});
