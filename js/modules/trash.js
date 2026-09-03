/* ============================================================================
   كله — Kollo | Module: Trash (سلة المهملات)
   Soft-deleted items (30-day retention), restore, and permanent deletion
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.trash = async () => {
  const box = document.createElement('div');
  const rows = (await dbAll('trash'))
    .filter(r => r.deletedAt >= addDays(today(), -30))
    .sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));

  const bar = document.createElement('div');
  bar.className = 'row';
  const em = document.createElement('button');
  em.className = 'd';
  em.textContent = '🧹 فرّغ السلة';
  em.onclick = async () => {
    if (!(await UI.confirm('نفرّغ السلة؟', 'اللي فيها هيتمسح للأبد.', true))) return;
    for (const r of rows) {
      await dbDel(r.store, r.refId);
      await dbDel('trash', r.id);
    }
    UI.toast('اتفرّغت');
    Router.render();
  };
  bar.appendChild(em);
  box.appendChild(bar);

  const c = document.createElement('div');
  c.className = 'card';
  c.style.marginTop = '12px';

  if (!rows.length) {
    c.appendChild(UI.empty('السلة فاضية', 'أي حاجة تمسحها تقعد هنا ٣٠ يوم قبل ما تختفي.', null));
  }

  rows.forEach(r => {
    const li = document.createElement('div');
    li.className = 'li';
    const m = document.createElement('div');
    m.style.flex = '1';

    const t = document.createElement('div');
    t.className = 't';
    t.textContent = String(r.title || r.refId).slice(0, 80);

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent = r.store + ' · اتمسحت ' + relDay(String(r.deletedAt).slice(0, 10));
    m.append(t, s);

    const rb = document.createElement('button');
    rb.className = 'b sm p';
    rb.textContent = 'رجّعها';
    rb.onclick = async () => {
      await R[r.store].restore(r.refId);
      await dbDel('trash', r.id);
      UI.toast('رجعت مكانها');
      Router.render();
    };

    li.append(m, rb);
    c.appendChild(li);
  });

  box.appendChild(c);
  return box;
};
