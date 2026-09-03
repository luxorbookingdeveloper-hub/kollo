/* ============================================================================
   كله — Kollo | Module: Spirit & Reflection (الروحاني)
   Personal worship tracking, prayer commitment heatmap, and Hijri calendar note
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.spirit = async () => {
  const box = document.createElement('div');

  const note = document.createElement('div');
  note.className = 'card pad xs muted';
  note.textContent = 'القسم ده اختياري بالكامل (تقدر تخفيه من الإعدادات) — تسجيل شخصي بس، ومفيش فتاوى ولا نصايح دينية جازمة.';
  box.appendChild(note);

  const bar = document.createElement('div');
  bar.className = 'row wrap';
  bar.style.margin = '12px 0';

  ['صلاة', 'ورد قرآن', 'أذكار', 'صيام', 'صدقة'].forEach(k => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = k;
    b.onclick = async () => {
      Hist.begin('تسجيل');
      await R.worship.add({ kind: k, date: today(), value: '1' });
      Hist.commit();
      UI.toast('اتسجّل 🤍', { undo: true });
      Router.render();
    };
    bar.appendChild(b);
  });
  box.appendChild(bar);

  const rows = await R.worship.all();
  if (rows.length) {
    const map = {};
    rows.forEach(r => {
      map[r.date] = (map[r.date] || 0) + 1;
    });
    const c = document.createElement('div');
    c.className = 'card pad';
    const h = document.createElement('div');
    h.style.fontWeight = '800';
    h.textContent = 'الالتزام آخر ٦ شهور';
    c.append(h, heatmap(map));
    box.appendChild(c);
  } else {
    box.appendChild(UI.empty('مفيش تسجيلات', 'سجّل بأي تصنيف من اللي فوق — كله بإيدك.', null));
  }

  const hj = hijri();
  if (hj) {
    const c = document.createElement('div');
    c.className = 'card pad sm muted';
    c.style.marginTop = '12px';
    c.textContent = 'التاريخ الهجري (من المتصفح): ' + hj;
    box.appendChild(c);
  }
  return box;
};
