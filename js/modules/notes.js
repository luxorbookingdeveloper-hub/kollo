/* ============================================================================
   كله — Kollo | Module: Notes & Knowledge Graph (المذكرات وشبكة المعرفة)
   Full-text search, bidirectional links [[Note]], flashcard generator, and network graph
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.notes = async () => {
  const box = document.createElement('div');
  const notes = await R.notes.all();
  const bar = document.createElement('div');
  bar.className = 'row wrap';
  bar.style.marginBottom = '12px';

  const q = document.createElement('input');
  q.className = 'in';
  q.placeholder = 'دوّر في كل النص (Worker)…';
  q.style.flex = '1 1 200px';
  q.value = (S.route && S.route.params && S.route.params.q) || '';

  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ مذكرة';
  add.onclick = () => openEditor('notes', null);

  bar.append(q, add);
  box.appendChild(bar);

  const wrap = document.createElement('div');
  box.appendChild(wrap);

  const paint = async () => {
    wrap.textContent = '';
    let list = notes.slice();
    if (q.value.trim()) {
      const res = await WK.call({
        op: 'search',
        q: q.value.trim(),
        rows: notes.map(n => ({
          id: n.id,
          store: 'notes',
          title: n.title,
          text: (n.title || '') + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ')
        }))
      });
      const ids = res.map(r => r.id);
      list = ids.map(id => notes.find(n => n.id === id)).filter(Boolean);
    }

    if (!list.length) {
      wrap.appendChild(
        UI.empty('مفيش مذكرات', 'اكتب أول فكرة — واستخدم [[اسم مذكرة]] للربط.', {
          label: '＋ مذكرة',
          fn: () => openEditor('notes', null)
        })
      );
      return;
    }

    const g = document.createElement('div');
    g.className = 'grid g2';
    list.slice(0, 120).forEach(n => {
      const c = document.createElement('div');
      c.className = 'card pad';
      const t = document.createElement('div');
      t.style.fontWeight = '800';
      t.textContent = (n.pinned ? '📌 ' : '') + n.title;
      c.appendChild(t);
      c.appendChild(mdLite(String(n.body || '').slice(0, 320)));

      const links = (String(n.body || '').match(/\[\[[^\]]+\]\]/g) || []).map(x => x.slice(2, -2));
      const back = notes.filter(o => o.id !== n.id && String(o.body || '').includes('[[' + n.title + ']]'));
      const f = document.createElement('div');
      f.className = 'xs dim';
      f.textContent = [
        (n.tags || []).map(x => '#' + x).join(' '),
        links.length ? 'روابط: ' + links.length : '',
        back.length ? 'باكلينكس: ' + back.length : ''
      ]
        .filter(Boolean)
        .join(' · ');
      c.appendChild(f);

      const row = document.createElement('div');
      row.className = 'row';
      row.style.marginTop = '8px';
      const ed = document.createElement('button');
      ed.className = 'b sm';
      ed.textContent = '✏️ تعديل';
      ed.onclick = () => openEditor('notes', n);
      const fc = document.createElement('button');
      fc.className = 'b sm';
      fc.textContent = '🃏 اعمل كروت';
      fc.onclick = () => cardsFromNote(n);
      row.append(ed, fc);
      c.appendChild(row);
      g.appendChild(c);
    });
    wrap.appendChild(g);

    /* شبكة العلاقات — canvas force-lite */
    const nodes = notes.slice(0, 40).map((n, i) => ({
      id: n.id,
      t: n.title,
      x: Math.cos(i) * 90 + 150,
      y: Math.sin(i * 1.7) * 70 + 110
    }));
    const edges = [];
    notes.forEach(n =>
      (String(n.body || '').match(/\[\[[^\]]+\]\]/g) || []).forEach(l => {
        const to = notes.find(o => o.title === l.slice(2, -2));
        if (to) edges.push([nodes.findIndex(x => x.id === n.id), nodes.findIndex(x => x.id === to.id)]);
      })
    );

    if (edges.length) {
      const c = document.createElement('div');
      c.className = 'card pad';
      c.style.marginTop = '12px';
      const h = document.createElement('div');
      h.style.fontWeight = '800';
      h.textContent = 'شبكة العلاقات';
      c.appendChild(h);
      const cnv = cv(240);
      c.appendChild(cnv);
      box.appendChild(c);

      autoRedraw(cnv, () => {
        const { x, w, h: hh, acc, line, tx } = prep(cnv);
        for (let it = 0; it < 80; it++) {
          edges.forEach(([a, b]) => {
            if (a < 0 || b < 0) return;
            const A = nodes[a], B = nodes[b];
            const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, f = (d - 70) * 0.01;
            A.x += (dx / d) * f;
            A.y += (dy / d) * f;
            B.x -= (dx / d) * f;
            B.y -= (dy / d) * f;
          });
          nodes.forEach(n => {
            n.x = clamp(n.x, 20, w - 20);
            n.y = clamp(n.y, 16, hh - 16);
          });
        }
        x.strokeStyle = line;
        edges.forEach(([a, b]) => {
          if (a < 0 || b < 0) return;
          x.beginPath();
          x.moveTo(nodes[a].x, nodes[a].y);
          x.lineTo(nodes[b].x, nodes[b].y);
          x.stroke();
        });
        x.font = '10px var(--f-ar)';
        x.textAlign = 'center';
        nodes.forEach(n => {
          x.fillStyle = acc;
          x.beginPath();
          x.arc(n.x, n.y, 5, 0, Math.PI * 2);
          x.fill();
          x.fillStyle = tx;
          x.fillText(String(n.t || '').slice(0, 12), n.x, n.y - 9);
        });
      });
    }
  };

  q.addEventListener('input', debounce(paint, 160));
  await paint();
  return box;
};

async function cardsFromNote(n) {
  const lines = String(n.body || '').split('\n').filter(l => l.includes('::') || l.includes('؟'));
  if (!lines.length) {
    UI.toast('اكتب في المذكرة سطور بالشكل: السؤال :: الجواب');
    return;
  }
  Hist.begin('كروت من مذكرة');
  let c = 0;
  for (const l of lines) {
    const [f, b] = l.includes('::') ? l.split('::') : [l, ''];
    await R.cards.add({ front: f.trim(), back: (b || '').trim(), noteId: n.id, due: today(), ef: 2.5, reps: 0, interval: 0 });
    c++;
  }
  Hist.commit();
  UI.toast('عملنا ' + fmtN(c, 0) + ' كارت للمراجعة المتباعدة.', { undo: true });
}

Object.assign(window, {
  cardsFromNote
});
