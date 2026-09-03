/* ============================================================================
   كله — Kollo | Module: Tasks & Projects (المهام والمشاريع)
   List, Kanban, Eisenhower matrix, Today, and Overdue views
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.tasks = async () => {
  const box = document.createElement('div');
  let mode = (S.route && S.route.params && S.route.params.mode) || 'list';
  const bar = document.createElement('div');
  bar.className = 'row wrap';
  bar.style.marginBottom = '12px';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.setAttribute('role', 'tablist');
  [
    ['list', 'قائمة'],
    ['kanban', 'كانبان'],
    ['eisen', 'أيزنهاور'],
    ['today', 'النهاردة'],
    ['late', 'فاتت']
  ].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', mode === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/tasks?mode=' + v;
    };
    seg.appendChild(b);
  });

  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ مهمة';
  add.onclick = () => openEditor('tasks', null);
  const sp = document.createElement('div');
  sp.style.flex = '1';
  bar.append(seg, sp, add);
  box.appendChild(bar);

  const all = await R.tasks.all();
  const open = all.filter(t => t.status !== 'done');
  const holder = document.createElement('div');
  box.appendChild(holder);

  if (!all.length) {
    holder.appendChild(
      UI.empty('مفيش مهام لسه', 'اكتب أول مهمة — حتى لو "أشرب مية".', {
        label: '＋ أول مهمة',
        fn: () => openEditor('tasks', null)
      })
    );
    return box;
  }

  if (mode === 'kanban') {
    const g = document.createElement('div');
    g.className = 'grid';
    g.style.gridTemplateColumns = 'repeat(auto-fit, minmax(230px, 1fr))';
    [
      ['todo', 'مستنية'],
      ['doing', 'بشتغل فيها'],
      ['blocked', 'مستنية حاجة'],
      ['done', 'خلصت']
    ].forEach(([st, l]) => {
      const c = document.createElement('div');
      c.className = 'card';
      const h = document.createElement('div');
      h.className = 'pad';
      h.style.fontWeight = '800';
      const items = all.filter(t => (t.status || 'todo') === st);
      h.textContent = l + ' (' + fmtN(items.length, 0) + ')';
      c.appendChild(h);
      items.slice(0, 50).forEach(t => c.appendChild(taskRow(t)));
      if (!items.length) {
        const e = document.createElement('div');
        e.className = 'pad xs dim';
        e.textContent = 'فاضية';
        c.appendChild(e);
      }
      g.appendChild(c);
    });
    holder.appendChild(g);
  } else if (mode === 'eisen') {
    const g = document.createElement('div');
    g.className = 'grid g2';
    [
      [1, 'مهم وعاجل — اعمله حالًا'],
      [2, 'مهم مش عاجل — حدّد له وقت'],
      [3, 'عاجل مش مهم — قلّله'],
      [4, 'لا ده ولا ده — سيبه']
    ].forEach(([p, l]) => {
      const c = document.createElement('div');
      c.className = 'card';
      const h = document.createElement('div');
      h.className = 'pad';
      h.style.fontWeight = '800';
      h.textContent = l;
      c.appendChild(h);
      const items = open.filter(t => (t.priority || 3) === p);
      items.forEach(t => c.appendChild(taskRow(t)));
      if (!items.length) {
        const e = document.createElement('div');
        e.className = 'pad xs dim';
        e.textContent = 'فاضية';
        c.appendChild(e);
      }
      g.appendChild(c);
    });
    holder.appendChild(g);
  } else {
    let items = mode === 'today' ? open.filter(t => t.due === today()) : mode === 'late' ? open.filter(t => t.due && t.due < today()) : all;
    items = items.slice().sort(
      (a, b) =>
        String(a.due || '9999').localeCompare(String(b.due || '9999')) ||
        ((a.priority || 3) - (b.priority || 3))
    );
    const c = document.createElement('div');
    c.className = 'card';
    if (!items.length) {
      c.appendChild(UI.empty('نضيفة', 'مفيش حاجة في القسم ده.', null));
    } else if (items.length > 200) {
      c.appendChild(UI.vlist(items, t => taskRow(t), 72));
    } else {
      items.forEach(t => c.appendChild(taskRow(t)));
    }
    holder.appendChild(c);
  }

  const mini = document.createElement('div');
  mini.className = 'card pad sm muted';
  mini.style.marginTop = '12px';
  mini.textContent =
    'مفتوحة: ' +
    fmtN(open.length, 0) +
    ' · فاتت: ' +
    fmtN(open.filter(t => t.due && t.due < today()).length, 0) +
    ' · خلصت الأسبوع ده: ' +
    fmtN(all.filter(t => t.doneAt && t.doneAt >= addDays(today(), -7)).length, 0);
  box.appendChild(mini);

  return box;
};

window.VIEWS.projects = () => collectionView('projects', { emptyTitle: 'مفيش مشاريع' });
