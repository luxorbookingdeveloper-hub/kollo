/* ============================================================================
   كله — Kollo | AI Config: Provider Authentication & Catalog
   ============================================================================ */

window.AI = window.AI || {
  busy: false,
  abort: null,
  chatId: null
};

Object.assign(window.AI, {
  async key() {
    const s = S.settings.ai;
    if (s.keyPlain) return s.keyPlain;
    if (s.keyEnc) {
      if (!AI._sessionPass) {
        throw new Error('المفتاح مشفّر — اكتب كلمة السر في إعدادات الأسطى الأول.');
      }
      return Crypt.dec(s.keyEnc, AI._sessionPass);
    }
    throw new Error('مفيش مفتاح API — حطّه في إعدادات الأسطى.');
  },

  headers() {
    const s = S.settings.ai;
    const h = { 'Content-Type': 'application/json' };
    if (s.provider === 'gemini') {
      h['x-goog-api-key'] = AI._key;
    } else {
      h['Authorization'] = 'Bearer ' + AI._key;
      if (s.provider === 'openrouter') {
        if (s.attribution) {
          h['HTTP-Referer'] = location.href;
          h['X-Title'] = 'Kollo';
        } else {
          h['X-OpenRouter-App-Visibility'] = 'hidden';
        }
      }
    }
    return h;
  },

  base() {
    const s = S.settings.ai;
    if (s.provider === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta';
    if (s.provider === 'openrouter') return 'https://openrouter.ai/api/v1';
    return String(s.baseUrl || '').replace(/\/+$/, '');
  },

  /* ---- كتالوج الموديلات ---- */
  async listModels() {
    const s = S.settings.ai;
    AI._key = await AI.key();

    if (s.provider === 'gemini') {
      const out = [];
      let token = '';
      do {
        const u = AI.base() + '/models?pageSize=200' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
        const r = await fetch(u, { headers: AI.headers() });
        if (!r.ok) throw new Error(await AI.errText(r));
        const j = await r.json();
        (j.models || []).forEach(m =>
          out.push({
            id: String(m.name || '').replace(/^models\//, ''),
            name: m.displayName || m.name,
            desc: m.description || '',
            inTok: m.inputTokenLimit,
            outTok: m.outputTokenLimit,
            methods: m.supportedGenerationMethods || [],
            tools: true,
            thinking: !!m.thinking
          })
        );
        token = j.nextPageToken || '';
      } while (token);
      return out.filter(m => m.methods.indexOf('generateContent') > -1 || !m.methods.length);
    }

    const url = s.provider === 'openrouter' ? AI.base() + '/models?supported_parameters=tools' : AI.base() + '/models';
    const r = await fetch(url, { headers: AI.headers() });
    if (!r.ok) throw new Error(await AI.errText(r));
    const j = await r.json();
    return (j.data || j.models || []).map(m => ({
      id: m.id,
      name: m.name || m.id,
      desc: (m.description || '').slice(0, 200),
      inTok: m.context_length || (m.top_provider && m.top_provider.context_length),
      tools: !m.supported_parameters || m.supported_parameters.indexOf('tools') > -1,
      reasoning: !!(m.supported_parameters && m.supported_parameters.indexOf('reasoning') > -1)
    }));
  },

  async errText(r) {
    let t = '';
    try {
      t = await r.text();
    } catch (e) {}
    let msg = t;
    try {
      const j = JSON.parse(t);
      msg = (j.error && (j.error.message || j.error.code)) || t;
    } catch (e) {}

    if (r.status === 401 || r.status === 403) return 'المفتاح مرفوض (401/403) — راجع مفتاح الـAPI.';
    if (r.status === 404) return 'الموديل أو الـEndpoint مش موجود (404) — جرّب موديل تاني.';
    if (r.status === 429) return 'وصلت حد الطلبات (429) — استنى شوية وجرّب.';
    if (r.status === 400 && /thought signature|thought_signature/i.test(String(msg))) return 'THOUGHT_SIG:' + msg;
    return 'خطأ ' + r.status + ': ' + String(msg).slice(0, 300);
  }
});
