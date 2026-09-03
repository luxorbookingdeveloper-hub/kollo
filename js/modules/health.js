/* ============================================================================
   كله — Kollo | Module: Health (الصحة)
   Health logs, medication tracker, doses, and trend charts
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.health = async () => {
  const box = document.createElement('div');
  const d = document.createElement('div');
  d.className = 'card pad sm muted';
  d.textContent =
    'التطبيق ده للتسجيل والتنظيم بس — مفيش أهداف وزن/سعرات ولا نصايح غذائية. أي تشخيص أو خطة، الدكتور أو أخصائي التغذية هو المرجع.';
  box.appendChild(d);

  const bar = document.createElement('div');
  bar.className = 'row wrap';
  bar.style.margin = '12px 0';
  [['نوم', '😴'], ['مياه', '💧'], ['تمرين', '🏃'], ['ضغط', '🩸'], ['سكر', '🍬'], ['نبض', '❤️']].forEach(([t, i]) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = i + ' ' + t;
    b.onclick = () =>
      UI.form({
        title: 'سجّل ' + t,
        fields: [
          { k: 'value', l: 'القيمة (زي ما هي)', t: 'text', req: true },
          { k: 'date', l: 'التاريخ', t: 'date', req: true },
          { k: 'note', l: 'ملاحظة', t: 'textarea' }
        ],
        values: { date: today() },
        onSave: async v => {
          Hist.begin('صحة');
          await R.healthLogs.add({ type: t, date: v.date, value: v.value, note: v.note });
          Hist.commit();
          UI.toast(T('save'), { undo: true });
          Router.render();
        }
      });
    bar.appendChild(b);
  });
  box.appendChild(bar);

  const meds = await R.meds.all();
  const c = document.createElement('div');
  c.className = 'card';
  const hh = document.createElement('div');
  hh.className = 'pad row';
  const t1 = document.createElement('div');
  t1.style.cssText = 'flex:1;font-weight:800';
  t1.textContent = 'الأدوية والالتزام';
  const ab = document.createElement('button');
  ab.className = 'b sm p';
  ab.textContent = '＋ دوا';
  ab.onclick = () => openEditor('meds', null);
  hh.append(t1, ab);
  c.appendChild(hh);

  if (!meds.length) {
    c.appendChild(
      UI.empty('مفيش أدوية', 'سجّل الدوا بالجرعة اللي الدكتور قالها، وهنفكّرك بس.', {
        label: '＋ دوا',
        fn: () => openEditor('meds', null)
      })
    );
  }

  const doses = await R.medDoses.byIndex('date', IDBKeyRange.only(today()));
  meds.forEach(m => {
    const li = document.createElement('div');
    li.className = 'li';
    const mm = document.createElement('div');
    mm.style.flex = '1';
    const a = document.createElement('div');
    a.className = 't';
    a.textContent = m.name;
    const bq = document.createElement('div');
    bq.className = 'xs dim';
    bq.textContent = [
      m.dose ? 'الجرعة: ' + m.dose : '',
      m.times ? 'المواعيد: ' + m.times : '',
      m.stock != null ? 'فاضل ' + fmtN(m.stock, 0) : ''
    ]
      .filter(Boolean)
      .join(' · ');
    mm.append(a, bq);

    const taken = doses.filter(x => x.medId === m.id).length;
    const b = document.createElement('button');
    b.className = 'chip' + (taken ? ' on' : '');
    b.textContent = taken ? '✓ ' + fmtN(taken, 0) + ' جرعة' : 'سجّل جرعة';
    b.onclick = async () => {
      Hist.begin('جرعة');
      await R.medDoses.add({ medId: m.id, date: today(), at: now() });
      if (m.stock != null) await R.meds.patch(m.id, { stock: Math.max(0, +m.stock - 1) });
      Hist.commit();
      UI.toast('اتسجّلت 👌', { undo: true });
      Router.render();
    };
    li.append(mm, b);
    c.appendChild(li);
  });
  box.appendChild(c);

  const logs = await R.healthLogs.all();
  if (logs.length) {
    const c2 = document.createElement('div');
    c2.className = 'card pad';
    c2.style.marginTop = '12px';
    const h2 = document.createElement('div');
    h2.style.fontWeight = '800';
    h2.textContent = 'اتجاه آخر ١٤ يوم (نوم بالساعات لو مسجّل)';
    c2.appendChild(h2);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const dd = addDays(today(), -i);
      const v = logs
        .filter(l => l.type === 'نوم' && l.date === dd)
        .map(l => parseFloat(l.value) || 0)
        .reduce((a, b) => a + b, 0);
      days.push({ l: String(+dd.slice(8)), v });
    }
    c2.appendChild(Chart.bars(days));
    box.appendChild(c2);
  }

  const all = document.createElement('div');
  all.style.marginTop = '12px';
  all.appendChild(await collectionView('healthLogs', { emptyTitle: 'مفيش سجلات صحية' }));
  box.appendChild(all);

  return box;
};
