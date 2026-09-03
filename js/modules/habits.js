/* ============================================================================
   كله — Kollo | Module: Habits (العادات)
   Habits list, Streaks, Log recording, and Heatmap
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.habits = async () => {
  const box = document.createElement('div');
  const habits = await R.habits.all();
  const logs = await R.habitLogs.all();
  const bar = document.createElement('div');
  bar.className = 'row';
  bar.style.marginBottom = '12px';

  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ عادة';
  add.onclick = () => openEditor('habits', null);
  bar.appendChild(add);
  box.appendChild(bar);

  if (!habits.length) {
    box.appendChild(
      UI.empty('مفيش عادات', 'ابدأ بعادة واحدة صغيرة، والباقي هييجي.', {
        label: '＋ عادة',
        fn: () => openEditor('habits', null)
      })
    );
    return box;
  }

  habits.forEach(h => {
    const c = document.createElement('div');
    c.className = 'card pad';
    c.style.marginBottom = '12px';

    const hh = document.createElement('div');
    hh.className = 'row';
    const t = document.createElement('div');
    t.style.flex = '1';
    t.style.fontWeight = '800';
    t.textContent = h.name;

    const mine = logs.filter(l => l.habitId === h.id);
    const map = {};
    mine.forEach(l => (map[l.date] = (map[l.date] || 0) + (+l.value || 1)));

    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = addDays(today(), -i);
      if (map[d]) streak++;
      else if (i > 0) break;
    }

    const bd = document.createElement('span');
    bd.className = 'badge a';
    bd.textContent = '🔥 ' + fmtN(streak, 0) + ' يوم';

    const done = !!map[today()];
    const b = document.createElement('button');
    b.className = 'chip' + (done ? ' on' : '');
    b.textContent = done ? '✓ اتعملت' : 'سجّل النهاردة';
    b.onclick = async () => {
      Hist.begin('عادة');
      if (done) {
        const l = mine.find(l => l.date === today());
        if (l) await R.habitLogs.hardDel(l.id);
      } else {
        await R.habitLogs.add({ habitId: h.id, date: today(), value: 1 });
      }
      Hist.commit();
      Router.render();
    };

    const ed = document.createElement('button');
    ed.className = 'b sm g';
    ed.textContent = '✏️';
    ed.onclick = () => openEditor('habits', h);

    hh.append(t, bd, b, ed);
    c.appendChild(hh);
    c.appendChild(heatmap(map));

    const st = document.createElement('div');
    st.className = 'xs dim';
    st.style.marginTop = '6px';
    const last30 = Object.keys(map).filter(d => d >= addDays(today(), -30)).length;
    st.textContent =
      'آخر ٣٠ يوم: ' +
      fmtN(last30, 0) +
      ' مرة · ' +
      (h.freq === 'daily' ? 'يومي' : h.freq === 'weekly' ? 'أسبوعي' : 'بعدد مرات') +
      (h.freezeDays ? ' · تجميد مسموح ' + fmtN(h.freezeDays, 0) + ' يوم' : '');
    c.appendChild(st);
    box.appendChild(c);
  });

  return box;
};
