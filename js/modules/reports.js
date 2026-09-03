/* ============================================================================
   كله — Kollo | Module: Reports (التقارير وسجل النشاط)
   Aggregations, CSV export, Print/PDF, and Activity audit log
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.reports = async () => {
  const box = document.createElement('div');

  const bar = document.createElement('div');
  bar.className = 'row wrap';

  const pr = document.createElement('button');
  pr.className = 'b';
  pr.textContent = '🖨️ اطبع/PDF';
  pr.onclick = () => window.print();

  const cs = document.createElement('button');
  cs.className = 'b';
  cs.textContent = '⬇️ CSV للمعاملات';
  cs.onclick = exportTxnsCSV;

  bar.append(pr, cs);
  box.appendChild(bar);

  const tasks = await R.tasks.all();
  const tx = await R.txns.all();
  const hl = await R.habitLogs.all();
  const tl = await R.timeLogs.all();

  const k = document.createElement('div');
  k.className = 'grid g3';
  k.style.marginTop = '12px';

  [
    ['مهام خلصت', fmtN(tasks.filter(t => t.status === 'done').length, 0)],
    ['معاملات', fmtN(tx.length, 0)],
    ['تسجيلات عادات', fmtN(hl.length, 0)],
    ['ساعات شغل', fmtN(Math.round(tl.reduce((s, t) => s + (+t.minutes || 0), 0) / 60), 0)]
  ].forEach(([l, v]) => {
    const c = document.createElement('div');
    c.className = 'card kpi';
    const a = document.createElement('div');
    a.className = 'xs dim';
    a.textContent = l;
    const b = document.createElement('b');
    b.textContent = v;
    c.append(a, b);
    k.appendChild(c);
  });
  box.appendChild(k);

  if (tx.length) {
    const cats = await R.categories.all();
    const agg = await WK.call({
      op: 'agg',
      rows: tx.filter(t => t.type === 'expense').map(t => ({
        k: (cats.find(c => c.id === t.categoryId) || {}).name || 'متنوع',
        v: Math.abs(+t.amount || 0)
      }))
    });

    const c = document.createElement('div');
    c.className = 'card pad';
    c.style.marginTop = '12px';
    const h = document.createElement('div');
    h.style.fontWeight = '800';
    h.textContent = 'المصاريف بالتصنيف (كل الفترة)';
    c.appendChild(h);
    c.appendChild(Chart.bars(agg.slice(0, 10).map(x => ({ l: x.k, v: x.v }))));

    const dlBtn = document.createElement('button');
    dlBtn.className = 'b sm';
    dlBtn.style.marginTop = '8px';
    dlBtn.textContent = '⬇️ حمّل الجراف PNG';
    dlBtn.onclick = () => {
      const cv2 = c.querySelector('canvas');
      const a2 = document.createElement('a');
      a2.href = cv2.toDataURL('image/png');
      a2.download = 'kollo-chart.png';
      a2.click();
    };
    c.appendChild(dlBtn);
    box.appendChild(c);
  }

  const wr = document.createElement('div');
  wr.className = 'card pad';
  wr.style.marginTop = '12px';
  wr.appendChild(mdLite(await weeklyReview()));
  box.appendChild(wr);

  const log = await R.activityLog.byIndex('at', null, 60, 'prev');
  const c2 = document.createElement('div');
  c2.className = 'card';
  c2.style.marginTop = '12px';

  const h2 = document.createElement('div');
  h2.className = 'pad';
  h2.style.fontWeight = '800';
  h2.textContent = 'سجل النشاط — مين عمل إيه وامتى';
  c2.appendChild(h2);

  if (!log.length) {
    c2.appendChild(UI.empty('السجل فاضي', 'أي تغيير هيتسجّل هنا.', null));
  }

  log.forEach(l => {
    const li = document.createElement('div');
    li.className = 'li xs';
    const m = document.createElement('div');
    m.style.flex = '1';
    m.textContent = (l.action === 'add' ? 'إضافة' : l.action === 'update' ? 'تعديل' : 'حذف') + ' في ' + l.store;

    const d = document.createElement('div');
    d.className = 'dim';
    d.textContent = fmtDate(l.at, { hour: '2-digit', minute: '2-digit' });
    li.append(m, d);
    c2.appendChild(li);
  });
  box.appendChild(c2);

  return box;
};

function dl(name, text, type) {
  const b = new Blob([text], { type: type || 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
}

async function exportTxnsCSV() {
  const tx = await R.txns.all();
  const cats = await R.categories.all(),
    accs = await R.accounts.all();
  const rows = [['التاريخ', 'النوع', 'المبلغ', 'الحساب', 'التصنيف', 'ملاحظة']].concat(
    tx.map(t => [
      t.date,
      t.type,
      t.amount,
      (accs.find(a => a.id === t.accountId) || {}).name || '',
      (cats.find(c => c.id === t.categoryId) || {}).name || '',
      (t.note || '').replace(/"/g, '""')
    ])
  );
  dl('kollo-txns.csv', '\uFEFF' + rows.map(r => r.map(x => '"' + String(x == null ? '' : x) + '"').join(',')).join('\n'), 'text/csv');
  UI.toast('نزّلنا CSV');
}

Object.assign(window, {
  dl, exportTxnsCSV
});
