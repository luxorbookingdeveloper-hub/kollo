/* ============================================================================
   كله — Kollo | UI Kit (modal, sheet, toast, confirm, form, empty, virtual list)
   ============================================================================ */
const UI = {};

UI.toast = function(msg, opt) {
  opt = opt || {};
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  const sp = document.createElement('span');
  sp.textContent = msg;
  el.appendChild(sp);

  if (opt.undo) {
    const b = document.createElement('button');
    b.className = 'u';
    b.textContent = 'رجّعها';
    b.onclick = async () => {
      el.remove();
      await Hist.undo();
      UI.toast('رجّعناها زي ما كانت.');
    };
    el.appendChild(b);
  }

  if (opt.action) {
    const b = document.createElement('button');
    b.className = 'u';
    b.textContent = opt.action.label;
    b.onclick = () => {
      el.remove();
      opt.action.fn();
    };
    el.appendChild(b);
  }

  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 240);
  }, opt.ms || 4200);

  return el;
};

UI.sheet = function(o) {
  /* o:{title, body(node), actions:[{label,kind,fn}], size} */
  const layers = $('#layers');
  const bd = document.createElement('div');
  bd.className = 'sheet-bd';
  const sh = document.createElement('div');
  sh.className = 'sheet bottom';
  sh.setAttribute('role', 'dialog');
  sh.setAttribute('aria-modal', 'true');
  sh.setAttribute('aria-label', o.title || 'نافذة');

  const grab = document.createElement('div');
  grab.className = 'grab';
  sh.appendChild(grab);

  const hd = document.createElement('div');
  hd.className = 'hd';
  const h = document.createElement('h2');
  h.style.fontSize = '1rem';
  h.style.fontWeight = '800';
  h.textContent = o.title || '';
  const sp = document.createElement('div');
  sp.className = 'sp';
  sp.style.flex = '1';

  const x = document.createElement('button');
  x.className = 'b g';
  x.setAttribute('aria-label', 'إغلاق');
  x.textContent = '✕';
  hd.append(h, sp, x);
  sh.appendChild(hd);

  const bd2 = document.createElement('div');
  bd2.className = 'bd';
  if (o.body) bd2.appendChild(o.body);
  sh.appendChild(bd2);

  const ft = document.createElement('div');
  ft.className = 'ft';
  (o.actions || [{ label: 'تمام', kind: 'p' }]).forEach(a => {
    const b = document.createElement('button');
    b.className = 'b ' + (a.kind || '');
    b.textContent = a.label;
    b.onclick = async () => {
      if (!a.fn || (await a.fn(bd2)) !== false) close();
    };
    ft.appendChild(b);
  });
  sh.appendChild(ft);
  layers.append(bd, sh);

  const prev = document.activeElement;
  requestAnimationFrame(() => {
    bd.classList.add('in');
    sh.classList.add('in');
    const f = sh.querySelector('input,select,textarea,button.b.p');
    if (f) f.focus();
  });

  function close() {
    bd.classList.remove('in');
    sh.classList.remove('in');
    setTimeout(() => {
      bd.remove();
      sh.remove();
      if (prev && prev.focus) prev.focus();
    }, 260);
    document.removeEventListener('keydown', onk);
  }

  function onk(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab') {
      const f = $$('button,input,select,textarea,[tabindex]:not([tabindex="-1"])', sh).filter(
        x => !x.disabled && x.offsetParent !== null
      );
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener('keydown', onk);
  x.onclick = close;
  bd.onclick = close;

  /* سحب بلمسة للإغلاق */
  let y0 = null;
  sh.addEventListener('touchstart', e => {
    if (e.target.closest('.bd')) return;
    y0 = e.touches[0].clientY;
  }, { passive: true });

  sh.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) sh.style.transform = 'translateY(' + dy + 'px)';
  }, { passive: true });

  sh.addEventListener('touchend', () => {
    const m = /translateY\((\d+)/.exec(sh.style.transform || '');
    sh.style.transform = '';
    y0 = null;
    if (m && +m[1] > 110) close();
  });

  return { el: sh, body: bd2, close };
};

UI.confirm = function(title, text, danger) {
  return new Promise(res => {
    const b = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = text || '';
    p.className = 'muted';
    b.appendChild(p);
    UI.sheet({
      title,
      body: b,
      actions: [
        { label: 'لأ سيبها', fn: () => { res(false); } },
        { label: danger ? 'أيوه امسح' : 'أيوه', kind: danger ? 'd' : 'p', fn: () => { res(true); } }
      ]
    });
  });
};

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

UI.empty = function(title, text, cta) {
  const d = document.createElement('div');
  d.className = 'empty';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '96');
  svg.setAttribute('height', '76');
  svg.setAttribute('viewBox', '0 0 96 76');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<rect x="10" y="20" width="76" height="46" rx="8" fill="var(--bg-3)"/>' +
    '<rect x="18" y="30" width="42" height="6" rx="3" fill="var(--line-2)"/>' +
    '<rect x="18" y="42" width="30" height="6" rx="3" fill="var(--line-2)"/>' +
    '<path d="M62 12l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="var(--accent)" opacity=".85"/>';
  d.appendChild(svg);
  const h = document.createElement('h3');
  h.textContent = title;
  d.appendChild(h);
  const p = document.createElement('p');
  p.className = 'muted sm';
  p.textContent = text;
  d.appendChild(p);
  if (cta) {
    const b = document.createElement('button');
    b.className = 'b p';
    b.textContent = cta.label;
    b.onclick = cta.fn;
    d.appendChild(b);
  }
  return d;
};

UI.vlist = function(items, render, rowH, maxH) {
  /* virtual list (windowing) */
  const box = document.createElement('div');
  box.className = 'vl';
  box.style.maxHeight = (maxH || '62vh');
  const inn = document.createElement('div');
  inn.className = 'vl-in';
  inn.style.height = (items.length * rowH) + 'px';
  box.appendChild(inn);

  let last = -1;
  const draw = () => {
    const st = box.scrollTop, vh = box.clientHeight || 600;
    const a = Math.max(0, Math.floor(st / rowH) - 6);
    const b = Math.min(items.length, Math.ceil((st + vh) / rowH) + 6);
    if (a === last) return;
    last = a;
    inn.textContent = '';
    for (let i = a; i < b; i++) {
      const r = document.createElement('div');
      r.className = 'vl-row';
      r.style.transform = 'translateY(' + (i * rowH) + 'px)';
      r.style.height = rowH + 'px';
      r.appendChild(render(items[i], i));
      inn.appendChild(r);
    }
  };

  box.addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true });
  requestAnimationFrame(draw);
  return box;
};

window.UI = UI;
