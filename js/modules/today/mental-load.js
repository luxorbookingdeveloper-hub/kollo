/* ============================================================================
   كله — Kollo | Today Module: Mental Load & Smart Nudges (الحبشتكنات)
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

Object.assign(window, { mentalLoad, getNudges });
