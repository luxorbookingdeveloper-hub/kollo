/* ============================================================================
   كله — Kollo | Custom Canvas Charts: Donut, Radar, and Heatmap
   ============================================================================ */
window.Chart = window.Chart || {};

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
  heatmap
});
