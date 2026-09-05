/* ============================================================================
   كله — Kollo | Module: Goals & Life Wheel (الأهداف وعجلة الحياة)
   Goals, Key Results, and Radar chart of life areas
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.goals = async () => {
  const box = document.createElement('div');
  const goals = await R.goals.all();
  const krs = await R.keyResults.all();

  const bar = document.createElement('div');
  bar.className = 'row';
  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ هدف';
  add.onclick = () => openEditor('goals', null);
  bar.appendChild(add);
  box.appendChild(bar);

  const areas = ['شغل', 'صحة', 'فلوس', 'أهل', 'تعلّم', 'روحاني', 'ترفيه'];
  const score = a => {
    const gs = goals.filter(g => g.area === a);
    if (!gs.length) return 0;
    const vals = gs.map(g => {
      const k = krs.filter(k2 => k2.goalId === g.id);
      if (!k.length) return g.status === 'done' ? 10 : 0;
      return k.reduce((s, x) => s + clamp(((+x.current || 0) / ((+x.target) || 1)) * 10, 0, 10), 0) / k.length;
    });
    return vals.reduce((a2, b) => a2 + b, 0) / vals.length;
  };

  const c = document.createElement('div');
  c.className = 'card pad';
  c.style.marginTop = '12px';

  const h = document.createElement('div');
  h.style.fontWeight = '800';
  h.textContent = 'عجلة الحياة (من أهدافك ونتايجك)';
  c.appendChild(h);
  c.appendChild(Chart.radar(areas.map(a => ({ l: a, v: score(a) })), { max: 10 }));
  box.appendChild(c);

  const list = document.createElement('div');
  list.className = 'grid g2';
  list.style.marginTop = '12px';

  if (!goals.length) {
    list.appendChild(
      UI.empty('مفيش أهداف', 'هدف واحد واضح أحسن من عشرة مظبّبين.', {
        label: '＋ هدف',
        fn: () => openEditor('goals', null)
      })
    );
  }

  goals.forEach(g => {
    const cc = document.createElement('div');
    cc.className = 'card pad';

    const t = document.createElement('div');
    t.style.fontWeight = '800';
    t.textContent = g.title;

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent = [g.area, g.horizon === 'year' ? 'سنوي' : g.horizon === 'quarter' ? 'ربع سنة' : 'شهري'].filter(Boolean).join(' · ');
    cc.append(t, s);

    const mine = krs.filter(k => k.goalId === g.id);
    mine.forEach(k => {
      const w = document.createElement('div');
      w.style.marginTop = '8px';

      const r = document.createElement('div');
      r.className = 'row';
      const l = document.createElement('div');
      l.className = 'sm';
      l.style.flex = '1';
      l.textContent = k.name;

      const v = document.createElement('div');
      v.className = 'xs num';
      v.textContent = fmtN(k.current || 0) + ' / ' + fmtN(k.target || 0) + ' ' + (k.unit || '');
      r.append(l, v);
      w.appendChild(r);

      const p = document.createElement('div');
      p.className = 'prog';
      const i = document.createElement('i');
      i.style.width = clamp(((+k.current || 0) / ((+k.target) || 1)) * 100, 0, 100) + '%';
      p.appendChild(i);
      w.appendChild(p);

      const b = document.createElement('button');
      b.className = 'b sm g';
      b.textContent = '+ تقدّم';
      b.onclick = () =>
        UI.form({
          title: 'تحديث: ' + k.name,
          fields: [{ k: 'current', l: 'القيمة الحالية', t: 'number', req: true }],
          values: { current: k.current || 0 },
          onSave: async v2 => {
            Hist.begin('نتيجة رئيسية');
            await R.keyResults.patch(k.id, { current: +v2.current });
            Hist.commit();
            UI.toast(T('save'), { undo: true });
            Router.render();
          }
        });
      w.appendChild(b);
      cc.appendChild(w);
    });

    const ak = document.createElement('button');
    ak.className = 'b sm';
    ak.style.marginTop = '10px';
    ak.textContent = '＋ نتيجة رئيسية';
    ak.onclick = () =>
      UI.form({
        title: 'نتيجة رئيسية قابلة للقياس',
        fields: [
          { k: 'name', l: 'الاسم', t: 'text', req: true },
          { k: 'target', l: 'الهدف', t: 'number', req: true },
          { k: 'current', l: 'الحالي', t: 'number' },
          { k: 'unit', l: 'الوحدة', t: 'text' }
        ],
        values: { current: 0 },
        onSave: async v2 => {
          Hist.begin('نتيجة');
          await R.keyResults.add({
            goalId: g.id,
            name: v2.name,
            target: +v2.target,
            current: +v2.current || 0,
            unit: v2.unit
          });
          Hist.commit();
          Router.render();
        }
      });
    cc.appendChild(ak);

    const ed = document.createElement('button');
    ed.className = 'b sm g';
    ed.textContent = '✏️';
    ed.onclick = () => openEditor('goals', g);
    cc.appendChild(ed);

    list.appendChild(cc);
  });
  box.appendChild(list);

  const rev = document.createElement('button');
  rev.className = 'b';
  rev.style.marginTop = '12px';
  rev.textContent = '📋 مسوّدة المراجعة الأسبوعية';
  rev.onclick = async () => {
    const d = await weeklyReview();
    const b = document.createElement('div');
    b.appendChild(mdLite(d));
    UI.sheet({
      title: 'مسوّدة المراجعة الأسبوعية',
      body: b,
      actions: [
        { label: 'إقفال' },
        {
          label: 'احفظها مذكرة',
          kind: 'p',
          fn: async () => {
            Hist.begin('مراجعة');
            await R.notes.add({ title: 'مراجعة أسبوع ' + today(), body: d, tags: ['مراجعة'] });
            Hist.commit();
            UI.toast('اتحفظت في المذكرات', { undo: true });
          }
        }
      ]
    });
  };
  box.appendChild(rev);
  return box;
};
