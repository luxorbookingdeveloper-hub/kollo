/* ============================================================================
   كله — Kollo | Custom Canvas Charts (Line, Bars, Donut, Radar, Heatmap)
   ============================================================================ */
const Chart = {};

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

Chart.donut = function(data, opt) {
  opt = opt || {};
  const c = cv(opt.h || 200);
  const pal = ['#0f766e', '#d97706', '#be123c', '#6d28d9', '#2fbf9b', '#c2410c', '#0369a1', '#a16207', '#4d7c0f', '#9d174d'];
  return autoRedraw(c, () => {
    const { x, w, h, tx } = prep(c);
    const tot = data.reduce((a, b) => a + Math.abs(b.v), 0);
    if (!tot) return;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8, ir = r * .62;
    let a0 = -Math.PI / 2;
    data.forEach((d, i) => {
      const a1 = a0 + (Math.abs(d.v) / tot) * Math.PI * 2;
      x.beginPath();
      x.arc(cx, cy, r, a0, a1);
      x.arc(cx, cy, ir, a1, a0, true);
      x.closePath();
      x.fillStyle = d.c || pal[i % pal.length];
      x.fill();
      a0 = a1;
    });
    x.fillStyle = tx;
    x.textAlign = 'center';
    x.font = '700 13px var(--f-ar)';
    x.fillText(fmtN(tot, 0), cx, cy + 5);
  });
};

Chart.radar = function(data, opt) {
  opt = opt || {};
  const c = cv(opt.h || 240);
  return autoRedraw(c, () => {
    const { x, w, h, acc, line, tx } = prep(c);
    const n = data.length;
    if (n < 3) return;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 30;
    for (let k = 1; k <= 4; k++) {
      x.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = -Math.PI / 2 + (i % n) * 2 * Math.PI / n;
        const rr = r * k / 4;
        const xx = cx + Math.cos(a) * rr;
        const yy = cy + Math.sin(a) * rr;
        i ? x.lineTo(xx, yy) : x.moveTo(xx, yy);
      }
      x.strokeStyle = line;
      x.stroke();
    }
    x.beginPath();
    data.forEach((d, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      const rr = r * clamp((d.v || 0) / (opt.max || 10), 0, 1);
      const xx = cx + Math.cos(a) * rr;
      const yy = cy + Math.sin(a) * rr;
      i ? x.lineTo(xx, yy) : x.moveTo(xx, yy);
    });
    x.closePath();
    x.fillStyle = acc + '44';
    x.fill();
    x.strokeStyle = acc;
    x.lineWidth = 2;
    x.stroke();
    x.fillStyle = tx;
    x.font = '10px var(--f-ar)';
    x.textAlign = 'center';
    data.forEach((d, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      x.fillText(d.l, cx + Math.cos(a) * (r + 16), cy + Math.sin(a) * (r + 16) + 3);
    });
  });
};

function heatmap(days) {
  /* days: {date:count} */
  const box = document.createElement('div');
  box.className = 'hm';
  const end = new Date();
  const start = new Date(end.getTime() - 181 * dayMs);
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
    const k = ymd(d), v = days[k] || 0;
    const i = document.createElement('i');
    i.title = k + ' — ' + fmtN(v, 0);
    if (v) i.style.background = 'color-mix(in oklab, var(--accent) ' + clamp(25 + v * 22, 25, 100) + '%, var(--bg-3))';
    box.appendChild(i);
  }
  return box;
}

Object.assign(window, {
  Chart, cv, prep, autoRedraw, heatmap
});
