/* ============================================================================
   كله — Kollo | Tests: AI Agent Suite (Agent Loop, Stub Calls, Tool Execution)
   ============================================================================ */

window.runAIAgentTests = async function (ctx) {
  const { T2, withStub, mockUI, cleanAiCalls } = ctx;

  /* ================= 9) حلقة الإيجنت بمزوّد وهمي ================= */
  await T2('إيجنت: نداءات متسلسلة (خطوتين ثم رد)', async () => {
    const before = (await dbAll('aiToolCalls')).map(r => r.id);
    S.cache.chat = [];
    const ms = S.settings.ai.maxSteps;
    S.settings.ai.maxSteps = 8;
    const ui = mockUI();
    try {
      const seen = await withStub([
        { toolCalls: [{ id: 'c1', name: 'get_context_summary', args: {}, providerMeta: { thoughtSignature: 'S1' } }] },
        { toolCalls: [{ id: 'c2', name: 'get_today_brief', args: {} }] },
        { text: 'خلصنا كده' }
      ], async s => {
        await agentRun('اختبار متسلسل', ui);
        return s;
      });
      const last = seen[seen.length - 1].msgs;
      const asst = last.filter(m => m.role === 'assistant' && m.toolCalls);
      const tls = last.filter(m => m.role === 'tool');
      return {
        ok: seen.length === 3 && ui.rec.tools.length === 2 && ui.rec.tools.every(t => t.ok) && /خلصنا/.test(ui.rec.text) && asst.length === 2 && tls.length === 2,
        note: fmtN(seen.length, 0) + ' نداء · ' + fmtN(ui.rec.tools.length, 0) + ' تول · الرسايل بترتيبها'
      };
    } finally {
      S.settings.ai.maxSteps = ms;
      await cleanAiCalls(before);
    }
  });

  await T2('إيجنت: نداءات متوازية في خطوة واحدة', async () => {
    const before = (await dbAll('aiToolCalls')).map(r => r.id);
    S.cache.chat = [];
    const ui = mockUI();
    try {
      const seen = await withStub([
        {
          toolCalls: [
            { id: 'p1', name: 'get_today_brief', args: {}, providerMeta: { thoughtSignature: 'SIG-P' } },
            { id: 'p2', name: 'storage_usage', args: {} }
          ]
        },
        { text: 'الاتنين خلصوا' }
      ], async s => {
        await agentRun('اختبار متوازي', ui);
        return s;
      });
      const p = S.settings.ai.provider;
      S.settings.ai.provider = 'gemini';
      const c = AI.toGemini(seen[1].msgs, null).contents;
      S.settings.ai.provider = p;
      const model = c.find(x => x.role === 'model' && x.parts.some(y => y.functionCall));
      const frs = c.filter(x => x.parts.some(y => y.functionResponse));
      return {
        ok: ui.rec.tools.length === 2 && model.parts.length === 2 && model.parts[0].thoughtSignature === 'SIG-P' &&
          model.parts[1].thoughtSignature === undefined && frs.length === 2,
        note: 'اتنفّذوا مع بعض والبصمة رجعت في مكانها'
      };
    } finally {
      await cleanAiCalls(before);
    }
  });

  await T2('إيجنت: تول بيرمي خطأ → الحلقة تكمّل وتبلّغ', async () => {
    const before = (await dbAll('aiToolCalls')).map(r => r.id);
    S.cache.chat = [];
    const ui = mockUI();
    try {
      await withStub([{ toolCalls: [{ id: 'e1', name: 'tool_msh_mawgood', args: {} }] }, { text: 'كمّلنا بعد الخطأ' }], async () => {
        await agentRun('اختبار خطأ', ui);
      });
      return {
        ok: ui.rec.tools.length === 1 && ui.rec.tools[0].ok === false && /كمّلنا/.test(ui.rec.text) && !ui.rec.errors.length,
        note: 'التول الغلط رجع ok:false والموديل عرف يكمّل'
      };
    } finally {
      await cleanAiCalls(before);
    }
  });

  await T2('إيجنت: الإلغاء/الانقطاع بيعرض خطأ نظيف', async () => {
    S.cache.chat = [];
    const ui = mockUI();
    await withStub([{ throw: 'الطلب اتقطع (تايم-آوت أو إلغاء).' }], async () => {
      await agentRun('اختبار إلغاء', ui);
    });
    return { ok: ui.rec.errors.length === 1 && /اتقطع/.test(ui.rec.errors[0]), note: 'رسالة واحدة واضحة، والتطبيق واقف على رجليه' };
  });

  await T2('إيجنت: حد الخطوات بيوقف الحلقة', async () => {
    const before = (await dbAll('aiToolCalls')).map(r => r.id);
    S.cache.chat = [];
    const ms = S.settings.ai.maxSteps;
    S.settings.ai.maxSteps = 3;
    const ui = mockUI();
    try {
      const seen = await withStub([{ toolCalls: [{ id: 'l1', name: 'storage_usage', args: {} }] }], async s => {
        await agentRun('لفة لا نهائية', ui);
        return s;
      });
      return { ok: seen.length === 3 && ui.rec.notes.some(n => /حد الخطوات/.test(n)), note: 'وقف عند ٣ خطوات وقال السبب' };
    } finally {
      S.settings.ai.maxSteps = ms;
      await cleanAiCalls(before);
    }
  });

  await T2('إيجنت: 400 بسبب البصمة → تنضيف ومسار بديل', async () => {
    S.cache.chat = [{ role: 'assistant', content: 'قديم', toolCalls: [{ id: 'old', name: 'list_tasks', args: {}, providerMeta: { thoughtSignature: 'OLD-SIG' } }] }];
    const ui = mockUI();
    await withStub([
      { throw: 'THOUGHT_SIG:Thought signature is not valid' },
      { throw: 'THOUGHT_SIG:Thought signature is not valid' },
      { text: 'كمّلنا بمسار بديل' }
    ], async () => {
      await agentRun('اختبار بصمة', ui);
    });
    const cleaned = !(S.cache.chat[0].toolCalls[0].providerMeta || {}).thoughtSignature;
    return {
      ok: cleaned && ui.rec.notes.some(n => /بصمة/.test(n)) && /بديل/.test(ui.rec.text),
      note: 'نضّف البصمات، جرّب بدون تولز، وبلّغ المستخدم'
    };
  });

  await T2('إيجنت: finishReason=MAX_TOKENS بيتشرح للمستخدم', async () => {
    S.cache.chat = [];
    const ui = mockUI();
    await withStub([{ text: 'رد ناقص', finish: 'MAX_TOKENS' }], async () => {
      await agentRun('اختبار توكنز', ui);
    });
    return { ok: ui.rec.notes.some(n => /توكنز/.test(n)), note: ui.rec.notes[0] || '' };
  });

  await T2('إيجنت: كل نداء تول بيتسجّل في aiToolCalls', async () => {
    const before = (await dbAll('aiToolCalls')).map(r => r.id);
    S.cache.chat = [];
    const ui = mockUI();
    try {
      await withStub([{ toolCalls: [{ id: 'r1', name: 'storage_usage', args: {} }] }, { text: 'تم' }], async () => {
        await agentRun('سجل', ui);
      });
      const rows = (await dbAll('aiToolCalls')).filter(r => before.indexOf(r.id) < 0);
      return {
        ok: rows.length === 1 && rows[0].name === 'storage_usage' && rows[0].ok === true && typeof rows[0].ms === 'number',
        note: 'الترانسكريبت محفوظ بالمدة والنتيجة'
      };
    } finally {
      await cleanAiCalls(before);
    }
  });
};
