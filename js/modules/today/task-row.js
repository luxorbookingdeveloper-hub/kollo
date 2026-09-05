/* ============================================================================
   كله — Kollo | Today Module: Task Row & Breakdown Task
   ============================================================================ */

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

Object.assign(window, { taskRow, breakdownTask });
