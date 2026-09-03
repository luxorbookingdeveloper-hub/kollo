/* ============================================================================
   كله — Kollo | Module: Settings (الإعدادات العامة وإعدادات الذكاء الاصطناعي)
   Preferences, AI model configuration, module toggles, privacy & persistent storage
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.settings = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'general';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['general', 'عام'], ['ai', 'محرّك الأسطى'], ['modules', 'المودولات'], ['privacy', 'الخصوصية'], ['auth', 'الدخول']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/settings?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'general') {
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
  } else if (tab === 'ai') {
    box.appendChild(await aiSettings());
  } else if (tab === 'modules') {
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
  } else if (tab === 'privacy') {
    const c = document.createElement('div');
    c.className = 'card pad';
    const h = document.createElement('h2');
    h.style.cssText = 'font-weight:800;font-size:1.05rem';
    h.textContent = 'خصوصيتك';

    const p = mdLite(
      [
        'كل داتاك محفوظة على جهازك في IndexedDB. مفيش سيرفر، مفيش تتبّع، مفيش analytics.',
        'التطبيق مش بيعمل أي طلب شبكة إلا لمزوّد الذكاء الاصطناعي اللي إنت اخترته، ولما تنده الأسطى بس.',
        'مفتاح الـAPI بيتخزّن على جهازك، وتقدر تشفّره بكلمة سر (AES-GCM + PBKDF2) — ساعتها بيتفتح مرة كل جلسة.',
        'النسخة الاحتياطية ملف عندك. لو حاسس إنها فيها حاجات حسّاسة، صدّرها مشفّرة بكلمة سر.',
        'المرفقات بتتخزّن Blob محلي. المتصفح ممكن يفضّي التخزين لو المساحة قلّت — اضغط الزر تحت عشان تطلب تخزين دايم.'
      ].join('\n\n')
    );
    c.append(h, p);

    const pb = document.createElement('button');
    pb.className = 'b';
    pb.textContent = '📌 اطلب تخزين دايم';
    pb.onclick = async () => {
      try {
        if (!navigator.storage || !navigator.storage.persist) {
          return UI.toast('المتصفح ده مش بيدعم الطلب ده');
        }
        const ok = await navigator.storage.persist();
        UI.toast(ok ? 'تمام — التخزين بقى دايم' : 'المتصفح مش موافق يثبّت التخزين — النسخة الاحتياطية بقت أهم');
      } catch (e) {
        UI.toast('مش قادر: ' + e.message);
      }
    };
    c.appendChild(pb);

    const est = document.createElement('div');
    est.className = 'xs dim';
    est.style.marginTop = '8px';
    try {
      const e = await navigator.storage.estimate();
      est.textContent = 'مستخدم: ' + fmtN((e.usage || 0) / 1048576, 2) + ' م.ب من ~' + fmtN((e.quota || 0) / 1048576, 0) + ' م.ب';
    } catch (e) {
      est.textContent = 'المتصفح مش بيقول حجم التخزين.';
    }
    c.appendChild(est);
    box.appendChild(c);
  } else {
    const c = document.createElement('div');
    c.className = 'card pad';
    const b = document.createElement('span');
    b.className = 'badge w';
    b.textContent = 'معطّلة حاليًا';

    const h = document.createElement('h2');
    h.style.cssText = 'font-weight:800;font-size:1.05rem';
    h.textContent = 'طبقة الدخول';

    const p = document.createElement('p');
    p.className = 'muted sm';
    p.textContent = 'الواجهة دي موجودة كشكل بس (AUTH_ENABLED = false). التطبيق كله محلي ومفيش حساب ولا سيرفر — الحقول مقفولة عن قصد.';
    c.append(h, b, p);

    ['البريد', 'كلمة السر'].forEach(l => {
      const w = document.createElement('div');
      w.className = 'fld';
      const lb = document.createElement('label');
      lb.textContent = l;
      const i = document.createElement('input');
      i.className = 'in';
      i.disabled = true;
      i.placeholder = '—';
      w.append(lb, i);
      c.appendChild(w);
    });

    const btn = document.createElement('button');
    btn.className = 'b p';
    btn.textContent = 'دخول';
    btn.disabled = true;
    c.appendChild(btn);
    box.appendChild(c);
  }

  return box;
};

async function aiSettings() {
  const box = document.createElement('div');
  const s = S.settings.ai;
  const c = document.createElement('div');
  c.className = 'card pad';

  const fld = (label, el, hint) => {
    const w = document.createElement('div');
    w.className = 'fld';
    const l = document.createElement('label');
    l.textContent = label;
    w.append(l, el);
    if (hint) {
      const h = document.createElement('div');
      h.className = 'xs dim';
      h.textContent = hint;
      w.appendChild(h);
    }
    c.appendChild(w);
    return el;
  };

  const prov = document.createElement('select');
  prov.className = 'in';
  [['gemini', 'Google Gemini (native)'], ['openrouter', 'OpenRouter'], ['custom', 'OpenAI-Compatible (Base URL)']].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    if (s.provider === v) o.selected = true;
    prov.appendChild(o);
  });
  fld('المزوّد', prov);

  const baseUrl = document.createElement('input');
  baseUrl.className = 'in';
  baseUrl.value = s.baseUrl || '';
  baseUrl.placeholder = 'https://…/v1';
  const buW = fld('Base URL', baseUrl, 'لأي endpoint متوافق مع OpenAI. لو المتصفح رفض الطلب (CORS) — ده قيد من المزوّد مش من التطبيق.').parentNode;

  const key = document.createElement('input');
  key.className = 'in';
  key.type = 'password';
  key.value = s.keyPlain || '';
  key.placeholder = s.keyEnc ? '(محفوظ مشفّر)' : 'API Key';
  fld('مفتاح الـAPI', key, 'بيتخزّن على جهازك بس. الأسطى هو المكان الوحيد اللي بيعمل طلب شبكة.');

  const row = document.createElement('div');
  row.className = 'row wrap';

  const showK = document.createElement('button');
  showK.className = 'b sm';
  showK.textContent = '👁️ إظهار';
  showK.onclick = () => {
    key.type = key.type === 'password' ? 'text' : 'password';
  };

  const test = document.createElement('button');
  test.className = 'b sm';
  test.textContent = '🔌 اختبار الاتصال';

  const enc = document.createElement('button');
  enc.className = 'b sm';
  enc.textContent = '🔒 شفّر بكلمة سر';

  row.append(showK, test, enc);
  c.appendChild(row);

  const pw = document.createElement('input');
  pw.className = 'in';
  pw.type = 'password';
  pw.placeholder = 'كلمة سر الجلسة (لو المفتاح مشفّر)';
  pw.style.marginTop = '8px';
  if (s.keyEnc) c.appendChild(pw);

  pw.onchange = () => {
    AI._sessionPass = pw.value;
    UI.toast('تمام — هنفتح المفتاح بالكلمة دي للجلسة دي');
  };

  enc.onclick = async () => {
    if (!key.value) {
      UI.toast('اكتب المفتاح الأول');
      return;
    }
    const p = prompt('كلمة سر لتشفير المفتاح (مش هنقدر نرجّعها لو نسيتها)');
    if (!p) return;
    const e = await Crypt.enc(key.value, p);
    AI._sessionPass = p;
    await saveSettings({ ai: Object.assign({}, S.settings.ai, { keyEnc: e, keyPlain: '' }) });
    UI.toast('المفتاح اتشفّر واتحفظ على جهازك 🔒');
    Router.render();
  };

  const modelRow = document.createElement('div');
  modelRow.className = 'row wrap';

  const modelSel = document.createElement('select');
  modelSel.className = 'in';
  modelSel.style.flex = '1 1 200px';

  const cur = document.createElement('option');
  cur.value = s.model || '';
  cur.textContent = s.model || '(مفيش موديل مختار)';
  modelSel.appendChild(cur);

  const fetchBtn = document.createElement('button');
  fetchBtn.className = 'b p';
  fetchBtn.textContent = 'هات الموديلات';

  const search = document.createElement('input');
  search.className = 'in';
  search.placeholder = 'فلتر بالاسم…';
  search.style.flex = '1 1 140px';

  modelRow.append(modelSel, search, fetchBtn);
  const mw = document.createElement('div');
  mw.className = 'fld';
  const ml = document.createElement('label');
  ml.textContent = 'الموديل';
  mw.append(ml, modelRow);
  c.appendChild(mw);

  const info = document.createElement('div');
  info.className = 'xs dim';
  c.appendChild(info);

  let all = [];
  const fillModels = () => {
    const q = search.value.trim();
    modelSel.textContent = '';
    const list = q ? all.filter(m => fuzzy(q, m.id + ' ' + m.name) > 0) : all;
    (list.length ? list : all).slice(0, 400).forEach(m => {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.id + (m.tools === false ? ' (مفيش تولز)' : '');
      if (m.id === S.settings.ai.model) o.selected = true;
      modelSel.appendChild(o);
    });
    info.textContent = fmtN(all.length, 0) + ' موديل · الاختيار: ' + (modelSel.value || '—');
  };

  search.addEventListener('input', debounce(fillModels, 120));

  fetchBtn.onclick = async () => {
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'بيجيب…';
    try {
      S.settings.ai.keyPlain = key.value || S.settings.ai.keyPlain;
      S.settings.ai.provider = prov.value;
      S.settings.ai.baseUrl = baseUrl.value;
      all = await AI.listModels();
      all.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      fillModels();
      UI.toast('جبنا ' + fmtN(all.length, 0) + ' موديل');
    } catch (e) {
      UI.toast('مش قادر أجيب الموديلات: ' + e.message);
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = 'هات الموديلات';
    }
  };

  modelSel.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { model: modelSel.value }) });

  test.onclick = async () => {
    try {
      S.settings.ai.keyPlain = key.value || S.settings.ai.keyPlain;
      S.settings.ai.provider = prov.value;
      S.settings.ai.baseUrl = baseUrl.value;
      if (!S.settings.ai.model) {
        UI.toast('اختار موديل الأول');
        return;
      }
      const r = await AI.call([{ role: 'user', content: 'قول "تمام" بس.' }], null, null);
      UI.toast('الاتصال شغّال ✅ ' + String(r.text || '').slice(0, 40));
    } catch (e) {
      UI.toast('فشل: ' + e.message);
    }
  };

  /* پاراميترات */
  const grid = document.createElement('div');
  grid.className = 'grid g3';

  const numF = (label, k, min, max, step) => {
    const w = document.createElement('div');
    w.className = 'fld';
    const l = document.createElement('label');
    l.textContent = label;
    const i = document.createElement('input');
    i.className = 'in';
    i.type = 'number';
    i.min = min;
    i.max = max;
    i.step = step || 'any';
    i.value = S.settings.ai[k];
    i.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { [k]: +i.value }) });
    w.append(l, i);
    grid.appendChild(w);
  };

  numF('Temperature', 'temperature', 0, 2, 0.05);
  numF('Top P', 'topP', 0, 1, 0.05);
  numF('Top K', 'topK', 1, 200, 1);
  numF('Max tokens', 'maxTokens', 256, 200000, 64);
  numF('حد الخطوات', 'maxSteps', 1, 40, 1);
  numF('Timeout (ms)', 'timeout', 5000, 300000, 1000);
  c.appendChild(grid);

  const reas = document.createElement('select');
  reas.className = 'in';
  ['xhigh', 'high', 'medium', 'low', 'minimal', 'none'].forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    if (s.reasoning === v) o.selected = true;
    reas.appendChild(o);
  });
  fld('مستوى التفكير (reasoning effort)', reas, 'يتحوّل تلقائيًا للشكل اللي المزوّد بيفهمه. لو الموديل مش بيدعمه بيتجاهله.');
  reas.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { reasoning: reas.value }) });

  const swi = (label, k, hint) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;min-height:44px';
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = !!S.settings.ai[k];
    const s2 = document.createElement('span');
    s2.textContent = label;
    l.append(i, s2);
    c.appendChild(l);
    if (hint) {
      const h = document.createElement('div');
      h.className = 'xs dim';
      h.textContent = hint;
      c.appendChild(h);
    }
    i.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { [k]: i.checked }) });
  };

  swi('ستريمنج (الرد بيتكتب حرف حرف)', 'stream', 'لو المزوّد بيعمل مشاكل مع SSE، اطفيه — الرد هييجي مرة واحدة.');
  swi('اظهر التفكير لو المزوّد رجّعه', 'includeReasoning');
  swi('وضع الثقة: نفّذ الأفعال الحسّاسة بدون سؤال', 'trust', 'الافتراضي مطفي — الحذف والاستيراد بيسألوك.');
  swi('أظهر التطبيق في تقارير OpenRouter العامة', 'attribution', 'لو مطفي، بنبعت هيدر الإخفاء بدل هيدر النسب.');

  prov.onchange = async () => {
    buW.hidden = prov.value !== 'custom';
    await saveSettings({ ai: Object.assign({}, S.settings.ai, { provider: prov.value, model: '' }) });
    Router.render();
  };
  buW.hidden = s.provider !== 'custom';

  key.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { keyPlain: key.value, keyEnc: key.value ? null : S.settings.ai.keyEnc }) });
  baseUrl.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { baseUrl: baseUrl.value }) });

  box.appendChild(c);

  const notes = document.createElement('div');
  notes.className = 'card pad sm muted';
  notes.style.marginTop = '12px';
  notes.appendChild(
    mdLite(
      [
        'عن بصمات التفكير (thought signatures): موديلات Gemini 3 بترجّع بصمة مع نداءات التولز، ولازم ترجع زي ما هي في نفس ترتيب الرسايل — ' +
          'التطبيق بيحفظها ويبعتها في thoughtSignature (Gemini) أو extra_content.google.thought_signature (شكل OpenAI).',
        'لو المزوّد رجّع 400 بسبب البصمة، الأسطى بينضّف البصمات ويجرّب تاني، وبعدين خطوة واحدة بدون تولز، وبيعرض لك رسالة واضحة.',
        'CORS: لو الطلب اتقفل قبل ما يوصل، ده قيد من المزوّد على المتصفح — جرّب مزوّد تاني أو Base URL بديل.'
      ].join('\n\n')
    )
  );
  box.appendChild(notes);

  return box;
}

Object.assign(window, {
  aiSettings
});
