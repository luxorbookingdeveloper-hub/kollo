/* ============================================================================
   كله — Kollo | Module: Mood & Journal (المزاج والجورنال)
   Daily mood logs, gratitude notes, and descriptive productivity correlations
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.mood = async () => {
  const box = document.createElement('div');
  const logs = await R.moodLogs.all();
  const jr = await R.journal.all();
  const bar = document.createElement('div');
  bar.className = 'row wrap';
  bar.style.marginBottom = '12px';

  [[1, '😞'], [2, '🙁'], [3, '😐'], [4, '🙂'], [5, '😄']].forEach(([v, e]) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.style.fontSize = '1.2rem';
    b.textContent = e;
    b.setAttribute('aria-label', 'مزاج ' + v);
    b.onclick = async () => {
      Hist.begin('مزاج');
      await R.moodLogs.add({ date: today(), mood: v });
      Hist.commit();
      UI.toast('اتسجّل. خد بالك من نفسك.', { undo: true });
      Router.render();
    };
    bar.appendChild(b);
  });

  const jb = document.createElement('button');
  jb.className = 'b p';
  jb.textContent = '📓 اكتب جورنال';
  jb.onclick = () => openEditor('journal', { date: today() });
  bar.appendChild(jb);
  box.appendChild(bar);

  if (logs.length) {
    const c = document.createElement('div');
    c.className = 'card pad';
    const h = document.createElement('div');
    h.style.fontWeight = '800';
    h.textContent = 'المزاج آخر ٣٠ يوم';
    c.appendChild(h);

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today(), -i);
      const l = logs.filter(x => x.date === d);
      days.push({ l: String(+d.slice(8)), v: l.length ? l.reduce((s, x) => s + (+x.mood || 0), 0) / l.length : 0 });
    }
    c.appendChild(Chart.line(days, { h: 170 }));

    /* ارتباط وصفي فقط */
    const tasks = await R.tasks.all();
    const hl = await R.habitLogs.all();
    const good = logs.filter(l => +l.mood >= 4).map(l => l.date);
    const bad = logs.filter(l => +l.mood <= 2).map(l => l.date);
    const doneOn = d => tasks.filter(t => t.doneAt && String(t.doneAt).slice(0, 10) === d).length;
    const habOn = d => hl.filter(x => x.date === d).length;
    const avg = a => (a.length ? a.reduce((s, d) => s + d, 0) / a.length : 0);
    const rep = document.createElement('div');
    rep.className = 'sm muted';
    rep.style.marginTop = '8px';
    rep.textContent =
      'وصفي بس: في الأيام الحلوة بتخلّص ~' +
      fmtN(avg(good.map(doneOn)), 1) +
      ' مهمة و~' +
      fmtN(avg(good.map(habOn)), 1) +
      ' عادة، وفي الأيام التقيلة ~' +
      fmtN(avg(bad.map(doneOn)), 1) +
      ' مهمة و~' +
      fmtN(avg(bad.map(habOn)), 1) +
      ' عادة. ده ارتباط مش سبب.';
    c.appendChild(rep);
    box.appendChild(c);
  }

  const j = document.createElement('div');
  j.className = 'card';
  j.style.marginTop = '12px';

  const jh = document.createElement('div');
  jh.className = 'pad';
  jh.style.fontWeight = '800';
  jh.textContent = 'الجورنال';
  j.appendChild(jh);

  if (!jr.length) {
    j.appendChild(
      UI.empty('الصفحة فاضية', 'اكتب سطرين عن يومك — مش لازم يكونوا حكمة.', {
        label: '📓 اكتب',
        fn: () => openEditor('journal', { date: today() })
      })
    );
  }

  jr
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 60)
    .forEach(e => {
      const li = document.createElement('div');
      li.className = 'li';
      const m = document.createElement('div');
      m.style.flex = '1';

      const a = document.createElement('div');
      a.className = 't';
      a.textContent = relDay(e.date);
      m.appendChild(a);
      m.appendChild(mdLite(String(e.body || '').slice(0, 400)));

      if (e.gratitude) {
        const g = document.createElement('div');
        g.className = 'xs dim';
        g.textContent = '🙏 ' + e.gratitude;
        m.appendChild(g);
      }

      const ed = document.createElement('button');
      ed.className = 'b sm g';
      ed.textContent = '✏️';
      ed.onclick = () => openEditor('journal', e);

      li.append(m, ed);
      j.appendChild(li);
    });

  box.appendChild(j);
  return box;
};
