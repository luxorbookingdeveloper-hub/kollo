/* ============================================================================
   كله — Kollo | Tests: AI Streaming Suite (SSE, Network Errors, HTTP Statuses)
   ============================================================================ */

window.runAIStreamTests = async function (ctx) {
  const { T2 } = ctx;

  /* ================= 8) الستريمنج و SSE ================= */
  await T2('SSE: تجاهل السطور اللي تبدأ بـ ":" و[DONE]', async () => {
    const saved = S.settings.ai;
    const of = window.fetch;
    S.settings.ai = Object.assign({}, saved, { provider: 'openrouter', model: 'mock/model', keyPlain: 'test-key', keyEnc: null, stream: true, timeout: 20000 });
    const chunks = [
      ': OPENROUTER PROCESSING\n\n',
      'data: {"choices":[{"delta":{"content":"تم"}}]}\n\n',
      ': keep-alive\n\n',
      'data: {"choices":[{"delta":{"content":"ام"}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"list_tasks","arguments":"{\\"lim"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"it\\":5}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":3,"total_tokens":13}}\n\n',
      'data: [DONE]\n\n'
    ];
    window.fetch = async () =>
      new Response(
        new ReadableStream({
          start(c) {
            const e = new TextEncoder();
            chunks.forEach(x => c.enqueue(e.encode(x)));
            c.close();
          }
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    let out = '';
    try {
      const r = await AI.call([{ role: 'user', content: 'x' }], null, d => { out += d; });
      const tc = r.toolCalls[0] || {};
      return {
        ok: out === 'تمام' && r.text === 'تمام' && tc.name === 'list_tasks' && tc.args && tc.args.limit === 5 && r.finish === 'tool_calls' && r.usage && r.usage.total === 13,
        note: 'النص: "' + out + '" · args اتلمّت من شنكين: ' + JSON.stringify(tc.args || {})
      };
    } finally {
      window.fetch = of;
      S.settings.ai = saved;
    }
  });

  await T2('فشل الشبكة بيرجع رسالة مفهومة (CORS/نت)', async () => {
    const saved = S.settings.ai;
    const of = window.fetch;
    S.settings.ai = Object.assign({}, saved, { provider: 'custom', baseUrl: 'https://example.invalid/v1', model: 'm', keyPlain: 'k', keyEnc: null, stream: false });
    window.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    try {
      await AI.call([{ role: 'user', content: 'x' }], null, null);
      return { ok: false, note: 'المفروض يرمي خطأ' };
    } catch (e) {
      return { ok: /CORS|مفيش وصول|Base URL/.test(e.message), note: e.message.slice(0, 80) };
    } finally {
      window.fetch = of;
      S.settings.ai = saved;
    }
  });

  await T2('أخطاء الحالة بتترجم مصري (401/404/429/بصمة)', async () => {
    const f = async (status, body) => AI.errText(new Response(body || '{}', { status }));
    const a = await f(401), b = await f(404), c = await f(429),
      d = await f(400, JSON.stringify({ error: { message: 'Thought signature is not valid' } }));
    return {
      ok: /401/.test(a) && /404/.test(b) && /429/.test(c) && d.startsWith('THOUGHT_SIG:'),
      note: 'كل حالة ليها رسالة وإجراء'
    };
  });
};
