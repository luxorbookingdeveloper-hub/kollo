/* ============================================================================
   كله — Kollo | Feature: Achievement Badges (الشرايط)
   12 achievement badges evaluated purely from local data
   ============================================================================ */
const Badges = {
  list: [
    { id: 'first_step', name: 'أول خطوة', hint: 'خلّصت أول مهمة', fn: d => d.tasks.some(t => t.status === 'done') },
    {
      id: 'no_delay_week',
      name: 'أسبوع من غير تأجيل',
      hint: '٧ أيام مفيش تأجيل و٣ مهام خلصت',
      fn: d => {
        const wk = addDays(today(), -7);
        const late = d.tasks.some(t => (+t.postponed || 0) > 0 && String(t.updatedAt || '').slice(0, 10) >= wk);
        return !late && d.tasks.filter(t => t.doneAt && String(t.doneAt).slice(0, 10) >= wk).length >= 3;
      }
    },
    {
      id: 'debt_free',
      name: 'مفيش دَين عليك',
      hint: 'كل اللي عليك اتسدّد',
      fn: d => {
        const owe = d.debts.filter(x => x.dir === 'owe');
        return owe.length > 0 && owe.every(x => +(x.remaining != null ? x.remaining : x.amount) === 0);
      }
    },
    { id: 'book_done', name: 'قرأت كتاب لآخره', hint: 'كتاب حالته «خلصته»', fn: d => d.books.some(b => b.status === 'done') },
    { id: 'century', name: 'مية مهمة', hint: '١٠٠ مهمة خلصت', fn: d => d.tasks.filter(t => t.status === 'done').length >= 100 },
    {
      id: 'habit_21',
      name: 'صاحب العادة',
      hint: 'streak ٢١ يوم في عادة',
      fn: d => {
        const by = {};
        d.habitLogs.forEach(l => {
          (by[l.habitId] = by[l.habitId] || {})[l.date] = 1;
        });
        return Object.keys(by).some(h => {
          let s = 0;
          for (let i = 0; i < 400; i++) {
            if (by[h][addDays(today(), -i)]) s++;
            else if (i > 0) break;
          }
          return s >= 21;
        });
      }
    },
    { id: 'kashkool_full', name: 'كله مليان مذكرات', hint: '٢٥ مذكرة', fn: d => d.notes.length >= 25 },
    { id: 'accountant', name: 'حاسب الفلوس', hint: '١٠٠ معاملة مسجّلة', fn: d => d.txns.length >= 100 },
    { id: 'family_man', name: 'واصل الرحم', hint: '٥ ناس اطمنت عليهم', fn: d => d.people.filter(p => p.lastContact).length >= 5 },
    {
      id: 'reviewer',
      name: 'المراجع',
      hint: '٤ مراجعات أسبوعية محفوظة',
      fn: d => d.notes.filter(n => (n.tags || []).indexOf('مراجعة') > -1).length >= 4
    },
    { id: 'srs_king', name: 'ملك المذاكرة', hint: '٥٠ كارت اتراجع', fn: d => d.cards.filter(c => (+c.reps || 0) > 0).length >= 50 },
    { id: 'home_tidy', name: 'البيت مضبوط', hint: '٥ ممتلكات و٣ ضمانات', fn: d => d.assets.length >= 5 && d.warranties.length >= 3 }
  ],
  async check(notify) {
    const [tasks, habitLogs, notes, txns, debts, books, people, cards, assets, warranties] = await Promise.all([
      R.tasks.all(),
      R.habitLogs.all(),
      R.notes.all(),
      R.txns.all(),
      R.debts.all(),
      R.books.all(),
      R.people.all(),
      R.cards.all(),
      R.assets.all(),
      R.warranties.all()
    ]);
    const d = { tasks, habitLogs, notes, txns, debts, books, people, cards, assets, warranties };
    const earned = [];
    Badges.list.forEach(b => {
      try {
        if (b.fn(d)) earned.push(b.id);
      } catch (e) {}
    });
    const had = S.settings.badges || [];
    const isNew = earned.filter(x => had.indexOf(x) < 0);
    if (isNew.length) {
      try {
        await saveSettings({ badges: earned });
      } catch (e) {}
      if (notify) {
        isNew.forEach(id => {
          const b = Badges.list.find(x => x.id === id);
          if (b) UI.toast('🏅 شريط جديد: ' + b.name);
        });
      }
    }
    return { earned, isNew };
  }
};

window.Badges = Badges;
