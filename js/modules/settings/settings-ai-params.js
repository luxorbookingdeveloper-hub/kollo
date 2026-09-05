/* ============================================================================
   كله — Kollo | Settings Module: AI Parameters & Options
   ============================================================================ */

function renderAIParameters(c, s, fld) {
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
    i.value = S.settings.ai[k] !== undefined ? S.settings.ai[k] : '';
    if (k === 'maxSteps') i.placeholder = '0 = مفتوح';
    i.onchange = () => saveSettings({ ai: Object.assign({}, S.settings.ai, { [k]: +i.value }) });
    w.append(l, i);
    grid.appendChild(w);
  };

  numF('Temperature', 'temperature', 0, 2, 0.05);
  numF('Top P', 'topP', 0, 1, 0.05);
  numF('Top K', 'topK', 1, 200, 1);
  numF('Max tokens', 'maxTokens', 256, 200000, 64);
  numF('حد الخطوات (0 = مفتوح)', 'maxSteps', 0, 100, 1);
  numF('Timeout (ms)', 'timeout', 5000, 600000, 1000);
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
}

function renderAINotes() {
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
  return notes;
}

Object.assign(window, {
  renderAIParameters,
  renderAINotes
});
