/* ============================================================================
   كله — Kollo | Core Helpers: Spaced Repetition (SM-2 Algorithm)
   ============================================================================ */

function sm2(card, grade) {
  /* grade 0..5 */
  let ef = card.ef == null ? 2.5 : card.ef, rep = card.reps || 0, iv = card.interval || 0;
  if (grade < 3) {
    rep = 0;
    iv = 1;
  } else {
    ef = clamp(ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)), 1.3, 2.8);
    rep++;
    iv = rep === 1 ? 1 : rep === 2 ? 6 : Math.round(iv * ef);
  }
  return { ef, reps: rep, interval: iv, due: addDays(today(), iv), lastGrade: grade };
}

Object.assign(window, {
  sm2
});
