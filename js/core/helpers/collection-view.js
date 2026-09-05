/* ============================================================================
   كله — Kollo | Core Helpers: Generic Collection Browser View
   ============================================================================ */

async function collectionView(store, opt) {
  opt = opt || {};
  const box = document.createElement('div');
  let rows = await R[store].all();
  const bar = document.createElement('div');
  bar.className = 'card pad row wrap';
  bar.style.marginBottom = '12px';

  const q = document.createElement('input');
  q.className = 'in';
  q.placeholder = 'دوّر…';
  q.style.flex = '1 1 180px';
  q.value = (S.route && S.route.params && S.route.params.q) || '';

  const sort = document.createElement('select');
  sort.className = 'in';
  sort.style.flex = '0 0 150px';
  [
    ['updatedAt', 'الأحدث'],
    ['title', 'بالاسم'],
    ['due', 'بالموعد'],
    ['amount', 'بالمبلغ']
  ].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    sort.appendChild(o);
  });

  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ إضافة';
  add.onclick = () => openEditor(store, null);
  bar.append(q, sort, add);
  box.appendChild(bar);

  const listWrap = document.createElement('div');
  listWrap.className = 'card';
  box.appendChild(listWrap);

  const mini = document.createElement('div');
  mini.className = 'card pad sm muted';
  mini.style.marginTop = '12px';
  box.appendChild(mini);

  const paint = () => {
    let v = rows.slice();
    const qq = q.value.trim();
    if (qq) {
      v = v
        .map(r => ({ r, s: Math.max(fuzzy(qq, titleOf(r)), fuzzy(qq, JSON.stringify(r.tags || []))) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map(x => x.r);
    }
    const sk = sort.value;
    v.sort((a, b) =>
      sk === 'title'
        ? String(titleOf(a)).localeCompare(String(titleOf(b)), 'ar')
        : sk === 'amount'
        ? Math.abs(+b.amount || 0) - Math.abs(+a.amount || 0)
        : String(b[sk] || '').localeCompare(String(a[sk] || ''))
    );

    listWrap.textContent = '';
    if (!v.length) {
      listWrap.appendChild(
        UI.empty(opt.emptyTitle || 'مفيش حاجة هنا لسه…', opt.emptyText || T('empty'), {
          label: 'ابدأ بأول واحدة',
          fn: () => openEditor(store, null)
        })
      );
    } else {
      const render = r => {
        const li = document.createElement('div');
        li.className = 'li';
        const main = document.createElement('div');
        main.style.flex = '1';
        main.style.minWidth = '0';
        const t1 = document.createElement('div');
        t1.className = 't';
        t1.textContent = titleOf(r);
        const t2 = document.createElement('div');
        t2.className = 'xs dim';
        t2.textContent = subOf(store, r);
        main.append(t1, t2);

        const e = document.createElement('button');
        e.className = 'b sm g';
        e.textContent = '✏️';
        e.setAttribute('aria-label', 'تعديل');
        e.onclick = () => openEditor(store, r);

        const d = document.createElement('button');
        d.className = 'b sm g';
        d.textContent = '🗑️';
        d.setAttribute('aria-label', 'حذف');
        d.onclick = async () => {
          Hist.begin('حذف');
          await R[store].softDel(r.id);
          Hist.commit();
          UI.toast(T('del'), { undo: true });
          rows = await R[store].all();
          paint();
        };

        li.append(main, e, d);
        return li;
      };

      if (v.length > 200) listWrap.appendChild(UI.vlist(v, render, 68));
      else v.forEach(r => listWrap.appendChild(render(r)));
    }
    mini.textContent =
      'إجمالي: ' +
      fmtN(v.length, 0) +
      ' عنصر' +
      (rows.some(r => r.amount != null)
        ? ' · مجموع المبالغ: ' + money(v.reduce((s, r) => s + Math.abs(+r.amount || 0), 0))
        : '');
  };

  q.addEventListener('input', debounce(paint, 120));
  sort.onchange = paint;
  paint();

  const offBus = Bus.on('data', debounce(async () => {
    rows = await R[store].all();
    paint();
  }, 150));

  return box;
}

Object.assign(window, {
  collectionView
});
