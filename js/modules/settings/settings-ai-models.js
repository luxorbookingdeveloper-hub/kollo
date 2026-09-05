/* ============================================================================
   كله — Kollo | Settings Module: AI Model Selector & Test Connection
   ============================================================================ */

function renderAIModelSelector(c, s, key, prov, baseUrl) {
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
}

function renderAITestButton(test, key, prov, baseUrl) {
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
}

Object.assign(window, {
  renderAIModelSelector,
  renderAITestButton
});
