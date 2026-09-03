/* ============================================================================
   كله — Kollo | Module: Kitchen & Shopping (المطبخ والتسوّق)
   Shopping list by aisle, Pantry inventory, Recipes, and Ingredients-to-list
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.kitchen = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'shopping';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['shopping', 'قايمة الشرا'], ['pantry', 'المخزن'], ['recipes', 'وصفات']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/kitchen?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'shopping') {
    const items = await R.shoppingItems.all();

    const bar = document.createElement('div');
    bar.className = 'row wrap';
    const a = document.createElement('button');
    a.className = 'b p';
    a.textContent = '＋ حاجة';
    a.onclick = () => openEditor('shoppingItems', null);

    const g = document.createElement('button');
    g.className = 'b';
    g.textContent = '🍲 ولّد من وصفة';
    g.onclick = () => listFromRecipe();

    const cl = document.createElement('button');
    cl.className = 'b';
    cl.textContent = '🧹 شيل اللي اتجاب';
    cl.onclick = async () => {
      Hist.begin('تنضيف القايمة');
      for (const i of items.filter(x => x.done)) {
        await R.shoppingItems.softDel(i.id);
      }
      Hist.commit();
      UI.toast('نضّفناها', { undo: true });
      Router.render();
    };

    bar.append(a, g, cl);
    box.appendChild(bar);

    const secs = {};
    items.forEach(i => {
      (secs[i.section || 'متنوع'] = secs[i.section || 'متنوع'] || []).push(i);
    });

    const c = document.createElement('div');
    c.className = 'card';
    c.style.marginTop = '12px';

    if (!items.length) {
      c.appendChild(
        UI.empty('القايمة فاضية', 'ضيف حاجة أو ولّد القايمة من وصفة.', {
          label: '＋ حاجة',
          fn: () => openEditor('shoppingItems', null)
        })
      );
    }

    Object.keys(secs).forEach(sn => {
      const h = document.createElement('div');
      h.className = 'pad xs dim';
      h.style.fontWeight = '800';
      h.textContent = sn;
      c.appendChild(h);

      secs[sn].forEach(i => {
        const li = document.createElement('div');
        li.className = 'li' + (i.done ? ' done' : '');

        const cb = document.createElement('button');
        cb.className = 'cb';
        cb.setAttribute('role', 'checkbox');
        cb.setAttribute('aria-checked', i.done ? 'true' : 'false');
        cb.setAttribute('aria-label', 'اتجابت: ' + i.name);
        cb.textContent = i.done ? '✓' : '';
        cb.onclick = async () => {
          Hist.begin('شراء');
          await R.shoppingItems.patch(i.id, { done: !i.done });
          Hist.commit();
          Router.render();
        };

        const m = document.createElement('div');
        m.style.flex = '1';
        const t = document.createElement('div');
        t.className = 't';
        t.textContent = i.name;

        const s = document.createElement('div');
        s.className = 'xs dim';
        s.textContent = i.qty || '';
        m.append(t, s);

        li.append(cb, m);
        c.appendChild(li);
      });
    });

    box.appendChild(c);
  } else if (tab === 'pantry') {
    const p = await R.pantry.all();
    box.appendChild(await collectionView('pantry', { emptyTitle: 'المخزن فاضي' }));

    const soon = p.filter(x => x.expiry && x.expiry <= addDays(today(), 7));
    if (soon.length) {
      const c = document.createElement('div');
      c.className = 'card pad sm';
      c.style.marginTop = '12px';
      c.textContent = '⌛ قرب ينتهي: ' + soon.map(x => x.name + ' (' + relDay(x.expiry) + ')').join(' · ');
      box.appendChild(c);
    }
  } else {
    box.appendChild(await collectionView('recipes', { emptyTitle: 'مفيش وصفات' }));
  }
  return box;
};

async function listFromRecipe() {
  const recs = await R.recipes.all();
  if (!recs.length) {
    UI.toast('ضيف وصفة الأول');
    return;
  }
  UI.form({
    title: 'ولّد قايمة شرا من وصفة',
    fields: [
      {
        k: 'id',
        l: 'الوصفة',
        t: 'select',
        opts: recs.map(r => ({ v: r.id, l: r.name }))
      }
    ],
    values: {},
    onSave: async v => {
      const r = recs.find(x => x.id === v.id);
      const pantry = await R.pantry.all();
      const need = (r.ingredients || []).filter(i => !pantry.some(p => String(p.name).includes(i)));
      if (!need.length) {
        UI.toast('كل المكوّنات موجودة في المخزن 👌');
        return;
      }
      Hist.begin('قايمة من وصفة');
      for (const n of need) {
        await R.shoppingItems.add({
          name: n,
          section: 'متنوع',
          done: false,
          note: 'من وصفة: ' + r.name
        });
      }
      Hist.commit();
      UI.toast('ضفنا ' + fmtN(need.length, 0) + ' حاجة ناقصة', { undo: true });
      Router.render();
    }
  });
}

Object.assign(window, {
  listFromRecipe
});
