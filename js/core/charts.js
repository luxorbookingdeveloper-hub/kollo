/* ============================================================================
   كله — Kollo | Custom Canvas Charts: Core Engine, Line, and Bar Charts
   ============================================================================ */
const Chart = window.Chart || {};

function cv(h) {
  const c = document.createElement('canvas');
  c.style.width = '100%';
  c.style.height = (h || 180) + 'px';
  c.style.display = 'block';
  return c;
}

function prep(c) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = c.clientWidth || 300;
  const h = parseInt(c.style.height) || 180;
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.documentElement);
  return {
    x,
    w,
    h,
    acc: cs.getPropertyValue('--accent').trim() || '#0f766e',
    line: cs.getPropertyValue('--line-2').trim() || '#ccc',
    tx: cs.getPropertyValue('--tx-2').trim() || '#555'
  };
}

function autoRedraw(c, fn) {
  const ro = new ResizeObserver(debounce(() => fn(), 80));
  ro.observe(c);
  requestAnimationFrame(fn);
  return c;
}

Chart.line = function(data, opt) {
  opt = opt || {};
  const c = cv(opt.h || 180);
  return autoRedraw(c, () => {
    const { x, w, h, acc, line, tx } = prep(c);
    if (!data.length) return;
    const pl = { t: 14, r: 10, b: 24, l: 44 }, iw = w - pl.l - pl.r, ih = h - pl.t - pl.b;
    const vs = data.map(d => d.v);
    const mx = Math.max.apply(null, vs.concat([0]));
    const mn = Math.min.apply(null, vs.concat([0]));
    const sc = v => pl.t + ih - ((v - mn) / ((mx - mn) || 1)) * ih;
    x.strokeStyle = line;
    x.lineWidth = 1;
    x.font = '10px var(--f-ar)';
    x.fillStyle = tx;
    x.textAlign = 'right';
    for (let i = 0; i <= 3; i++) {
      const yy = pl.t + ih * (i / 3);
      x.beginPath();
      x.moveTo(pl.l, yy);
      x.lineTo(w - pl.r, yy);
      x.stroke();
      x.fillText(fmtN(mx - (mx - mn) * (i / 3), 0), pl.l - 6, yy + 3);
    }
    x.beginPath();
    data.forEach((d, i) => {
      const xx = pl.l + iw * (data.length > 1 ? i / (data.length - 1) : .5);
      i ? x.lineTo(xx, sc(d.v)) : x.moveTo(xx, sc(d.v));
    });
    x.strokeStyle = acc;
    x.lineWidth = 2.4;
    x.lineJoin = 'round';
    x.stroke();
    const g = x.createLinearGradient(0, pl.t, 0, pl.t + ih);
    g.addColorStop(0, acc + '55');
    g.addColorStop(1, acc + '00');
    x.lineTo(pl.l + iw, pl.t + ih);
    x.lineTo(pl.l, pl.t + ih);
    x.closePath();
    x.fillStyle = g;
    x.fill();
    x.fillStyle = tx;
    x.textAlign = 'center';
    data.forEach((d, i) => {
      if (data.length > 8 && i % Math.ceil(data.length / 6)) return;
      x.fillText(String(d.l || ''), pl.l + iw * (data.length > 1 ? i / (data.length - 1) : .5), h - 7);
    });
  });
};

Chart.bars = function(data, opt) {
  opt = opt || {};
  const c = cv(opt.h || 190);
  return autoRedraw(c, () => {
    const { x, w, h, acc, tx, line } = prep(c);
    if (!data.length) return;
    const pl = { t: 12, r: 8, b: 26, l: 44 }, iw = w - pl.l - pl.r, ih = h - pl.t - pl.b;
    const mx = Math.max.apply(null, data.map(d => Math.abs(d.v)).concat([1]));
    const bw = Math.max(6, Math.min(38, iw / data.length - 8));
    x.strokeStyle = line;
    x.beginPath();
    x.moveTo(pl.l, pl.t + ih);
    x.lineTo(w - pl.r, pl.t + ih);
    x.stroke();
    x.font = '10px var(--f-ar)';
    data.forEach((d, i) => {
      const xx = pl.l + iw * ((i + .5) / data.length) - bw / 2;
      const hh = (Math.abs(d.v) / mx) * ih;
      x.fillStyle = d.c || acc;
      x.beginPath();
      const r = 5, yy = pl.t + ih - hh;
      x.moveTo(xx, pl.t + ih);
      x.lineTo(xx, yy + r);
      x.quadraticCurveTo(xx, yy, xx + r, yy);
      x.lineTo(xx + bw - r, yy);
      x.quadraticCurveTo(xx + bw, yy, xx + bw, yy + r);
      x.lineTo(xx + bw, pl.t + ih);
      x.closePath();
      x.fill();
      x.fillStyle = tx;
      x.textAlign = 'center';
      x.fillText(String(d.l || ''), xx + bw / 2, h - 8);
    });
  });
};

Object.assign(window, {
  Chart, cv, prep, autoRedraw
});
