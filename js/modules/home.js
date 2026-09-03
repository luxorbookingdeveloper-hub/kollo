/* ============================================================================
   كله — Kollo | Module: Home & Assets (البيت والممتلكات)
   Assets, Warranties, Vehicles & Maintenance, Bills & Readings
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.home = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'assets';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['assets', 'ممتلكات'], ['warranties', 'ضمانات'], ['vehicles', 'عربيات وصيانة'], ['bills', 'فواتير وقرايات']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/home?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'assets') {
    box.appendChild(await collectionView('assets', { emptyTitle: 'مفيش ممتلكات مسجّلة' }));
  } else if (tab === 'warranties') {
    box.appendChild(await collectionView('warranties', { emptyTitle: 'مفيش ضمانات' }));
  } else if (tab === 'vehicles') {
    const g = document.createElement('div');
    g.className = 'grid';
    g.appendChild(await collectionView('vehicles', { emptyTitle: 'مفيش عربيات' }));
    g.appendChild(await collectionView('maintenance', { emptyTitle: 'مفيش صيانة مجدولة' }));
    box.appendChild(g);
  } else {
    const bills = await R.bills.all();
    box.appendChild(await collectionView('bills', { emptyTitle: 'مفيش فواتير' }));

    if (bills.length) {
      const c = document.createElement('div');
      c.className = 'card pad';
      c.style.marginTop = '12px';

      const h = document.createElement('div');
      h.style.fontWeight = '800';
      h.textContent = 'مقارنة الفواتير بالشهور';
      c.appendChild(h);

      const agg = await WK.call({
        op: 'agg',
        rows: bills.map(b => ({ k: monthKey(b.date), v: +b.amount || 0 }))
      });
      c.appendChild(Chart.bars(agg.slice(0, 12).reverse().map(x => ({ l: x.k.slice(5), v: x.v }))));
      box.appendChild(c);
    }
  }
  return box;
};
