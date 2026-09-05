/* ============================================================================
   كله — Kollo | AI Tools: Transactions & Accounts
   ============================================================================ */

registerTool({
  name: 'add_transaction',
  description: 'Add one transaction (expense/income/transfer). Category and account created if missing by name.',
  risk: 'write',
  parameters: P({
    type: S_STR,
    amount: S_NUM,
    date: S_STR,
    category: S_STR,
    account: S_STR,
    toAccount: S_STR,
    note: S_STR
  }, ['type', 'amount']),
  handler: async a => {
    const amt = num(a.amount);
    if (!amt && amt !== 0) return ERR('المبلغ مش رقم');
    const accs = await R.accounts.all();
    let acc = a.account ? accs.find(x => x.name === a.account) : accs[0];
    if (!acc) acc = a.account ? await R.accounts.add({ name: a.account, type: 'cash', opening: 0 }) : await defaultAccount();
    let cat = null;
    if (a.category) cat = await ensureCategory(a.category, a.type === 'income' ? 'income' : 'expense');
    let to = null;
    if (a.toAccount) {
      to = accs.find(x => x.name === a.toAccount) || await R.accounts.add({ name: a.toAccount, type: 'cash', opening: 0 });
    }
    const t = await R.txns.add({
      type: a.type,
      amount: Math.abs(amt),
      date: a.date ? parseNatDate(a.date) : today(),
      accountId: acc.id,
      toAccountId: to ? to.id : null,
      categoryId: cat ? cat.id : null,
      note: a.note || ''
    });
    return OK({ id: t.id, amount: t.amount, account: acc.name, category: cat ? cat.name : null }, { affected: 1 });
  }
});

registerTool({
  name: 'add_transactions_bulk',
  description: 'Add many transactions at once.',
  risk: 'write',
  parameters: P({
    items: {
      type: 'array',
      items: P({ type: S_STR, amount: S_NUM, category: S_STR, date: S_STR, note: S_STR }, ['amount'])
    }
  }, ['items']),
  handler: async a => {
    const list = (a.items || []).filter(x => x && num(x.amount) != null);
    if (!list.length) return ERR('مفيش عناصر');
    let total = 0;
    const ids = [];
    for (const it of list) {
      const r = await TOOLS.add_transaction.handler(Object.assign({ type: 'expense' }, it));
      if (r.ok) {
        ids.push(r.data.id);
        total += Math.abs(num(it.amount, 0));
      }
    }
    return OK({ ids, total }, { affected: ids.length });
  }
});

registerTool({
  name: 'parse_and_add_expenses_from_text',
  description: 'Parse Egyptian free text like "قهوة ٤٥، مواصلات ٢٠" into expenses and save them.',
  risk: 'write',
  parameters: P({ text: S_STR, date: S_STR }, ['text']),
  handler: async a => {
    const items = parseExpenses(a.text);
    if (!items.length) return ERR('مش لاقي مبالغ في النص');
    const acc = await defaultAccount();
    const out = [];
    for (const it of items) {
      const c = await ensureCategory(it.category);
      const t = await R.txns.add({
        type: 'expense',
        amount: it.amount,
        date: a.date ? parseNatDate(a.date) : today(),
        accountId: acc.id,
        categoryId: c.id,
        note: it.label
      });
      out.push({ id: t.id, label: it.label, amount: it.amount, category: it.category });
    }
    return OK({ items: out, total: out.reduce((s, x) => s + x.amount, 0) }, { affected: out.length });
  }
});

registerTool({
  name: 'create_account',
  description: 'Create a money account (cash/bank/wallet).',
  risk: 'write',
  parameters: P({ name: S_STR, type: S_STR, opening: S_NUM }, ['name']),
  handler: async a => {
    const r = await R.accounts.add({ name: a.name, type: a.type || 'cash', opening: num(a.opening, 0) });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'transfer_between_accounts',
  description: 'Transfer money between two accounts by name.',
  risk: 'write',
  parameters: P({ from: S_STR, to: S_STR, amount: S_NUM }, ['from', 'to', 'amount']),
  handler: async a => TOOLS.add_transaction.handler({
    type: 'transfer',
    amount: a.amount,
    account: a.from,
    toAccount: a.to,
    note: 'تحويل'
  })
});
