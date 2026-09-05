/* ============================================================================
   كله — Kollo | UI Subsystem: Dynamic Form Generator
   ============================================================================ */
window.UI = window.UI || {};

UI.form = function(o) {
  /* o:{title, fields:[...], values, onSave(values) } */
  const box = document.createElement('div');
  const inputs = {};

  (o.fields || []).forEach(f => {
    const w = document.createElement('div');
    w.className = 'fld';
    const id = 'f-' + uid().slice(0, 8);
    if (f.t !== 'switch') {
      const l = document.createElement('label');
      l.textContent = f.l + (f.req ? ' *' : '');
      l.htmlFor = id;
      w.appendChild(l);
    }
    let el;
    const v = (o.values || {})[f.k];
    if (f.t === 'textarea') {
      el = document.createElement('textarea');
      el.className = 'in';
      el.value = v == null ? '' : v;
    } else if (f.t === 'select') {
      el = document.createElement('select');
      el.className = 'in';
      (f.opts || []).forEach(op => {
        const oo = document.createElement('option');
        oo.value = op.v;
        oo.textContent = op.l;
        if (String(v) === String(op.v)) oo.selected = true;
        el.appendChild(oo);
      });
    } else if (f.t === 'switch') {
      el = document.createElement('input');
      el.type = 'checkbox';
      el.checked = !!v;
      const lab = document.createElement('label');
      lab.style.display = 'flex';
      lab.style.gap = '8px';
      lab.style.alignItems = 'center';
      lab.style.minHeight = '44px';
      lab.appendChild(el);
      const s2 = document.createElement('span');
      s2.textContent = f.l;
      lab.appendChild(s2);
      w.appendChild(lab);
    } else {
      el = document.createElement('input');
      el.className = 'in';
      el.type = f.t === 'money' || f.t === 'number' ? 'number' : (f.t || 'text');
      if (f.t === 'money' || f.t === 'number') el.step = f.step || 'any';
      el.value = v == null ? '' : v;
      if (f.ph) el.placeholder = f.ph;
    }
    el.id = id;
    if (f.req) el.required = true;
    if (f.t !== 'switch') w.appendChild(el);
    if (f.hint) {
      const hh = document.createElement('div');
      hh.className = 'xs dim';
      hh.textContent = f.hint;
      w.appendChild(hh);
    }
    inputs[f.k] = () => {
      if (f.t === 'switch') return el.checked;
      if (f.t === 'money' || f.t === 'number') return el.value === '' ? null : Number(el.value);
      if (f.t === 'tags') return String(el.value || '').split(/[,،]/).map(x => x.trim()).filter(Boolean);
      return el.value;
    };
    box.appendChild(w);
  });

  return UI.sheet({
    title: o.title,
    body: box,
    actions: [
      { label: 'إلغاء' },
      {
        label: o.saveLabel || 'حفظ',
        kind: 'p',
        fn: async () => {
          const vals = {};
          for (const k in inputs) vals[k] = inputs[k]();
          const miss = (o.fields || []).filter(
            f => f.req && (vals[f.k] === '' || vals[f.k] == null || (Array.isArray(vals[f.k]) && !vals[f.k].length))
          );
          if (miss.length) {
            UI.toast('ناقص: ' + miss.map(f => f.l).join('، '));
            return false;
          }
          try {
            await o.onSave(vals);
          } catch (e) {
            UI.toast('حصلت مشكلة: ' + e.message);
            return false;
          }
        }
      }
    ]
  });
};
