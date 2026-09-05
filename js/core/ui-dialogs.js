/* ============================================================================
   كله — Kollo | UI Subsystem: Sheet & Confirmation Dialogs
   ============================================================================ */
window.UI = window.UI || {};

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
