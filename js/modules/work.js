/* ============================================================================
   كله — Kollo | Module: Work & Time (الشغل والوقت)
   Time logging, Pomodoro timer with audio chime, Focus mode, Clients, and Invoices
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.work = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'time';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['time', 'الوقت'], ['pomo', 'بومودورو'], ['clients', 'عملاء'], ['invoices', 'فواتير وتحصيل']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/work?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'time') {
    const logs = await R.timeLogs.all();
    const add = document.createElement('button');
    add.className = 'b p';
    add.textContent = '＋ سجّل وقت';
    add.onclick = () => openEditor('timeLogs', { date: today() });
    box.appendChild(add);

    if (logs.length) {
      const c = document.createElement('div');
      c.className = 'card pad';
      c.style.marginTop = '12px';

      const h = document.createElement('div');
      h.style.fontWeight = '800';
      h.textContent = 'ساعات آخر ١٤ يوم';
      c.appendChild(h);

      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(today(), -i);
        days.push({
          l: String(+d.slice(8)),
          v: Math.round(logs.filter(l => l.date === d).reduce((s, l) => s + (+l.minutes || 0), 0) / 6) / 10
        });
      }
      c.appendChild(Chart.bars(days));

      const t = document.createElement('div');
      t.className = 'sm muted';
      t.textContent = 'إجمالي مسجّل: ' + fmtN(Math.round(logs.reduce((s, l) => s + (+l.minutes || 0), 0) / 60), 1) + ' ساعة';
      c.appendChild(t);

      box.appendChild(c);
    }

    const l2 = document.createElement('div');
    l2.style.marginTop = '12px';
    l2.appendChild(await collectionView('timeLogs', { emptyTitle: 'مفيش وقت مسجّل' }));
    box.appendChild(l2);
  } else if (tab === 'pomo') {
    box.appendChild(pomodoroUI());
  } else if (tab === 'clients') {
    box.appendChild(await collectionView('clients', { emptyTitle: 'مفيش عملاء' }));
  } else {
    const inv = await R.invoices.all();
    box.appendChild(await collectionView('invoices', { emptyTitle: 'مفيش فواتير' }));

    const open = inv.filter(i => i.status !== 'paid');
    if (open.length) {
      const c = document.createElement('div');
      c.className = 'card pad sm';
      c.style.marginTop = '12px';
      c.textContent =
        'مستحق للتحصيل: ' +
        money(open.reduce((s, i) => s + (+i.amount || 0), 0)) +
        ' من ' +
        fmtN(open.length, 0) +
        ' فاتورة' +
        (open.some(i => i.due && i.due < today()) ? ' — فيهم متأخر، تحب تفكّر العميل بلطف؟' : '');
      box.appendChild(c);
    }
  }
  return box;
};

function pomodoroUI() {
  const c = document.createElement('div');
  c.className = 'card pad';
  c.style.textAlign = 'center';

  const w = (S.settings.focus && S.settings.focus.work) || 25;
  const br = (S.settings.focus && S.settings.focus.brk) || 5;
  let left = w * 60,
    timer = null,
    onBreak = false;

  const d = document.createElement('div');
  d.className = 'num';
  d.style.cssText = 'font-size:3rem;font-weight:800;letter-spacing:-.04em';

  const lbl = document.createElement('div');
  lbl.className = 'muted sm';

  const row = document.createElement('div');
  row.className = 'row';
  row.style.justifyContent = 'center';
  row.style.marginTop = '10px';

  const st = document.createElement('button');
  st.className = 'b p';
  const rs = document.createElement('button');
  rs.className = 'b';
  rs.textContent = 'إعادة';
  row.append(st, rs);

  const paint = () => {
    d.textContent = pad2(Math.floor(left / 60)) + ':' + pad2(left % 60);
    lbl.textContent = onBreak ? 'راحة قصيرة' : 'شغل مركّز';
    st.textContent = timer ? 'إيقاف' : 'ابدأ';
  };

  const beep = () => {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      const o = a.createOscillator(),
        g = a.createGain();
      o.connect(g);
      g.connect(a.destination);
      o.frequency.value = 660;
      g.gain.setValueAtTime(0.12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.7);
      o.start();
      o.stop(a.currentTime + 0.7);
    } catch (e) {}
  };

  st.onclick = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      paint();
      return;
    }
    timer = setInterval(async () => {
      left--;
      if (left <= 0) {
        clearInterval(timer);
        timer = null;
        beep();
        if (!onBreak) {
          await R.pomodoros.add({ date: today(), minutes: w });
          UI.toast('خلصت بومودورو 🍅 خد راحة ' + fmtN(br, 0) + ' دقايق');
        }
        onBreak = !onBreak;
        left = (onBreak ? br : w) * 60;
      }
      paint();
    }, 1000);
    paint();
  };

  rs.onclick = () => {
    clearInterval(timer);
    timer = null;
    onBreak = false;
    left = w * 60;
    paint();
  };

  c.append(d, lbl, row);
  paint();

  const f = document.createElement('button');
  f.className = 'b';
  f.style.marginTop = '12px';
  f.textContent = '🎯 وضع التركيز (مهمة واحدة)';
  f.onclick = startFocus;
  c.appendChild(f);

  return c;
}

async function startFocus() {
  const tasks = (await R.tasks.all()).filter(t => t.status !== 'done').sort((a, b) => (a.priority || 3) - (b.priority || 3));
  if (!tasks.length) {
    UI.toast('مفيش مهام مفتوحة — سجّل واحدة الأول');
    return;
  }

  const t = tasks[0];
  document.body.classList.add('focus-on');

  const ov = document.createElement('div');
  ov.style.cssText =
    'position:fixed;inset:0;z-index:90;background:var(--bg);display:grid;place-items:center;padding:24px;text-align:center';

  const h = document.createElement('div');
  h.style.cssText = 'font-size:1.6rem;font-weight:800;max-width:560px';
  h.textContent = t.title;

  const s = document.createElement('div');
  s.className = 'muted';
  s.style.marginTop = '10px';
  s.textContent = 'حاجة واحدة بس. الباقي مستني.';

  const row = document.createElement('div');
  row.className = 'row';
  row.style.justifyContent = 'center';
  row.style.marginTop = '18px';

  const done = document.createElement('button');
  done.className = 'b p';
  done.textContent = '✅ خلصتها';
  done.onclick = async () => {
    Hist.begin('إنهاء');
    await R.tasks.patch(t.id, { status: 'done', doneAt: now() });
    Hist.commit();
    close();
    UI.toast('✅ ' + T('done'), { undo: true });
    Router.render();
  };

  const out = document.createElement('button');
  out.className = 'b';
  out.textContent = 'اطلع';
  out.onclick = () => close();

  row.append(done, out);
  const wrap = document.createElement('div');
  wrap.append(h, s, row);
  ov.appendChild(wrap);
  document.body.appendChild(ov);

  function close() {
    document.body.classList.remove('focus-on');
    ov.remove();
    document.removeEventListener('keydown', k);
  }

  const k = e => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', k);
}

Object.assign(window, {
  pomodoroUI, startFocus
});
