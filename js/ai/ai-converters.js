/* ============================================================================
   كله — Kollo | AI Converters: Payload Adapters & Parser
   Gemini format & OpenAI-compatible format bidirectional mapping
   ============================================================================ */

window.AI = window.AI || {};

Object.assign(window.AI, {
  /* ---- توحيد الرسايل: شكل داخلي واحد ---- */
  toGemini(msgs, tools) {
    const contents = [];
    let sys = null;

    msgs.forEach(m => {
      if (m.role === 'system') {
        sys = { parts: [{ text: m.content || '' }] };
        return;
      }
      if (m.role === 'tool') {
        const resp = (typeof m.result === 'object' && m.result !== null) ? m.result : { output: m.result };
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: m.name, response: resp } }]
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
});
