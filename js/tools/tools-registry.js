/* ============================================================================
   كله — Kollo | AI Tools: Tool Registry & Schema Definitions
   Helper constructors (OK, ERR, cap, num, P) and global tool repository
   ============================================================================ */
const TOOLS = {};

function registerTool(t) {
  TOOLS[t.name] = t;
  return t;
}

function toolSchemas() {
  return Object.keys(TOOLS).map(n => ({
    name: n,
    description: TOOLS[n].description,
    parameters: TOOLS[n].parameters || { type: 'object', properties: {} }
  }));
}

const OK = (data, extra) => Object.assign({ ok: true, data: data == null ? null : data }, extra || {});
const ERR = m => ({ ok: false, error: String(m) });

function cap(rows, total) {
  const t = total == null ? rows.length : total;
  return rows.length >= 100 ? { rows: rows.slice(0, 100), total: t, truncated: true } : { rows, total: t };
}

function num(v, d) {
  const n = Number(v);
  return isFinite(n) ? n : (d == null ? null : d);
}

const S_STR = { type: 'string' };
const S_NUM = { type: 'number' };
const S_BOOL = { type: 'boolean' };

function P(props, req) {
  return { type: 'object', properties: props, required: req || [] };
}

Object.assign(window, {
  TOOLS, registerTool, toolSchemas, OK, ERR, cap, num, S_STR, S_NUM, S_BOOL, P
});
