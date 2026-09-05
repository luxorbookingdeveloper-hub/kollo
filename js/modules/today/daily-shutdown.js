/* ============================================================================
   كله — Kollo | Today Module: Daily Shutdown (الحساب الختامي)
   ============================================================================ */

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

Object.assign(window, { dailyShutdown });
