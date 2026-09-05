/* ============================================================================
   كله — Kollo | Tests: Harness & Mock Utilities
   ============================================================================ */
window.TestUtils = {
  mockUI() {
    const rec = { text: '', tools: [], notes: [], errors: [], charts: 0 };
    return {
      rec,
      status() {},
      usage() {},
      chart() { rec.charts++; },
      batchDone() {},
      stream() { return d => { rec.text += d; }; },
      assistantDone(t) { rec.text += t; },
      tool(n, a, r) { rec.tools.push({ n, ok: !!(r && r.ok) }); },
      note(t) { rec.notes.push(String(t)); },
      error(t) { rec.errors.push(String(t)); }
    };
  },

  async withStub(script, fn) {
    const real = AI.call;
    let n = 0;
    const seen = [];
    AI.call = async (msgs, tools, onDelta) => {
      const step = script[Math.min(n, script.length - 1)];
      n++;
      seen.push({ msgs: msgs.slice(), tools });
      if (typeof step === 'function') return step(msgs, tools, onDelta);
      if (step.throw) throw new Error(step.throw);
      if (step.text && onDelta) onDelta(step.text);
      return { text: step.text || '', reasoning: '', toolCalls: step.toolCalls || [], finish: step.finish || null, usage: step.usage || null };
    };
    try {
      return await fn(seen, () => n);
    } finally {
      AI.call = real;
    }
  },

  async snap() {
    const o = {};
    const schema = window.SCHEMA || SCHEMA;
    for (const s of Object.keys(schema)) o[s] = await dbCount(s);
    return o;
  },

  same(a, b) {
    return Object.keys(a).every(k => a[k] === b[k]);
  },

  diff(a, b) {
    return Object.keys(a).filter(k => a[k] !== b[k]).map(k => k + ': ' + a[k] + '→' + b[k]).join(' · ');
  },

  async cleanAiCalls(before) {
    const rows = await dbAll('aiToolCalls');
    for (const r of rows) if (before.indexOf(r.id) < 0) await dbDel('aiToolCalls', r.id);
  }
};
