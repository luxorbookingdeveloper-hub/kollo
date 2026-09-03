/* ============================================================================
   كله — Kollo | Module: Automations View (شاشة الأوتوميشن)
   Automations dashboard, dry-run simulation, and triggers toggle
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.auto = async () => {
  const box = document.createElement('div');
  const list = await R.automations.all();

  const bar = document.createElement('div');
  bar.className = 'row wrap';

  const a = document.createElement('button');
  a.className = 'b p';
  a.textContent = '＋ أوتوميشن';
  a.onclick = () => openEditor('automations', { active: true });

  const dr = document.createElement('button');
  dr.className = 'b';
  dr.textContent = '🧪 محاكاة (Dry-run)';
  dr.onclick = async () => {
    const res = await Auto.run(true);
    const b = document.createElement('div');
    b.appendChild(
      mdLite(
        res.length
          ? res.map(r => '- ' + r.automation + ' → ' + Auto.actions[r.action] + ' (السبب: ' + r.why + ')').join('\n')
          : 'مفيش حاجة هتتنفّذ دلوقتي.'
      )
    );
    UI.sheet({
      title: 'اللي هيحصل لو شغّلنا',
      body: b,
      actions: [
        { label: 'إقفال' },
        {
          label: 'شغّلها فعليًا',
          kind: 'p',
          fn: async () => {
            const done = await Auto.run(false);
            UI.toast('اتنفّذ ' + fmtN(done.length, 0) + ' إجراء');
            Router.render();
          }
        }
      ]
    });
  };

  bar.append(a, dr);
  box.appendChild(bar);

  const c = document.createElement('div');
  c.className = 'card';
  c.style.marginTop = '12px';

  if (!list.length) {
    c.appendChild(
      UI.empty('مفيش أوتوميشن', 'مثال: كل يوم الصبح اعمل مهمة "راجع الأجندة".', {
        label: '＋ أوتوميشن',
        fn: () => openEditor('automations', { active: true })
      })
    );
  }

  list.forEach(x => {
    const li = document.createElement('div');
    li.className = 'li';
    const m = document.createElement('div');
    m.style.flex = '1';

    const t = document.createElement('div');
    t.className = 't';
    t.textContent = x.name;

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent =
      (Auto.triggers[x.trigger] || x.trigger) +
      ' → ' +
      (Auto.actions[x.action] || x.action) +
      (x.runs ? ' · اشتغل ' + fmtN(x.runs, 0) + ' مرة' : '');
    m.append(t, s);

    const tg = document.createElement('button');
    tg.className = 'chip' + (x.active !== false ? ' on' : '');
    tg.textContent = x.active !== false ? 'شغّال' : 'مطفي';
    tg.onclick = async () => {
      Hist.begin('أوتوميشن');
      await R.automations.patch(x.id, { active: x.active === false });
      Hist.commit();
      Router.render();
    };

    const ed = document.createElement('button');
    ed.className = 'b sm g';
    ed.textContent = '✏️';
    ed.onclick = () => openEditor('automations', x);

    li.append(m, tg, ed);
    c.appendChild(li);
  });

  box.appendChild(c);
  return box;
};
