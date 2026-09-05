/* ============================================================================
   كله — Kollo | Settings Module: AI Provider & Models View
   ============================================================================ */

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

  renderAIModelSelector(c, s, key, prov, baseUrl);
  renderAITestButton(test, key, prov, baseUrl);
  renderAIParameters(c, s, fld);

  prov.onchange = async () => {
    buW.hidden = prov.value !== 'custom';
    await saveSettings({ ai: Object.assign({}, S.settings.ai, { provider: prov.value, model: '' }) });
    Router.render();
  };
  buW.hidden = s.provider !== 'custom';

  key.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { keyPlain: key.value, keyEnc: key.value ? null : S.settings.ai.keyEnc }) });
  baseUrl.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { baseUrl: baseUrl.value }) });

  box.appendChild(c);
  box.appendChild(renderAINotes());

  return box;
}

Object.assign(window, { aiSettings });
