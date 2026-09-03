/* ============================================================================
   كله — Kollo | AI Core: Multi-Provider Engine & Model Adapters
   Gemini native, OpenRouter, and OpenAI-compatible endpoints with streaming SSE & thought signatures
   ============================================================================ */
const AI = {
  busy: false,
  abort: null,
  chatId: null,

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
  },

  /* ---- توحيد الرسايل: شكل داخلي واحد ---- */
  toGemini(msgs, tools) {
    const contents = [];
    let sys = null;

    msgs.forEach(m => {
      if (m.role === 'system') {
        sys = { role: 'user', parts: [{ text: m.content || '' }] };
        return;
      }
      if (m.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: m.name, response: m.result || { ok: false } } }]
        });
        return;
      }
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      (m.toolCalls || []).forEach(tc => {
        const p = { functionCall: { name: tc.name, args: tc.args || {} } };
        if (tc.providerMeta && tc.providerMeta.thoughtSignature) {
          p.thoughtSignature = tc.providerMeta.thoughtSignature;
        }
        parts.push(p);
      });
      if (!parts.length) return;
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
    });

    const s = S.settings.ai;
    const body = {
      contents,
      generationConfig: {
        temperature: s.temperature,
        topP: s.topP,
        topK: s.topK,
        maxOutputTokens: s.maxTokens
      }
    };
    if (sys) body.systemInstruction = sys;
    if (tools && tools.length) body.tools = [{ functionDeclarations: tools }];
    return body;
  },

  toOpenAI(msgs, tools) {
    const out = msgs.map(m => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId, content: JSON.stringify(m.result || {}) };
      }
      const o = { role: m.role, content: m.content || null };
      if (m.toolCalls && m.toolCalls.length) {
        o.tool_calls = m.toolCalls.map(tc => {
          const t = {
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args || {}) }
          };
          if (tc.providerMeta && tc.providerMeta.thoughtSignature) {
            t.extra_content = { google: { thought_signature: tc.providerMeta.thoughtSignature } };
          }
          return t;
        });
      }
      return o;
    });

    const s = S.settings.ai;
    const body = {
      model: s.model,
      messages: out,
      temperature: s.temperature,
      top_p: s.topP,
      max_tokens: s.maxTokens
    };
    if (tools && tools.length) {
      body.tools = tools.map(t => ({ type: 'function', function: t }));
      body.tool_choice = 'auto';
      body.parallel_tool_calls = true;
    }
    if (s.provider === 'openrouter' && s.reasoning && s.reasoning !== 'none') {
      body.reasoning = { effort: s.reasoning };
      if (s.includeReasoning) body.include_reasoning = true;
    }
    return body;
  },

  /* ---- نداء واحد (مع ستريمنج قابل للإطفاء) ---- */
  async call(msgs, tools, onDelta) {
    const s = S.settings.ai;
    AI._key = await AI.key();
    if (!s.model) throw new Error('اختار موديل الأول من "هات الموديلات".');

    AI.abort = new AbortController();
    const to = setTimeout(() => AI.abort.abort(), s.timeout || 60000);
    const stream = !!s.stream && !!onDelta;

    let url, body;
    if (s.provider === 'gemini') {
      url = AI.base() + '/models/' + encodeURIComponent(s.model) + ':' + (stream ? 'streamGenerateContent?alt=sse' : 'generateContent');
      body = AI.toGemini(msgs, tools);
    } else {
      url = AI.base() + '/chat/completions';
      body = AI.toOpenAI(msgs, tools);
      if (stream) body.stream = true;
    }

    let r;
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: AI.headers(),
        body: JSON.stringify(body),
        signal: AI.abort.signal
      });
    } catch (e) {
      clearTimeout(to);
      if (e.name === 'AbortError') throw new Error('الطلب اتقطع (تايم-آوت أو إلغاء).');
      throw new Error(
        'مفيش وصول للمزوّد — يا مفيش نت، يا الـBase URL غلط، يا المتصفح رافض الطلب (CORS). جرّب مزوّد تاني أو راجع الـBase URL.'
      );
    }
    clearTimeout(to);

    if (!r.ok) throw new Error(await AI.errText(r));
    if (!stream) {
      const j = await r.json();
      return AI.parse(j);
    }

    /* SSE */
    const rd = r.body.getReader(),
      dec = new TextDecoder();
    let buf = '',
      acc = { text: '', toolCalls: [], finish: null, usage: null, reasoning: '' };

    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const ln of lines) {
        const L = ln.trim();
        if (!L) continue;
        if (L.startsWith(':')) continue;
        if (!L.startsWith('data:')) continue;
        const d = L.slice(5).trim();
        if (d === '[DONE]') continue;

        let j;
        try {
          j = JSON.parse(d);
        } catch (e) {
          continue;
        }
        const piece = AI.parse(j, true);
        if (piece.text) {
          acc.text += piece.text;
          onDelta && onDelta(piece.text);
        }
        if (piece.reasoning) acc.reasoning += piece.reasoning;
        if (piece.finish) acc.finish = piece.finish;
        if (piece.usage) acc.usage = piece.usage;

        (piece.toolCalls || []).forEach(tc => {
          const ix = tc.index == null ? acc.toolCalls.length : tc.index;
          const cur = acc.toolCalls[ix] || (acc.toolCalls[ix] = { id: tc.id || 'call_' + ix, name: '', argsRaw: '', providerMeta: {} });
          if (tc.id) cur.id = tc.id;
          if (tc.name) cur.name = tc.name;
          if (tc.argsRaw) cur.argsRaw += tc.argsRaw;
          if (tc.args) cur.args = tc.args;
          if (tc.providerMeta && tc.providerMeta.thoughtSignature) {
            cur.providerMeta.thoughtSignature = tc.providerMeta.thoughtSignature;
          }
        });
      }
    }

    acc.toolCalls = acc.toolCalls.filter(Boolean).map(tc => {
      let args = tc.args;
      if (!args) {
        try {
          args = JSON.parse(tc.argsRaw || '{}');
        } catch (e) {
          args = {};
        }
      }
      return { id: tc.id, name: tc.name, args: args || {}, providerMeta: tc.providerMeta || {} };
    });

    return acc;
  },

  parse(j, partial) {
    const s = S.settings.ai;
    if (s.provider === 'gemini') {
      const c = (j.candidates || [])[0] || {};
      const parts = (c.content && c.content.parts) || [];
      let text = '',
        reasoning = '';
      const calls = [];

      parts.forEach(p => {
        if (p.functionCall) {
          calls.push({
            id: 'gem_' + calls.length + '_' + (p.functionCall.name || ''),
            name: p.functionCall.name,
            args: p.functionCall.args || {},
            providerMeta: p.thoughtSignature ? { thoughtSignature: p.thoughtSignature } : {}
          });
        } else if (p.text) {
          if (p.thought) reasoning += p.text;
          else text += p.text;
        }
      });

      return {
        text,
        reasoning,
        toolCalls: calls,
        finish: c.finishReason || null,
        usage: j.usageMetadata
          ? {
              in: j.usageMetadata.promptTokenCount,
              out: j.usageMetadata.candidatesTokenCount,
              total: j.usageMetadata.totalTokenCount
            }
          : null
      };
    }

    const ch = (j.choices || [])[0] || {};
    const m = partial ? ch.delta || {} : ch.message || {};
    const calls = (m.tool_calls || []).map((t, ix) => ({
      index: t.index == null ? ix : t.index,
      id: t.id,
      name: t.function && t.function.name,
      argsRaw: t.function && t.function.arguments,
      providerMeta:
        t.extra_content && t.extra_content.google && t.extra_content.google.thought_signature
          ? { thoughtSignature: t.extra_content.google.thought_signature }
          : {}
    }));

    const out = {
      text: m.content || '',
      reasoning: m.reasoning || (m.reasoning_details ? JSON.stringify(m.reasoning_details) : ''),
      toolCalls: calls,
      finish: ch.finish_reason || null,
      usage: j.usage
        ? {
            in: j.usage.prompt_tokens,
            out: j.usage.completion_tokens,
            total: j.usage.total_tokens
          }
        : null
    };

    if (!partial) {
      out.toolCalls = calls.map(c => {
        let a = {};
        try {
          a = JSON.parse(c.argsRaw || '{}');
        } catch (e) {}
        return { id: c.id, name: c.name, args: a, providerMeta: c.providerMeta };
      });
    }

    return out;
  }
};

window.AI = AI;
