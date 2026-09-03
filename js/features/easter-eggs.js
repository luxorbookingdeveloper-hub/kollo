/* ============================================================================
   كله — Kollo | Feature: Easter Eggs & Secret Stats
   Triple-click logo for 90s retro theme, "فيها إيه؟", and "شكراً يا أسطى"
   ============================================================================ */
function bindEggs() {
  let clicks = 0,
    t0 = 0;
  document.addEventListener(
    'click',
    e => {
      const logo = e.target.closest && e.target.closest('#logo,.logo,[data-logo]');
      if (!logo) return;
      const n = Date.now();
      if (n - t0 > 900) clicks = 0;
      t0 = n;
      clicks++;
      if (clicks >= 3) {
        clicks = 0;
        saveSettings({ theme: S.settings.theme === 'retro' ? 'auto' : 'retro' });
        UI.toast(S.settings.theme === 'retro' ? 'ثيم رِترو تسعينات 📼' : 'رجعنا للثيم العادي');
      }
    },
    true
  );

  document.addEventListener(
    'input',
    e => {
      const t = e.target;
      if (!(t && t.matches && t.matches('.pal input'))) return;
      const v = String(t.value || '').trim();
      if (/^فيها\s*(إيه|ايه)\s*\??$/.test(v)) {
        t.value = '';
        closeTopLayer();
        secretStats();
      } else if (/^شكرا?ً?\s*يا\s*(الأسطى|أسطى|اسطى)$/.test(v)) {
        t.value = '';
        closeTopLayer();
        thanksAnim();
      }
    },
    true
  );
}

function closeTopLayer() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

function thanksAnim() {
  UI.toast('العفو يا كبير 🤝 إحنا في الخدمة');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const d = document.createElement('div');
  d.style.cssText =
    'position:fixed;inset-inline-end:24px;inset-block-end:80px;z-index:120;font-size:2rem;pointer-events:none;transition:transform 900ms cubic-bezier(.2,.8,.2,1),opacity 900ms';
  d.textContent = '🎩';
  document.body.appendChild(d);
  requestAnimationFrame(() => {
    d.style.transform = 'translateY(-90px) rotate(-12deg)';
    d.style.opacity = '0';
  });
  setTimeout(() => d.remove(), 1000);
}

async function secretStats() {
  const [tasks, notes, txns, hl, logs] = await Promise.all([
    R.tasks.all(),
    R.notes.all(),
    R.txns.all(),
    R.habitLogs.all(),
    R.activityLog.byIndex('at', null, 1, 'next')
  ]);
  const first = logs[0] && logs[0].at ? String(logs[0].at).slice(0, 10) : null;
  const days = first ? Math.max(1, Math.round((new Date(today()) - new Date(first)) / dayMs) + 1) : 1;
  const dow = {};
  tasks.filter(t => t.doneAt).forEach(t => {
    const d = new Date(t.doneAt).getDay();
    dow[d] = (dow[d] || 0) + 1;
  });
  const bestDow = Object.keys(dow).sort((a, b) => dow[b] - dow[a])[0];
  const postponed = tasks.reduce((s, t) => s + (+t.postponed || 0), 0);
  const words = notes.reduce((s, n) => s + String(n.body || '').split(/\s+/).filter(Boolean).length, 0);
  const rows = [
    ['بقالك في كله', fmtN(days, 0) + ' يوم'],
    ['مهام خلّصتها', fmtN(tasks.filter(t => t.status === 'done').length, 0)],
    ['مرات التأجيل (مفيش لوم)', fmtN(postponed, 0)],
    ['أحسن يوم عندك', bestDow != null ? dowAr[+bestDow] : 'لسه بدري نعرف'],
    ['كلمات كتبتها في المذكرات', fmtN(words, 0)],
    ['تسجيلات عادات', fmtN(hl.length, 0)],
    ['معاملات فلوس', fmtN(txns.length, 0)]
  ];
  const b = document.createElement('div');
  const c = document.createElement('div');
  c.className = 'card';
  rows.forEach(([l, v]) => {
    const li = document.createElement('div');
    li.className = 'li';
    const a = document.createElement('div');
    a.style.flex = '1';
    a.textContent = l;
    const n = document.createElement('b');
    n.className = 'num';
    n.textContent = v;
    li.append(a, n);
    c.appendChild(li);
  });
  b.appendChild(c);
  const badges = await Badges.check(false);
  const h = document.createElement('div');
  h.style.cssText = 'font-weight:800;margin:14px 0 8px';
  h.textContent = 'الشرايط';
  b.appendChild(h);
  const g = document.createElement('div');
  g.className = 'row wrap';
  Badges.list.forEach(x => {
    const ch = document.createElement('span');
    ch.className = 'chip' + (badges.earned.indexOf(x.id) > -1 ? ' on' : '');
    ch.textContent = (badges.earned.indexOf(x.id) > -1 ? '🏅 ' : '🔒 ') + x.name;
    ch.title = x.hint;
    g.appendChild(ch);
  });
  b.appendChild(g);
  const f = document.createElement('div');
  f.className = 'xs dim';
  f.style.marginTop = '10px';
  f.textContent = 'كل الأرقام دي محسوبة من داتاك المسجّلة — مفيش رقم واحد من عندنا.';
  b.appendChild(f);
  UI.sheet({ title: 'فيها إيه؟ 👀', body: b, actions: [{ label: 'إقفال', kind: 'p' }] });
}

Object.assign(window, {
  bindEggs, closeTopLayer, thanksAnim, secretStats
});
