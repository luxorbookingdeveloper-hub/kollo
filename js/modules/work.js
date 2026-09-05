/* ============================================================================
   كله — Kollo | Module: Work & Time (الشغل والوقت)
   Time logging, Pomodoro timer coordinator, Clients, and Invoices
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.work = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'time';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['time', 'الوقت'], ['pomo', 'بومودورو'], ['clients', 'عملاء'], ['invoices', 'فواتير وتحصيل']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/work?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'time') {
    const logs = await R.timeLogs.all();
    const add = document.createElement('button');
    add.className = 'b p';
    add.textContent = '＋ سجّل وقت';
    add.onclick = () => openEditor('timeLogs', { date: today() });
    box.appendChild(add);

    if (logs.length) {
      const c = document.createElement('div');
      c.className = 'card pad';
      c.style.marginTop = '12px';

      const h = document.createElement('div');
      h.style.fontWeight = '800';
      h.textContent = 'ساعات آخر ١٤ يوم';
      c.appendChild(h);

      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(today(), -i);
        days.push({
          l: String(+d.slice(8)),
          v: Math.round(logs.filter(l => l.date === d).reduce((s, l) => s + (+l.minutes || 0), 0) / 6) / 10
        });
      }
      c.appendChild(Chart.bars(days));

      const t = document.createElement('div');
      t.className = 'sm muted';
      t.textContent = 'إجمالي مسجّل: ' + fmtN(Math.round(logs.reduce((s, l) => s + (+l.minutes || 0), 0) / 60), 1) + ' ساعة';
      c.appendChild(t);

      box.appendChild(c);
    }

    const l2 = document.createElement('div');
    l2.style.marginTop = '12px';
    l2.appendChild(await collectionView('timeLogs', { emptyTitle: 'مفيش وقت مسجّل' }));
    box.appendChild(l2);
  } else if (tab === 'pomo') {
    box.appendChild(pomodoroUI());
  } else if (tab === 'clients') {
    box.appendChild(await collectionView('clients', { emptyTitle: 'مفيش عملاء' }));
  } else {
    const inv = await R.invoices.all();
    box.appendChild(await collectionView('invoices', { emptyTitle: 'مفيش فواتير' }));

    const open = inv.filter(i => i.status !== 'paid');
    if (open.length) {
      const c = document.createElement('div');
      c.className = 'card pad sm';
      c.style.marginTop = '12px';
      c.textContent =
        'مستحق للتحصيل: ' +
        money(open.reduce((s, i) => s + (+i.amount || 0), 0)) +
        ' من ' +
        fmtN(open.length, 0) +
        ' فاتورة' +
        (open.some(i => i.due && i.due < today()) ? ' — فيهم متأخر، تحب تفكّر العميل بلطف؟' : '');
      box.appendChild(c);
    }
  }
  return box;
};
