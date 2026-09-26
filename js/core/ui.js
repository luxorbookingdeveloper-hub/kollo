/* ============================================================================
   كله — Kollo | UI Kit: Toast, Empty State, and Virtual List
   ============================================================================ */
const UI = window.UI || {};

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

  const toCopy = opt.copy || (opt.copyable || /فشل|خطأ|رفض|مرفوض/i.test(msg) ? (typeof opt.copy === 'string' ? opt.copy : msg) : null);
  if (toCopy) {
    const cp = document.createElement('button');
    cp.className = 'u';
    cp.textContent = '📋 نسخ';
    cp.title = 'نسخ نص الخطأ';
    cp.onclick = async (e) => {
      e.stopPropagation();
      if (typeof copyText === 'function') await copyText(toCopy);
      cp.textContent = '✅ تم النسخ';
      setTimeout(() => { cp.textContent = '📋 نسخ'; }, 2000);
    };
    el.appendChild(cp);
  }

  box.appendChild(el);
  const defMs = toCopy ? 9000 : 4200;
  setTimeout(() => {
    el.style.transition = 'opacity .2s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 240);
  }, opt.ms || defMs);

  return el;
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
