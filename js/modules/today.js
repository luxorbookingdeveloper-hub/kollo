/* ============================================================================
   كله — Kollo | Module: Today (النهاردة)
   Mental load, Top 3 tasks, Today agenda, Habits, Nudges, Daily shutdown
   ============================================================================ */
async function mentalLoad() {
  const t = await R.tasks.all();
  const open = t.filter(x => x.status !== 'done');
  const overdue = open.filter(x => x.due && x.due < today());
  const post = open.filter(x => (x.postponed || 0) > 0);
  const ev = await R.events.byIndex('start', IDBKeyRange.bound(today(), addDays(today(), 1)));
  const meds = (await R.meds.all()).filter(m => m.active !== false);
  const score = clamp(Math.round(open.length * 2 + overdue.length * 5 + post.length * 3 + ev.length * 2 + meds.length), 0, 100);
  return { score, open: open.length, overdue: overdue.length, postponed: post.length, events: ev.length };
}

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

function taskRow(t) {
  const li = document.createElement('div');
  li.className = 'li' + (t.status === 'done' ? ' done' : '');
  const cb = document.createElement('button');
  cb.className = 'cb';
  cb.setAttribute('role', 'checkbox');
  cb.setAttribute('aria-checked', t.status === 'done' ? 'true' : 'false');
  cb.setAttribute('aria-label', 'خلّصت: ' + t.title);
  cb.textContent = t.status === 'done' ? '✓' : '';
  cb.onclick = async () => {
    Hist.begin('إنهاء مهمة');
    await R.tasks.patch(t.id, {
      status: t.status === 'done' ? 'todo' : 'done',
      doneAt: t.status === 'done' ? null : now()
    });
    Hist.commit();
    UI.toast(t.status === 'done' ? 'رجعناها للمفتوحة' : '✅ ' + T('done'), { undo: true });
    Bus.emit('achv');
    Router.render();
  };

  const m = document.createElement('div');
  m.style.flex = '1';
  m.style.minWidth = '0';
  const a = document.createElement('div');
  a.className = 't';
  a.textContent = t.title;
  const b = document.createElement('div');
  b.className = 'xs dim';
  const late = t.due && t.due < today() && t.status !== 'done';
  b.textContent = [
    t.due ? (late ? '⚠️ ' + relDay(t.due) : '⏰ ' + relDay(t.due)) : '',
    t.estimate ? fmtN(t.estimate, 0) + 'د' : '',
    t.postponed ? 'أجّلتها ' + fmtN(t.postponed, 0) + ' مرة' : ''
  ].filter(Boolean).join(' · ');
  m.append(a, b);

  const pp = document.createElement('button');
  pp.className = 'b sm g';
  pp.textContent = '⏭️';
  pp.setAttribute('aria-label', 'أجّل لبكرة');
  pp.onclick = async () => {
    const n = (t.postponed || 0) + 1;
    Hist.begin('تأجيل');
    // Logical Bug Fix: Schedule relative to today if original due date was in the past
    const baseDate = (t.due && t.due >= today()) ? t.due : today();
    await R.tasks.patch(t.id, { due: addDays(baseDate, 1), postponed: n });
    Hist.commit();
    UI.toast(
      n >= 3 ? 'دي المرة ' + fmtN(n, 0) + '… نكسّرها لخطوات أصغر بدل التأجيل؟' : 'أجّلناها لبكرة.',
      {
        undo: true,
        action: n >= 3 ? { label: 'كسّرها', fn: () => breakdownTask(t) } : null
      }
    );
    Router.render();
  };

  const ed = document.createElement('button');
  ed.className = 'b sm g';
  ed.textContent = '✏️';
  ed.setAttribute('aria-label', 'تعديل');
  ed.onclick = () => openEditor('tasks', t);
  li.append(cb, m, pp, ed);
  return li;
}

async function breakdownTask(t) {
  const b = document.createElement('div');
  const p = document.createElement('p');
  p.className = 'muted sm';
  p.textContent = 'اكتب الخطوات الصغيرة، كل خطوة في سطر. (الأسطى يقدر يقترحها كمان من شاشته)';
  b.appendChild(p);

  const ta = document.createElement('textarea');
  ta.className = 'in';
  ta.rows = 6;
  b.appendChild(ta);

  UI.sheet({
    title: 'كسّر: ' + t.title,
    body: b,
    actions: [
      { label: 'إلغاء' },
      {
        label: 'اعمل مهام فرعية',
        kind: 'p',
        fn: async () => {
          const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
          if (!lines.length) {
            UI.toast('اكتب خطوة واحدة على الأقل');
            return false;
          }
          Hist.begin('تكسير مهمة');
          for (const l of lines) {
            await R.tasks.add({ title: l, status: 'todo', parentId: t.id, due: t.due, priority: t.priority || 3 });
          }
          Hist.commit();
          UI.toast('عملنا ' + fmtN(lines.length, 0) + ' خطوة صغيرة.', { undo: true });
          Router.render();
        }
      }
    ]
  });
}

async function getNudges() {
  const out = [];
  const t = await R.tasks.all();
  const open = t.filter(x => x.status !== 'done');
  const post = open.filter(x => (x.postponed || 0) >= 3);
  if (post.length) {
    out.push({
      title: 'شدّ الودن (بلطف)',
      text: '"' + post[0].title + '" اتأجلت ' + fmtN(post[0].postponed, 0) + ' مرات. نكسّرها لخطوات؟',
      cta: { label: 'كسّرها', fn: () => breakdownTask(post[0]) }
    });
  }

  const subs = (await R.subscriptions.all()).filter(s => s.nextDue && s.nextDue <= addDays(today(), 7));
  if (subs.length) {
    out.push({ title: 'الاشتراكات', text: subs.map(s => s.name + ' (' + money(s.amount) + ')').join(' · ') + ' — قربوا يتجدّدوا.' });
  }

  const docs = (await R.documents.all()).filter(d => d.expiry && d.expiry <= addDays(today(), 90));
  if (docs.length) {
    out.push({ title: 'شنطة المستندات', text: docs.map(d => d.name + ' ينتهي ' + relDay(d.expiry)).join(' · ') });
  }

  const bs = await budgetStatus(monthKey());
  const hot = bs.filter(b => b.pct >= 80);
  if (hot.length) {
    out.push({ title: 'مؤشر "باقي كام في الشهر"', text: hot.map(b => b.category + ' وصلت ' + fmtN(b.pct, 0) + '٪ من الميزانية').join(' · ') });
  }

  const ppl = (await R.people.all()).filter(p => p.cadence && (!p.lastContact || new Date(p.lastContact).getTime() < Date.now() - p.cadence * dayMs));
  if (ppl.length) {
    out.push({
      title: 'فاكر آخر مرة كلمت مين؟',
      text: 'بقى وقت على ' + ppl.slice(0, 3).map(p => p.name).join(' و ') + '. اطمن عليهم.',
      cta: {
        label: 'سجّل مكالمة',
        fn: async () => {
          Hist.begin('مكالمة');
          await R.people.patch(ppl[0].id, { lastContact: today() });
          Hist.commit();
          UI.toast('اتسجّلت 👌');
          Router.render();
        }
      }
    });
  }

  // Logical Bug Fix: Year wrap-around calculation for upcoming birthdays in late December
  const tMMDD = today().slice(5);
  const endMMDD = addDays(today(), 14).slice(5);
  const bdays = (await R.people.all()).filter(p => {
    if (!p.birthday) return false;
    const b = String(p.birthday).slice(5);
    return endMMDD >= tMMDD ? (b >= tMMDD && b <= endMMDD) : (b >= tMMDD || b <= endMMDD);
  });
  if (bdays.length) {
    out.push({ title: 'أعياد ميلاد جاية', text: bdays.map(p => p.name + ' — ' + String(p.birthday).slice(5)).join(' · ') });
  }

  const cards = await R.cards.byIndex('due', IDBKeyRange.upperBound(today()));
  if (cards.length) {
    out.push({
      title: 'إيستر كارت المراجعة',
      text: fmtN(cards.length, 0) + ' كارت مستحق للمراجعة النهاردة.',
      cta: { label: 'راجع دلوقتي', fn: () => Router.go('learn?tab=srs') }
    });
  }

  const meds = (await R.meds.all()).filter(m => m.active !== false && m.stock != null && +m.stock <= 5);
  if (meds.length) {
    out.push({ title: 'خلصت العلبة؟', text: meds.map(m => m.name + ' فاضل منه ' + fmtN(m.stock, 0)).join(' · ') + ' — تحب تحجز موعد الصيدلية؟' });
  }

  return out;
}

async function dailyShutdown() {
  const b = document.createElement('div');
  const ml = await mentalLoad();
  const qs = [
    ['خلّصت إيه النهاردة اللي تفتخر بيه؟', 'win'],
    ['إيه اللي عطّلك؟', 'block'],
    ['أهم حاجة لبكرة؟', 'tomorrow'],
    ['حاجة إنت شاكر عليها؟', 'grat'],
    ['المزاج من ١ لـ٥؟', 'mood']
  ];
  const ins = {};
  qs.forEach(([q, k]) => {
    const w = document.createElement('div');
    w.className = 'fld';
    const l = document.createElement('label');
    l.textContent = q;
    const i = document.createElement(k === 'mood' ? 'input' : 'textarea');
    i.className = 'in';
    if (k === 'mood') {
      i.type = 'number';
      i.min = 1;
      i.max = 5;
    } else {
      i.rows = 2;
    }
    w.append(l, i);
    b.appendChild(w);
    ins[k] = i;
  });

  const sum = document.createElement('div');
  sum.className = 'sm muted';
  sum.textContent = 'الحساب الختامي: ' + fmtN(ml.open, 0) + ' مهمة مفتوحة، ' + fmtN(ml.overdue, 0) + ' فاتت، حمل الدماغ ' + fmtN(ml.score, 0) + '٪.';
  b.appendChild(sum);

  UI.sheet({
    title: 'الحساب الختامي لليوم',
    body: b,
    actions: [
      { label: 'بعدين' },
      {
        label: 'أقفل اليوم',
        kind: 'p',
        fn: async () => {
          Hist.begin('إقفال اليوم');
          await R.journal.add({
            date: today(),
            body: 'اللي اتحقق: ' + ins.win.value + '\nاللي عطّل: ' + ins.block.value,
            gratitude: ins.grat.value
          });
          if (ins.mood.value) await R.moodLogs.add({ date: today(), mood: +ins.mood.value });
          if (ins.tomorrow.value.trim()) {
            await R.tasks.add({ title: ins.tomorrow.value.trim(), status: 'todo', due: addDays(today(), 1), priority: 1 });
          }
          Hist.commit();
          UI.toast('اليوم اتقفل. نوم بدري أحسن حاجة 🌙', { undo: true });
          Router.render();
        }
      }
    ]
  });
}

Object.assign(window, {
  mentalLoad, taskRow, breakdownTask, getNudges, dailyShutdown
});
