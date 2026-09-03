/* ============================================================================
   كله — Kollo | AI Subsystem: Agent Loop & Execution Engine
   Multi-step reasoning, tool confirmation, error backoff, and state persistence
   ============================================================================ */
var DESTRUCTIVE = /^(delete_|bulk_|import_|wipe|empty_trash|export_backup)/;
window.DESTRUCTIVE = DESTRUCTIVE;

async function agentRun(userText, ui) {
  const s = S.settings.ai;
  const msgs = [{ role: 'system', content: systemPrompt() }];
  const hist = (S.cache.chat || []).slice(-24);
  hist.forEach(m => msgs.push(m));
  msgs.push({ role: 'user', content: userText });
  (S.cache.chat = S.cache.chat || []).push({ role: 'user', content: userText });

  const tools = toolSchemas();
  const batch = Hist.begin('الأسطى: ' + String(userText).slice(0, 40));
  let steps = 0,
    usage = { in: 0, out: 0 },
    affected = 0;

  try {
    for (;;) {
      if (steps >= (s.maxSteps || 12)) {
        ui.note('وصلنا حد الخطوات (' + fmtN(s.maxSteps || 12, 0) + '). أوقف هنا وأقولك اللي عملته.');
        break;
      }
      steps++;
      ui.status('بيفكّر…');

      let res = null,
        lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const stream = ui.stream();
          res = await AI.call(msgs, tools, stream);
          break;
        } catch (e) {
          lastErr = e;
          const m = String(e.message || '');
          if (m.startsWith('THOUGHT_SIG:')) {
            /* تخطّي بصمة التفكير: جرّب تنضيف البصمات، وبعدين خطوة واحدة بدون تولز */
            ui.note('المزوّد رفض بصمة التفكير — بجرّب مسار بديل.');
            msgs.forEach(mm =>
              (mm.toolCalls || []).forEach(tc => {
                if (tc.providerMeta) delete tc.providerMeta.thoughtSignature;
              })
            );
            if (attempt === 1) {
              try {
                res = await AI.call(msgs, null, ui.stream());
                break;
              } catch (e2) {
                lastErr = e2;
              }
            }
            continue;
          }
          if (/^خطأ 4/.test(m) && !/429/.test(m)) break; /* 4xx غير 429: مفيش فايدة من الإعادة */
          if (/429|خطأ 5|اتقطع/.test(m)) {
            await sleep(250 * Math.pow(2, attempt));
            continue;
          }
          break;
        }
      }

      if (!res) throw lastErr || new Error('مفيش رد من المزوّد');
      if (res.usage) {
        usage.in += res.usage.in || 0;
        usage.out += res.usage.out || 0;
        ui.usage(usage);
      }

      const calls = res.toolCalls || [];
      if (res.text) ui.assistantDone(res.text);
      msgs.push({ role: 'assistant', content: res.text || null, toolCalls: calls.length ? calls : undefined });

      if (!calls.length) {
        S.cache.chat.push({ role: 'assistant', content: res.text || '' });
        if (res.finish && ['MAX_TOKENS', 'length'].indexOf(res.finish) > -1) {
          ui.note('الرد اتقطع لأن حد التوكنز خلص — زوّد max tokens من الإعدادات.');
        }
        if (res.finish && ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'RECITATION'].indexOf(res.finish) > -1) {
          ui.note('المزوّد وقف الرد لأسباب أمان المحتوى (' + res.finish + '). نجرّب صيغة تانية للسؤال؟');
        }
        if (res.finish === 'MALFORMED_FUNCTION_CALL') {
          ui.note('الموديل طلع نداء تول مش سليم (' + res.finish + ') — جرّب موديل تاني أو صياغة أوضح.');
        }
        break;
      }

      /* موافقة على الأفعال الحسّاسة */
      const risky = calls.filter(c => {
        const t = TOOLS[c.name];
        return !t || t.risk === 'destructive' || DESTRUCTIVE.test(c.name);
      });

      if (risky.length && !s.trust) {
        const list = risky.map(c => '• ' + c.name + ' — ' + JSON.stringify(c.args).slice(0, 120)).join('\n');
        const okGo = await UI.confirm('الأسطى محتاج موافقتك', ['هيعمل الحاجات دي:', list, '', 'تمام؟'].join('\n'), true);
        if (!okGo) {
          // Logical Bug Fix: respond to ALL pending tool calls to prevent 400 Bad Request
          for (const c of calls) {
            msgs.push({
              role: 'tool',
              toolCallId: c.id,
              name: c.name,
              result: { ok: false, error: 'المستخدم رفض التنفيذ' }
            });
          }
          ui.note('اتوقّف — إنت رفضت الخطوة.');
          continue;
        }
      }

      /* تنفيذ بالتوازي */
      const results = await Promise.all(
        calls.map(async c => {
          const t = TOOLS[c.name];
          const t0 = performance.now();
          if (!t) return { c, r: ERR('التول "' + c.name + '" مش موجود. المتاح: ' + Object.keys(TOOLS).slice(0, 25).join(', ') + '…'), ms: 0 };
          try {
            const r = await t.handler(c.args || {});
            return { c, r, ms: Math.round(performance.now() - t0) };
          } catch (e) {
            return { c, r: ERR('التول وقع: ' + (e.message || e)), ms: Math.round(performance.now() - t0) };
          }
        })
      );

      for (const { c, r, ms } of results) {
        affected += (r && r.affected) || 0;
        ui.tool(c.name, c.args, r, ms);
        try {
          await dbPut('aiToolCalls', {
            id: uid(),
            chatId: AI.chatId,
            batchId: batch.id,
            name: c.name,
            args: c.args,
            ok: !!(r && r.ok),
            ms,
            at: now(),
            createdAt: now(),
            deletedAt: null
          });
        } catch (e) {}
        msgs.push({ role: 'tool', toolCallId: c.id, name: c.name, result: r });
      }

      if (S.cache.pendingChart) {
        ui.chart(S.cache.pendingChart);
        S.cache.pendingChart = null;
      }
    }
  } catch (e) {
    ui.error(e.message || String(e));
  } finally {
    const b = Hist.commit();
    if (b && affected) ui.batchDone(b, affected);
    ui.status(null);
    Bus.emit('data');
  }
}

Object.assign(window, {
  DESTRUCTIVE, agentRun
});
