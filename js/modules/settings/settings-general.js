/* ============================================================================
   كله — Kollo | Settings Module: General & Modules Views
   ============================================================================ */

function renderGeneralSettings(box) {
  const c = document.createElement('div');
  c.className = 'card pad';

  const mk = (label, el) => {
    const w = document.createElement('div');
    w.className = 'fld';
    const l = document.createElement('label');
    l.textContent = label;
    w.append(l, el);
    c.appendChild(w);
    return el;
  };

  const nm = document.createElement('input');
  nm.className = 'in';
  nm.value = S.settings.name || '';
  mk('اسمك (الأسطى هينده بيه)', nm);
  nm.onchange = () => saveSettings({ name: nm.value });

  const cur = document.createElement('input');
  cur.className = 'in';
  cur.value = S.settings.currency || 'EGP';
  mk('العملة (كود ISO زي EGP)', cur);
  cur.onchange = () => {
    saveSettings({ currency: cur.value.toUpperCase().slice(0, 3) });
    Router.render();
  };

  const th = document.createElement('select');
  th.className = 'in';
  [['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'غامق'], ['retro', 'ريترو']].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    if (S.settings.theme === v) o.selected = true;
    th.appendChild(o);
  });
  mk('الثيم', th);
  th.onchange = () => saveSettings({ theme: th.value });

  const tn = document.createElement('select');
  tn.className = 'in';
  [['polite', 'مؤدب'], ['baladi', 'بلدي'], ['sarcastic', 'ساخر']].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    if (S.settings.tone === v) o.selected = true;
    tn.appendChild(o);
  });
  mk('نبرة الكتابة', tn);
  tn.onchange = () => saveSettings({ tone: tn.value });

  const nu = document.createElement('select');
  nu.className = 'in';
  [['latn', 'أرقام غربية 123'], ['arab', 'أرقام شرقية ١٢٣']].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    if (S.settings.numerals === v) o.selected = true;
    nu.appendChild(o);
  });
  mk('شكل الأرقام', nu);
  nu.onchange = () => {
    saveSettings({ numerals: nu.value });
    Router.render();
  };

  const sw = (label, key) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;min-height:44px';
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = !!S.settings[key];
    const s2 = document.createElement('span');
    s2.textContent = label;
    l.append(i, s2);
    c.appendChild(l);
    i.onchange = () => {
      saveSettings({ [key]: i.checked });
      Router.render();
    };
  };

  sw('نص أكبر (تكبير ١٢٥٪)', 'bigText');
  sw('عرض التاريخ الهجري لو المتصفح يدعمه', 'hijri');
  sw('السياق الحسّاس: أوقف السخرية تمامًا', 'sensitive');
  box.appendChild(c);

  const bk = document.createElement('button');
  bk.className = 'b';
  bk.style.marginTop = '12px';
  bk.textContent = '💾 نسخة احتياطية / استيراد';
  bk.onclick = backupUI;
  box.appendChild(bk);
}

function renderModulesSettings(box) {
  const c = document.createElement('div');
  c.className = 'card';
  const h = document.createElement('div');
  h.className = 'pad sm muted';
  h.textContent = 'اخفي اللي مش بتستخدمه — التطبيق بيتفصّل عليك.';
  c.appendChild(h);

  MODULES.filter(m => ['today', 'ai', 'settings'].indexOf(m.k) < 0).forEach(m => {
    const li = document.createElement('div');
    li.className = 'li';
    const t = document.createElement('div');
    t.style.flex = '1';
    t.textContent = m.i + ' ' + m.t;

    const i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = S.settings.modules[m.k] !== false;
    i.setAttribute('aria-label', m.t);
    i.onchange = async () => {
      const mm = Object.assign({}, S.settings.modules);
      mm[m.k] = i.checked;
      await saveSettings({ modules: mm });
      buildNav();
    };

    li.append(t, i);
    c.appendChild(li);
  });
  box.appendChild(c);
}

Object.assign(window, {
  renderGeneralSettings,
  renderModulesSettings
});
