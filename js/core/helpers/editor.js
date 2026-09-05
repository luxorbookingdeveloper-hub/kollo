/* ============================================================================
   كله — Kollo | Core Helpers: Entity Labels & Record Editor
   ============================================================================ */

function titleOf(r) {
  return r.title || r.name || r.front || r.number || r.kind || r.type || r.body || '—';
}

function subOf(store, r) {
  const bits = [];
  if (r.due) bits.push('⏰ ' + relDay(r.due));
  if (r.date) bits.push('📅 ' + relDay(r.date));
  if (r.start) bits.push('📅 ' + relDay(r.start) + (r.time ? ' ' + r.time : ''));
  if (r.amount != null) bits.push('💰 ' + money(r.amount));
  if (r.expiry) bits.push('⌛ ' + relDay(r.expiry));
  if (r.minutes) bits.push('⏱️ ' + fmtN(r.minutes, 0) + 'د');
  if (r.status) bits.push(r.status);
  if (r.tags && r.tags.length) bits.push(r.tags.map(t => '#' + t).join(' '));
  return bits.join(' · ');
}

async function openEditor(store, rec) {
  const flds = FLDS[store] || [{ k: 'title', l: 'العنوان', t: 'text', req: true }, { k: 'note', l: 'ملاحظات', t: 'textarea' }];
  UI.form({
    title: (rec ? 'تعديل' : 'إضافة') + ' — ' + (MODULES.find(m => m.store === store) || { t: store }).t,
    fields: flds,
    values: rec || {},
    onSave: async v => {
      Hist.begin(rec ? 'تعديل' : 'إضافة');
      const payload = Object.assign(!rec && store === 'tasks' ? { status: 'todo' } : {}, v);
      const out = rec ? await R[store].patch(rec.id, payload) : await R[store].add(payload);
      Hist.commit();
      UI.toast(T('save'), { undo: true });
      Router.render();
      return out;
    }
  });
}

Object.assign(window, {
  titleOf, subOf, openEditor
});
