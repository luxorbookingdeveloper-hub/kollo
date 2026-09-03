/* ============================================================================
   كله — Kollo | Module: People & Social Duties (الناس والواجبات)
   People CRM, contact cadence nudges, birthdays, and social duties tracking
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.people = async () => {
  const box = document.createElement('div');
  const ppl = await R.people.all();

  const bar = document.createElement('div');
  bar.className = 'row wrap';
  const a1 = document.createElement('button');
  a1.className = 'b p';
  a1.textContent = '＋ شخص';
  a1.onclick = () => openEditor('people', null);

  const a2 = document.createElement('button');
  a2.className = 'b';
  a2.textContent = '＋ واجب اجتماعي';
  a2.onclick = () => openEditor('socialDuties', null);

  bar.append(a1, a2);
  box.appendChild(bar);

  const due = ppl.filter(p => p.cadence && (!p.lastContact || new Date(p.lastContact).getTime() < Date.now() - p.cadence * dayMs));
  if (due.length) {
    const c = document.createElement('div');
    c.className = 'card pad';
    c.style.marginTop = '12px';

    const h = document.createElement('div');
    h.style.fontWeight = '800';
    h.textContent = 'اطمن على مين النهاردة؟';
    c.appendChild(h);

    const r = document.createElement('div');
    r.className = 'row wrap';
    r.style.marginTop = '8px';

    due.slice(0, 8).forEach(p => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = '📞 ' + p.name;
      b.onclick = async () => {
        Hist.begin('مكالمة');
        await R.people.patch(p.id, { lastContact: today() });
        Hist.commit();
        UI.toast('اتسجّلت — تمام كده 👌', { undo: true });
        Router.render();
      };
      r.appendChild(b);
    });

    c.appendChild(r);
    box.appendChild(c);
  }

  const g = document.createElement('div');
  g.className = 'grid g2';
  g.style.marginTop = '12px';

  if (!ppl.length) {
    g.appendChild(
      UI.empty('مفيش حد مسجّل', 'ضيف أهلك وأصحابك، وحدّد تطمن عليهم كل كام يوم.', {
        label: '＋ شخص',
        fn: () => openEditor('people', null)
      })
    );
  }

  ppl.forEach(p => {
    const c = document.createElement('div');
    c.className = 'card pad row';

    const av = document.createElement('div');
    av.className = 'avatar';
    av.textContent = String(p.name || '؟').trim()[0];

    const m = document.createElement('div');
    m.style.flex = '1';
    const t = document.createElement('div');
    t.style.fontWeight = '800';
    t.textContent = p.name;

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent = [
      p.relation,
      p.birthday ? '🎂 ' + String(p.birthday).slice(5) : '',
      p.lastContact ? 'آخر مرة ' + relDay(p.lastContact) : 'لسه مكلّمتوش'
    ]
      .filter(Boolean)
      .join(' · ');
    m.append(t, s);

    const ed = document.createElement('button');
    ed.className = 'b sm g';
    ed.textContent = '✏️';
    ed.onclick = () => openEditor('people', p);

    c.append(av, m, ed);
    g.appendChild(c);
  });
  box.appendChild(g);

  const duties = await R.socialDuties.all();
  if (duties.length) {
    const c = document.createElement('div');
    c.className = 'card';
    c.style.marginTop = '12px';

    const h = document.createElement('div');
    h.className = 'pad';
    h.style.fontWeight = '800';
    h.textContent = 'الواجبات (فرح/عزاء/عزومة) + محاسبة بسيطة';
    c.appendChild(h);

    duties.forEach(d => {
      const li = document.createElement('div');
      li.className = 'li';
      const m = document.createElement('div');
      m.style.flex = '1';

      const a = document.createElement('div');
      a.className = 't';
      a.textContent = d.title;

      const s = document.createElement('div');
      s.className = 'xs dim';
      s.textContent = [d.kind, d.date ? relDay(d.date) : '', d.amount ? money(d.amount) : ''].filter(Boolean).join(' · ');
      m.append(a, s);

      li.appendChild(m);
      c.appendChild(li);
    });

    const tot = document.createElement('div');
    tot.className = 'pad sm muted';
    tot.textContent = 'إجمالي اللي اتصرف في الواجبات: ' + money(duties.reduce((s, d) => s + (+d.amount || 0), 0));
    c.appendChild(tot);

    box.appendChild(c);
  }
  return box;
};
