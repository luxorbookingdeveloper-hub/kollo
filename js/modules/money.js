/* ============================================================================
   كله — Kollo | Module: Money (الفلوس)
   Accounts, Transactions, Budgets, Debts, Subscriptions, Gam3iya, and Zakat
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.money = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'overview';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';
  seg.setAttribute('role', 'tablist');
  [
    ['overview', 'نظرة عامة'],
    ['txns', 'المعاملات'],
    ['budgets', 'الميزانية'],
    ['debts', 'ديون وسلف'],
    ['subs', 'اشتراكات وأقساط'],
    ['gam3ia', 'الجمعية'],
    ['zakat', 'زكاة']
  ].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/money?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  const disc = document.createElement('div');
  disc.className = 'card pad xs muted';
  disc.style.marginBottom = '12px';
  disc.textContent = 'تنويه: المعلومات دي تنظيمية بس، وأنا مش مستشار مالي.';
  box.appendChild(disc);

  const nw = await netWorth();

  if (tab === 'overview') {
    await renderMoneyOverview(box, nw);
  } else if (tab === 'txns') {
    await renderMoneyTxns(box);
  } else if (tab === 'budgets') {
    await renderMoneyBudgets(box);
  } else if (tab === 'debts') {
    box.appendChild(await collectionView('debts', { emptyTitle: 'مفيش ديون ولا سلف', emptyText: 'الحمد لله — أو سجّل اللي عليك/ليك.' }));
  } else if (tab === 'subs') {
    const g = document.createElement('div');
    g.className = 'grid';
    g.appendChild(await collectionView('subscriptions', { emptyTitle: 'مفيش اشتراكات' }));
    g.appendChild(await collectionView('installments', { emptyTitle: 'مفيش أقساط' }));
    box.appendChild(g);
  } else if (tab === 'gam3ia') {
    await renderMoneyGam3ia(box);
  } else if (tab === 'zakat') {
    renderMoneyZakat(box);
  }
  return box;
};
