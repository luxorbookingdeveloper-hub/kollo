/* ============================================================================
   كله — Kollo | AI Call: Request Execution & Streaming SSE
   ============================================================================ */

window.AI = window.AI || {};

Object.assign(window.AI, {
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
      const ep = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
      url = AI.base() + '/models/' + encodeURIComponent(s.model) + ':' + ep + (ep.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(AI._key);
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
  }
});
