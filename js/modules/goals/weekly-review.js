/* ============================================================================
   كله — Kollo | Goals Module: Weekly Review Generator
   ============================================================================ */

async function weeklyReview() {
  const from = addDays(today(), -7);
  const tasks = await R.tasks.all();
  const done = tasks.filter(t => t.doneAt && String(t.doneAt).slice(0, 10) >= from);
  const open = tasks.filter(t => t.status !== 'done');
  const late = open.filter(t => t.due && t.due < today());
  const hl = (await R.habitLogs.all()).filter(l => l.date >= from);
  const habits = await R.habits.all();
  const tx = await txnsBetween(from, today());
  const exp = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(+t.amount || 0), 0);
  const moods = (await R.moodLogs.all()).filter(m => m.date >= from);
  const mavg = moods.length ? moods.reduce((s, m) => s + (+m.mood || 0), 0) / moods.length : null;
  const tl = (await R.timeLogs.all()).filter(t => t.date >= from).reduce((s, t) => s + (+t.minutes || 0), 0);

  return (
    '## مراجعة الأسبوع (' +
    fmtDate(from) +
    ' → ' +
    fmtDate(today()) +
    ')\n' +
    '- خلّصت ' +
    fmtN(done.length, 0) +
    ' مهمة، وفاضل ' +
    fmtN(open.length, 0) +
    ' مفتوحة منهم ' +
    fmtN(late.length, 0) +
    ' فاتت.\n' +
    '- العادات: ' +
    fmtN(hl.length, 0) +
    ' تسجيل على ' +
    fmtN(habits.length, 0) +
    ' عادة.\n' +
    '- الفلوس: مصاريف الأسبوع ' +
    money(exp) +
    '.\n' +
    (mavg != null ? '- المزاج: متوسط ' + fmtN(mavg, 1) + ' من ٥ (من ' + fmtN(moods.length, 0) + ' تسجيل).\n' : '') +
    (tl ? '- الوقت المسجّل: ' + fmtN(tl / 60, 1) + ' ساعة.\n' : '') +
    '\n### أسئلة تراجع نفسك بيها\n' +
    '- إيه أهم حاجة اتحققت وليه؟\n' +
    '- إيه اللي عطّل، وإيه اللي هتغيّره الأسبوع الجاي؟\n' +
    '- أهم ٣ حاجات للأسبوع الجاي؟\n\n' +
    '(كل الأرقام دي محسوبة من داتاك المسجّلة بس.)'
  );
}

Object.assign(window, {
  weeklyReview
});
