/* ============================================================================
   كله — Kollo | Module: Learning (التعلّم والمراجعة)
   Books reading progress, Quotes, and Courses
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.learn = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'books';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['books', 'كتب'], ['courses', 'كورسات'], ['srs', 'مراجعة متباعدة']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/learn?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'books') {
    const books = await R.books.all();
    const add = document.createElement('button');
    add.className = 'b p';
    add.textContent = '＋ كتاب';
    add.onclick = () => openEditor('books', null);
    box.appendChild(add);

    const g = document.createElement('div');
    g.className = 'grid g2';
    g.style.marginTop = '12px';

    if (!books.length) {
      g.appendChild(
        UI.empty('مفيش كتب', 'ضيف كتاب وسجّل تقدّمك بالصفحات.', {
          label: '＋ كتاب',
          fn: () => openEditor('books', null)
        })
      );
    }

    books.forEach(b => {
      const c = document.createElement('div');
      c.className = 'card pad';

      const t = document.createElement('div');
      t.style.fontWeight = '800';
      t.textContent = b.title;

      const s = document.createElement('div');
      s.className = 'xs dim';
      s.textContent = [b.author, b.status === 'reading' ? 'بقراه' : b.status === 'done' ? 'خلصته' : 'بعدين'].filter(Boolean).join(' · ');
      c.append(t, s);

      const p = document.createElement('div');
      p.className = 'prog';
      p.style.marginTop = '8px';
      const i = document.createElement('i');
      i.style.width = clamp(((+b.page || 0) / ((+b.pages) || 1)) * 100, 0, 100) + '%';
      p.appendChild(i);
      c.appendChild(p);

      const n = document.createElement('div');
      n.className = 'xs num dim';
      n.textContent = fmtN(b.page || 0, 0) + ' / ' + fmtN(b.pages || 0, 0) + ' صفحة';
      c.appendChild(n);

      const row = document.createElement('div');
      row.className = 'row';
      row.style.marginTop = '8px';

      const up = document.createElement('button');
      up.className = 'b sm';
      up.textContent = '📖 حدّث الصفحة';
      up.onclick = () =>
        UI.form({
          title: 'واقف عند صفحة كام؟',
          fields: [{ k: 'page', l: 'الصفحة', t: 'number', req: true }],
          values: { page: b.page || 0 },
          onSave: async v => {
            Hist.begin('قراية');
            await R.books.patch(b.id, {
              page: +v.page,
              status: +v.page >= (+b.pages || 0) && b.pages ? 'done' : 'reading'
            });
            Hist.commit();
            UI.toast(T('save'), { undo: true });
            Router.render();
          }
        });

      const qt = document.createElement('button');
      qt.className = 'b sm';
      qt.textContent = '❝ اقتباس';
      qt.onclick = () =>
        UI.form({
          title: 'اقتباس من ' + b.title,
          fields: [{ k: 'text', l: 'الاقتباس', t: 'textarea', req: true }, { k: 'page', l: 'صفحة', t: 'number' }],
          values: {},
          onSave: async v => {
            Hist.begin('اقتباس');
            await R.notes.add({
              title: 'اقتباس: ' + b.title,
              body: '> ' + v.text + '\n\n— صفحة ' + fmtN(v.page || 0, 0),
              tags: ['اقتباسات']
            });
            Hist.commit();
            UI.toast('اتحفظ في المذكرات', { undo: true });
          }
        });

      const ed = document.createElement('button');
      ed.className = 'b sm g';
      ed.textContent = '✏️';
      ed.onclick = () => openEditor('books', b);

      row.append(up, qt, ed);
      c.appendChild(row);
      g.appendChild(c);
    });
    box.appendChild(g);
  } else if (tab === 'courses') {
    box.appendChild(await collectionView('courses', { emptyTitle: 'مفيش كورسات' }));
  } else {
    box.appendChild(await renderSrsSession());
  }
  return box;
};
