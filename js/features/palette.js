/* ============================================================================
   كله — Kollo | Feature: Command Palette (Ctrl/Cmd+K)
   Fuzzy command matching and natural language quick logging
   ============================================================================ */

function openPalette() {
  const layers = $('#layers');
  const bd = document.createElement('div');
  bd.className = 'sheet-bd';

  const p = document.createElement('div');
  p.className = 'pal';
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'بحث وأوامر');

  const i = document.createElement('input');
  i.setAttribute('aria-label', 'اكتب أمر أو دوّر');
  i.placeholder = 'اكتب حاجة… أو "مهمة: اتصل بماما" أو "صرفت ٤٥ قهوة"';

  const res = document.createElement('div');
  res.className = 'res';
  res.setAttribute('role', 'listbox');
  p.append(i, res);
  layers.append(bd, p);

  requestAnimationFrame(() => {
    bd.classList.add('in');
    p.classList.add('in');
    i.focus();
  });

  let items = [],
    sel = 0;
  const close = () => {
    bd.classList.remove('in');
    p.classList.remove('in');
    setTimeout(() => {
      bd.remove();
      p.remove();
    }, 240);
    document.removeEventListener('keydown', onk);
  };

  const cmds = [
    { t: '＋ مهمة جديدة', f: () => openEditor('tasks', null) },
    { t: '＋ معاملة فلوس', f: () => addTxn() },
    { t: '📝 سجّل مصاريف بالكلام', f: () => quickExpenses() },
    { t: '🧠 اسأل الأسطى', f: () => Router.go('ai') },
    { t: '🌙 الحساب الختامي', f: () => dailyShutdown() },
    { t: '🎯 وضع التركيز', f: () => startFocus() },
    { t: '💾 نسخة احتياطية', f: () => backupUI() },
    { t: '🔧 الإعدادات', f: () => Router.go('settings') },
    { t: '🧪 الاختبارات الداخلية', f: () => Router.go('tests') },
    { t: '◐ غيّر الثيم', f: () => cycleTheme() },
    {
      t: '↩️ رجّع آخر خطوة (Undo)',
      f: async () => {
        const b = await Hist.undo();
        UI.toast(b ? 'رجّعنا: ' + b.label : 'مفيش حاجة نرجّعها');
      }
    }
  ].concat(MODULES.map(m => ({ t: m.i + ' افتح ' + m.t, f: () => Router.go(m.k) })));

  const paint = () => {
    res.textContent = '';
    items.forEach((it, ix) => {
      const d = document.createElement('div');
      d.className = 'it';
      d.setAttribute('role', 'option');
      d.setAttribute('aria-selected', ix === sel ? 'true' : 'false');
      d.textContent = it.t;
      d.onclick = () => {
        close();
        it.f();
      };
      res.appendChild(d);
    });
  };

  const run = debounce(async () => {
    const q = i.value.trim();
    if (/^(مهمة|task)\s[:：]/i.test(q)) {
      items = [
        {
          t: '＋ اعمل مهمة: "' + q.split(/[:：]/).slice(1).join(':').trim() + '"',
          f: async () => {
            Hist.begin('مهمة سريعة');
            await R.tasks.add({
              title: q.split(/[:：]/).slice(1).join(':').trim(),
              status: 'todo',
              due: today(),
              priority: 2
            });
            Hist.commit();
            UI.toast(T('save'), { undo: true });
            Router.render();
          }
        }
      ];
      sel = 0;
      return paint();
    }

    const exp = parseExpenses(q);
    if (/صرفت|دفعت/.test(q) && exp.length) {
      items = [
        {
          t: '💰 سجّل: ' + exp.map(e => e.label + ' ' + money(e.amount)).join('، '),
          f: async () => {
            Hist.begin('مصاريف');
            const acc = await defaultAccount();
            for (const e of exp) {
              const c = await ensureCategory(e.category);
              await R.txns.add({
                type: 'expense',
                amount: e.amount,
                date: today(),
                accountId: acc.id,
                categoryId: c.id,
                note: e.label
              });
            }
            Hist.commit();
            UI.toast('اتسجّلت', { undo: true });
            Router.render();
          }
        }
      ];
      sel = 0;
      return paint();
    }

    if (!q) {
      items = cmds.slice(0, 12);
      sel = 0;
      return paint();
    }

    const c = cmds
      .map(x => ({ x, s: fuzzy(q, x.t) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(x => x.x);
    const found = await searchEverything(q, 14);
    items = c.concat(
      found.map(f => ({
        t: (MODULES.find(m => m.store === f.store) || { i: '•' }).i + ' ' + f.title,
        f: () => Router.go(f.store === 'txns' ? 'money?tab=txns' : (MODULES.find(m => m.store === f.store) || { k: 'today' }).k)
      }))
    );
    sel = 0;
    paint();
  }, 140);

  i.addEventListener('input', run);
  run();

  function onk(e) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      sel = clamp(sel + 1, 0, items.length - 1);
      paint();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sel = clamp(sel - 1, 0, items.length - 1);
      paint();
    } else if (e.key === 'Enter') {
      if (items[sel]) {
        const f = items[sel].f;
        close();
        f();
      }
    }
  }

  document.addEventListener('keydown', onk);
  bd.onclick = close;
}

function cycleTheme() {
  const order = ['light', 'dark', 'retro', 'auto'];
  const i = order.indexOf(S.settings.theme);
  saveSettings({ theme: order[(i + 1) % order.length] });
  UI.toast('الثيم: ' + { light: 'فاتح', dark: 'غامق', retro: 'ريترو', auto: 'تلقائي' }[S.settings.theme]);
}

Object.assign(window, {
  openPalette, cycleTheme
});
