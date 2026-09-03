/* ============================================================================
   كله — Kollo | Feature: Smart Reminders & Nudges
   Real data reminders, "شدّ الودن" gentle task follow-up, and "لولا كنت فاكر" throwback
   ============================================================================ */
async function remindersCheck() {
  const soon = addDays(today(), 7);
  const out = [];
  const docs = (await R.documents.all()).filter(d => d.expiry && d.expiry <= addDays(today(), 90));
  docs.forEach(d => {
    const dd = Math.round((new Date(d.expiry) - new Date(today())) / dayMs);
    if ([90, 30, 7].some(x => dd <= x && dd > x - 3) || dd <= 7) out.push('📄 ' + d.name + ' بينتهي ' + relDay(d.expiry));
  });

  (await R.warranties.all()).filter(w => w.expiry && w.expiry <= soon).forEach(w => out.push('🧾 ضمان ' + w.name + ' بينتهي ' + relDay(w.expiry)));
  (await R.subscriptions.all()).filter(s => s.nextDue && s.nextDue <= soon).forEach(s => out.push('🔁 ' + s.name + ' استحقاقه ' + relDay(s.nextDue)));
  (await R.bills.all()).filter(b => b.due && b.due <= soon && b.status !== 'paid').forEach(b => out.push('💡 فاتورة ' + (b.kind || '') + ' ' + relDay(b.due)));
  (await R.meds.all()).filter(m => m.active !== false && m.stock != null && +m.stock <= 3).forEach(m => out.push('💊 ' + m.name + ' قرب يخلص (' + fmtN(m.stock, 0) + ' فاضل)'));

  const ev = await R.events.byIndex('start', IDBKeyRange.only(today()));
  ev.filter(e => e.time).forEach(e => out.push('📅 ' + e.title + ' ' + e.time));
  if (!out.length) return;

  UI.toast(out.slice(0, 3).join(' · ') + (out.length > 3 ? ' · و' + fmtN(out.length - 3, 0) + ' غيرهم' : ''));
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('كله', { body: out.slice(0, 4).join('\n') });
    } catch (e) {}
  }
}

async function nudgeCheck() {
  const n = S.settings.nudge || {};
  if (n.off === today()) return;
  const late = (await R.tasks.all())
    .filter(t => t.status !== 'done' && t.due && t.due < today() && (+t.postponed || 0) >= 1)
    .sort((a, b) => (+b.postponed || 0) - (+a.postponed || 0));
  if (!late.length) return;

  const count = n.date === today() ? +n.count || 0 : 0;
  if (count >= 3) return;
  const t = late[0];
  const tone = S.settings.sensitive ? 0 : count;
  const lines = [
    'المهمة «' + t.title + '» مستنية من ' + relDay(t.due) + '. نبدأ بخطوة صغيرة؟',
    '«' + t.title + '» أجّلتها ' + fmtN(t.postponed, 0) + ' مرة. تحب نفكّكها لخطوات أصغر؟',
    'يا صاحبي، «' + t.title + '» كتبت اسمها في كله ونسيتها. نقفلها ولا نلغيها بضمير مستريح؟'
  ];

  const b = document.createElement('div');
  b.appendChild(mdLite(lines[Math.min(tone, 2)]));
  await saveSettings({ nudge: { date: today(), count: count + 1, off: n.off || null } });

  UI.sheet({
    title: 'شدّ الودن',
    body: b,
    actions: [
      {
        label: 'سيبني في حالي',
        fn: async () => {
          await saveSettings({ nudge: { date: today(), count: 3, off: today() } });
          UI.toast('تمام، مش هنندهلك تاني النهاردة');
        }
      },
      {
        label: 'أجّلها لبكرة',
        fn: async () => {
          Hist.begin('تأجيل');
          await R.tasks.patch(t.id, { due: addDays(today(), 1), postponed: (+t.postponed || 0) + 1 });
          Hist.commit();
          UI.toast('اتأجلت لبكرة', { undo: true });
          Router.render();
        }
      },
      {
        label: 'فكّكها',
        kind: 'p',
        fn: async () => {
          Router.go('tasks');
          openEditor('tasks', t);
        }
      }
    ]
  });
}

async function memoryCheck() {
  const wk = Math.floor(new Date(today()).getTime() / (7 * dayMs));
  if (String(S.settings.lastMemory || '') === String(wk)) return;
  const old = addDays(today(), -60);
  const pool = [].concat(
    (await R.notes.all()).filter(n => String(n.createdAt || '').slice(0, 10) <= old).map(n => ({ t: n.title, d: n.createdAt, k: 'مذكرة', id: n.id, store: 'notes' })),
    (await R.journal.all()).filter(j => String(j.date || '').slice(0, 10) <= old).map(j => ({ t: String(j.body || j.gratitude || '').slice(0, 60), d: j.date, k: 'جورنال', id: j.id, store: 'journal' })),
    (await R.tasks.all()).filter(t => t.doneAt && String(t.doneAt).slice(0, 10) <= old).map(t => ({ t: t.title, d: t.doneAt, k: 'إنجاز', id: t.id, store: 'tasks' }))
  );
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  await saveSettings({ lastMemory: String(wk) });

  const b = document.createElement('div');
  b.appendChild(mdLite('**' + pick.k + ' من ' + fmtDate(String(pick.d).slice(0, 10)) + '**\n\n' + (pick.t || '—')));
  UI.sheet({
    title: 'لولا كنت فاكر…',
    body: b,
    actions: [
      { label: 'إقفال' },
      {
        label: 'افتحها',
        kind: 'p',
        fn: async () => {
          const rec = await R[pick.store].get(pick.id);
          if (rec) openEditor(pick.store, rec);
        }
      }
    ]
  });
}

Object.assign(window, {
  remindersCheck, nudgeCheck, memoryCheck
});
