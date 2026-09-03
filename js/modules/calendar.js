/* ============================================================================
   كله — Kollo | Module: Calendar (التقويم والمواعيد)
   Monthly grid view, navigation, day details, and event management
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.calendar = async () => {
  const box = document.createElement('div');
  const mk = (S.route && S.route.params && S.route.params.m) || monthKey();
  const [y, m] = mk.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();

  const bar = document.createElement('div');
  bar.className = 'row';
  bar.style.marginBottom = '12px';

  const prev = document.createElement('button');
  prev.className = 'b sm';
  prev.textContent = '‹ السابق';
  prev.onclick = () => {
    const d = new Date(y, m - 2, 1);
    location.hash = '#/calendar?m=' + monthKey(ymd(d));
  };

  const nx = document.createElement('button');
  nx.className = 'b sm';
  nx.textContent = 'التالي ›';
  nx.onclick = () => {
    const d = new Date(y, m, 1);
    location.hash = '#/calendar?m=' + monthKey(ymd(d));
  };

  const ttl = document.createElement('div');
  ttl.style.cssText = 'flex:1;font-weight:800;text-align:center';
  ttl.textContent = monAr[m - 1] + ' ' + fmtN(y, 0);

  const add = document.createElement('button');
  add.className = 'b p sm';
  add.textContent = '＋ ميعاد';
  add.onclick = () => openEditor('events', null);

  bar.append(prev, ttl, nx, add);
  box.appendChild(bar);

  const evs = await R.events.byIndex('start', IDBKeyRange.bound(mk + '-01', mk + '-31'));
  const grid = document.createElement('div');
  grid.className = 'card pad';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '4px';

  dowAr.forEach(d => {
    const h = document.createElement('div');
    h.className = 'xs dim';
    h.style.textAlign = 'center';
    h.textContent = d.slice(0, 3);
    grid.appendChild(h);
  });

  for (let i = 0; i < first.getDay(); i++) grid.appendChild(document.createElement('div'));

  for (let d = 1; d <= lastDay; d++) {
    const key = mk + '-' + pad2(d);
    const cell = document.createElement('button');
    cell.style.cssText =
      'min-height:62px;border:1px solid var(--line);border-radius:10px;padding:5px;text-align:start;display:grid;gap:2px;align-content:start';
    if (key === today()) cell.style.borderColor = 'var(--accent)';

    const n = document.createElement('div');
    n.className = 'xs num';
    n.style.fontWeight = '800';
    n.textContent = fmtN(d, 0);
    cell.appendChild(n);

    evs.filter(e => e.start === key).slice(0, 2).forEach(e => {
      const p = document.createElement('div');
      p.className = 'xs';
      p.style.cssText =
        'background:var(--bg-3);border-radius:5px;padding:1px 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
      p.textContent = (e.time ? e.time + ' ' : '') + e.title;
      cell.appendChild(p);
    });

    const more = evs.filter(e => e.start === key).length - 2;
    if (more > 0) {
      const p = document.createElement('div');
      p.className = 'xs dim';
      p.textContent = '+' + fmtN(more, 0);
      cell.appendChild(p);
    }

    cell.onclick = () => openEditor('events', { start: key });
    grid.appendChild(cell);
  }
  box.appendChild(grid);

  const list = document.createElement('div');
  list.className = 'card';
  list.style.marginTop = '12px';

  if (!evs.length) {
    list.appendChild(
      UI.empty('الشهر فاضي', 'مفيش مواعيد الشهر ده.', {
        label: '＋ ميعاد',
        fn: () => openEditor('events', null)
      })
    );
  }

  evs
    .sort((a, b) => (a.start + (a.time || '')).localeCompare(b.start + (b.time || '')))
    .forEach(e => {
      const li = document.createElement('div');
      li.className = 'li';
      const m2 = document.createElement('div');
      m2.style.flex = '1';
      const a = document.createElement('div');
      a.className = 't';
      a.textContent = e.title;
      const b = document.createElement('div');
      b.className = 'xs dim';
      b.textContent = fmtDate(e.start) + (e.time ? ' · ' + e.time : '') + (e.place ? ' · ' + e.place : '');
      m2.append(a, b);

      const ed = document.createElement('button');
      ed.className = 'b sm g';
      ed.textContent = '✏️';
      ed.onclick = () => openEditor('events', e);
      li.append(m2, ed);
      list.appendChild(li);
    });

  box.appendChild(list);
  return box;
};
