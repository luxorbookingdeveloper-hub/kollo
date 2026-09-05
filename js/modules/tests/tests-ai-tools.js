/* ============================================================================
   كله — Kollo | Tests: AI Tools & Thought Signatures Suite
   ============================================================================ */

window.runAIToolsTests = async function (ctx) {
  const { T2 } = ctx;

  /* ================= 6) تحويل التولز للصيغتين ================= */
  await T2('عدد التولز ≥ ٧٠ وكلها موصوفة', async () => {
    const names = Object.keys(TOOLS);
    const bad = names.filter(n => {
      const t = TOOLS[n];
      return !t.description || t.description.length < 12 || !t.parameters || t.parameters.type !== 'object' ||
        ['read', 'write', 'destructive'].indexOf(t.risk) < 0 || typeof t.handler !== 'function';
    });
    const badName = names.filter(n => !/^[a-z][a-z0-9_]*$/.test(n));
    return {
      ok: names.length >= 70 && !bad.length && !badName.length,
      note: fmtN(names.length, 0) + ' تول' + (bad.length ? ' · ناقص: ' + bad.slice(0, 4).join(', ') : '') + (badName.length ? ' · أسماء غلط: ' + badName.join(', ') : '')
    };
  });

  await T2('تحويل السجل لصيغة Gemini (functionDeclarations)', async () => {
    const p = S.settings.ai.provider;
    S.settings.ai.provider = 'gemini';
    try {
      const body = AI.toGemini([{ role: 'system', content: 'س' }, { role: 'user', content: 'اختبار' }], toolSchemas());
      const fd = body.tools[0].functionDeclarations;
      const bad = fd.filter(f => !f.name || !f.description || !f.parameters);
      return {
        ok: !!body.systemInstruction && body.contents.length === 1 && fd.length === Object.keys(TOOLS).length && !bad.length && !!body.generationConfig,
        note: fmtN(fd.length, 0) + ' declaration + systemInstruction + generationConfig'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });

  await T2('تحويل السجل لصيغة OpenAI (tools[])', async () => {
    const p = S.settings.ai.provider;
    S.settings.ai.provider = 'openrouter';
    try {
      const body = AI.toOpenAI([{ role: 'user', content: 'اختبار' }], toolSchemas());
      const bad = body.tools.filter(t => t.type !== 'function' || !t.function.name || !t.function.parameters);
      return {
        ok: body.tools.length === Object.keys(TOOLS).length && !bad.length && body.tool_choice === 'auto' && body.parallel_tool_calls === true,
        note: 'tool_choice=auto · parallel_tool_calls=true'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });

  await T2('snapshot: نفس التول في الصيغتين بنفس السكيمة', async () => {
    const p = S.settings.ai.provider;
    try {
      S.settings.ai.provider = 'gemini';
      const g = AI.toGemini([{ role: 'user', content: 'x' }], toolSchemas()).tools[0].functionDeclarations.find(f => f.name === 'create_task');
      S.settings.ai.provider = 'openrouter';
      const o = AI.toOpenAI([{ role: 'user', content: 'x' }], toolSchemas()).tools.find(t => t.function.name === 'create_task').function;
      return {
        ok: g.name === o.name && g.description === o.description && JSON.stringify(g.parameters) === JSON.stringify(o.parameters),
        note: 'create_task متطابق في الصيغتين'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });

  /* ================= 7) بصمات التفكير وترتيب FC/FR ================= */
  await T2('قراءة رد Gemini: البصمة على أول functionCall بس', async () => {
    const p = S.settings.ai.provider;
    S.settings.ai.provider = 'gemini';
    try {
      const r = AI.parse({
        candidates: [{
          content: {
            parts: [
              { functionCall: { name: 'list_tasks', args: { limit: 5 } }, thoughtSignature: 'SIG-A' },
              { functionCall: { name: 'get_today_brief', args: {} } }
            ]
          },
          finishReason: 'STOP'
        }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, totalTokenCount: 7 }
      });
      return {
        ok: r.toolCalls.length === 2 && r.toolCalls[0].providerMeta.thoughtSignature === 'SIG-A' &&
          !r.toolCalls[1].providerMeta.thoughtSignature && r.usage.total === 7,
        note: '٢ نداء متوازي · بصمة واحدة على الأول'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });

  await T2('إرجاع البصمة في نفس الجزء + ترتيب FC1,FC2,FR1,FR2', async () => {
    const p = S.settings.ai.provider;
    S.settings.ai.provider = 'gemini';
    try {
      const msgs = [
        { role: 'user', content: 'س' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [
            { id: 'a', name: 'list_tasks', args: { limit: 5 }, providerMeta: { thoughtSignature: 'SIG-A' } },
            { id: 'b', name: 'get_today_brief', args: {} }
          ]
        },
        { role: 'tool', toolCallId: 'a', name: 'list_tasks', result: { ok: true, data: { rows: [] } } },
        { role: 'tool', toolCallId: 'b', name: 'get_today_brief', result: { ok: true, data: {} } }
      ];
      const c = AI.toGemini(msgs, null).contents;
      const model = c[1], fr1 = c[2], fr2 = c[3];
      const noInterleave = !model.parts.some(x => x.functionResponse) && !fr1.parts.some(x => x.functionCall);
      return {
        ok: c.length === 4 && model.role === 'model' && model.parts.length === 2 &&
          model.parts[0].thoughtSignature === 'SIG-A' && model.parts[1].thoughtSignature === undefined &&
          model.parts[0].functionCall.name === 'list_tasks' && model.parts[1].functionCall.name === 'get_today_brief' &&
          fr1.parts[0].functionResponse.name === 'list_tasks' && fr2.parts[0].functionResponse.name === 'get_today_brief' && noInterleave,
        note: 'الترتيب سليم ومش interleaved'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });

  await T2('شكل OpenAI: البصمة في extra_content.google', async () => {
    const p = S.settings.ai.provider;
    S.settings.ai.provider = 'openrouter';
    try {
      const body = AI.toOpenAI([
        { role: 'assistant', content: null, toolCalls: [{ id: 'c1', name: 'list_tasks', args: { limit: 2 }, providerMeta: { thoughtSignature: 'SIG-B' } }] },
        { role: 'tool', toolCallId: 'c1', name: 'list_tasks', result: { ok: true } }
      ], null);
      const tc = body.messages[0].tool_calls[0];
      const tr = body.messages[1];
      const readBack = AI.parse({
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'c1',
              type: 'function',
              function: { name: 'list_tasks', arguments: '{"limit":2}' },
              extra_content: { google: { thought_signature: 'SIG-B' } }
            }]
          },
          finish_reason: 'tool_calls'
        }]
      });
      return {
        ok: tc.extra_content.google.thought_signature === 'SIG-B' && tc.function.arguments === '{"limit":2}' &&
          tr.role === 'tool' && tr.tool_call_id === 'c1' && typeof tr.content === 'string' &&
          readBack.toolCalls[0].providerMeta.thoughtSignature === 'SIG-B' && readBack.toolCalls[0].args.limit === 2,
        note: 'رايح وجاي في نفس المكان'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });

  await T2('غياب البصمة: التطبيق ما بيقعش وبيكمّل', async () => {
    const p = S.settings.ai.provider;
    S.settings.ai.provider = 'openrouter';
    try {
      const r = AI.parse({
        choices: [{
          message: {
            content: null,
            tool_calls: [{ id: 'c9', type: 'function', function: { name: 'get_today_brief', arguments: '{}' } }]
          },
          finish_reason: 'tool_calls'
        }]
      });
      const body = AI.toOpenAI([{ role: 'assistant', content: null, toolCalls: r.toolCalls }], null);
      return {
        ok: r.toolCalls.length === 1 && !r.toolCalls[0].providerMeta.thoughtSignature && !body.messages[0].tool_calls[0].extra_content,
        note: 'مفيش بصمة → مفيش extra_content فاضي'
      };
    } finally {
      S.settings.ai.provider = p;
    }
  });
};
