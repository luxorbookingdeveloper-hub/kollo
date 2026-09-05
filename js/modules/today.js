/* ============================================================================
   كله — Kollo | Module: Today (النهاردة)
   Mental load, Top 3 tasks, Today agenda, Habits, Nudges, Daily shutdown
   ============================================================================ */

window.VIEWS = window.VIEWS || {};

window.VIEWS.today = async () => {
  const box = document.createElement('div');
  const hi = document.createElement('div');
  hi.className = 'card pad';
  const h = new Date().getHours();
  const greet = h < 12 ? 'صباح الفل' : h < 17 ? 'نهار سعيد' : h < 21 ? 'مسا الخير' : 'الليلة دي هادية';
  const nm = S.settings.name ? (' يا ' + S.settings.name) : '';
  const t1 = document.createElement('h1');
  t1.style.cssText = 'font-size:1.35rem;font-weight:800;letter-spacing:-.03em';
  t1.textContent = greet + nm + ' 👋';
  const t2 = document.createElement('div');
  t2.className = 'muted sm';
  t2.textContent = dowAr[new Date().getDay()] + ' · ' + fmtDate(today(), { weekday: undefined }) + (S.settings.hijri && hijri() ? ' · ' + hijri() : '');
  hi.append(t1, t2);
  box.appendChild(hi);

  const ml = await mentalLoad();
  const k = document.createElement('div');
  k.className = 'grid g3';
  k.style.marginTop = '12px';
  const kpis = [
    ['حمل الدماغ', fmtN(ml.score, 0) + '٪', ml.score > 70 ? 'الدماغ زحمة — نفضّي تلاتة؟' : 'الدماغ مرتاح نسبيًا'],
    ['مهام مفتوحة', fmtN(ml.open, 0), ml.overdue ? fmtN(ml.overdue, 0) + ' منها فاتت' : 'ولا واحدة فاتت 👏'],
    ['مواعيد النهاردة', fmtN(ml.events, 0), 'من التقويم']
  ];
  kpis.forEach(([l, v, s]) => {
    const c = document.createElement('div');
    c.className = 'card kpi';
    const a = document.createElement('div');
    a.className = 'xs dim';
    a.textContent = l;
    const b = document.createElement('b');
    b.className = 'num';
    b.textContent = v;
    const d = document.createElement('div');
    d.className = 'xs muted';
    d.textContent = s;
    c.append(a, b, d);
    k.appendChild(c);
  });
  box.appendChild(k);

  /* تلات حاجات لازم تخلص */
  const tasks = (await R.tasks.all()).filter(t => t.status !== 'done');
  const eis = t => ((t.priority || 3) * 10) + (t.due ? (new Date(t.due) - new Date(today())) / dayMs : 30);
  const top3 = tasks.slice().sort((a, b) => eis(a) - eis(b)).slice(0, 3);
  const s1 = document.createElement('div');
  s1.className = 'sec-h';
  const s1h = document.createElement('h2');
  s1h.textContent = 'تلات حاجات لازم تخلص';
  s1.appendChild(s1h);
  box.appendChild(s1);

  const c1 = document.createElement('div');
  c1.className = 'card';
  if (!top3.length) {
    c1.appendChild(UI.empty('مفيش مهام', 'سجّل أول مهمة وابدأ يومك بخطة.', { label: '＋ مهمة', fn: () => openEditor('tasks', null) }));
  }
  top3.forEach(t => c1.appendChild(taskRow(t)));
  box.appendChild(c1);

  /* أجندة النهاردة وبكرة */
  const ev = await R.events.byIndex('start', IDBKeyRange.bound(today(), addDays(today(), 2)));
  const s2 = document.createElement('div');
  s2.className = 'sec-h';
  const s2h = document.createElement('h2');
  s2h.textContent = 'أجندة النهاردة وبكرة';
  s2.appendChild(s2h);
  box.appendChild(s2);

  const c2 = document.createElement('div');
  c2.className = 'card';
  if (!ev.length) {
    c2.appendChild(UI.empty('مفيش مواعيد', 'يومك فاضي — فرصة تخلّص حاجة مهمة.', { label: '＋ ميعاد', fn: () => openEditor('events', null) }));
  }
  ev.sort((a, b) => (a.start + (a.time || '')).localeCompare(b.start + (b.time || ''))).forEach(e => {
    const li = document.createElement('div');
    li.className = 'li';
    const m = document.createElement('div');
    m.style.flex = '1';
    const a = document.createElement('div');
    a.className = 't';
    a.textContent = e.title;
    const b = document.createElement('div');
    b.className = 'xs dim';
    b.textContent = relDay(e.start) + (e.time ? ' · ' + e.time : '') + (e.place ? ' · ' + e.place : '') + (e.prep ? ' · تحضير ' + fmtN(e.prep, 0) + 'د' : '');
    m.append(a, b);
    li.appendChild(m);
    c2.appendChild(li);
  });
  box.appendChild(c2);

  /* عادات النهاردة */
  const habits = (await R.habits.all()).filter(h => h.active !== false);
  const logs = await R.habitLogs.byIndex('date', IDBKeyRange.only(today()));
  const s3 = document.createElement('div');
  s3.className = 'sec-h';
  const s3h = document.createElement('h2');
  s3h.textContent = 'عادات النهاردة';
  s3.appendChild(s3h);
  box.appendChild(s3);

  const c3 = document.createElement('div');
  c3.className = 'card pad row wrap';
  if (!habits.length) {
    c3.classList.remove('row');
    c3.appendChild(UI.empty('مفيش عادات', 'عادة واحدة صغيرة أحسن من خطة كبيرة.', { label: '＋ عادة', fn: () => openEditor('habits', null) }));
  }
  habits.forEach(hb => {
    const done = logs.some(l => l.habitId === hb.id);
    const b = document.createElement('button');
    b.className = 'chip' + (done ? ' on' : '');
    b.setAttribute('aria-pressed', done ? 'true' : 'false');
    b.textContent = (done ? '✓ ' : '') + hb.name;
    b.onclick = async () => {
      Hist.begin('عادة');
      if (done) {
        const l = logs.find(l => l.habitId === hb.id);
        await R.habitLogs.hardDel(l.id);
      } else {
        await R.habitLogs.add({ habitId: hb.id, date: today(), value: 1 });
      }
      Hist.commit();
      UI.toast(done ? 'شيلناها من النهاردة' : 'تمام ✅ ' + hb.name, { undo: true });
      Router.render();
    };
    c3.appendChild(b);
  });
  box.appendChild(c3);

  /* الحبشتكنات: ندهات مصرية */
  const nudges = await getNudges();
  if (nudges.length) {
    const s4 = document.createElement('div');
    s4.className = 'sec-h';
    const s4h = document.createElement('h2');
    s4h.textContent = 'حبشتكنات';
    s4.appendChild(s4h);
    box.appendChild(s4);

    const c4 = document.createElement('div');
    c4.className = 'grid g2';
    nudges.slice(0, 6).forEach(n => {
      const c = document.createElement('div');
      c.className = 'card pad';
      const a = document.createElement('div');
      a.style.fontWeight = '800';
      a.textContent = n.title;
      const b = document.createElement('div');
      b.className = 'sm muted';
      b.textContent = n.text;
      c.append(a, b);
      if (n.cta) {
        const btn = document.createElement('button');
        btn.className = 'b sm p';
        btn.style.marginTop = '8px';
        btn.textContent = n.cta.label;
        btn.onclick = n.cta.fn;
        c.appendChild(btn);
      }
      c4.appendChild(c);
    });
    box.appendChild(c4);
  }

  /* الحساب الختامي */
  const shut = document.createElement('button');
  shut.className = 'b';
  shut.style.marginTop = '16px';
  shut.textContent = '🌙 الحساب الختامي لليوم';
  shut.onclick = dailyShutdown;
  box.appendChild(shut);

  return box;
};
