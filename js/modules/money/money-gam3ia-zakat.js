/* ============================================================================
   كله — Kollo | Money Module: Gam3iyat & Zakat Tabs
   ============================================================================ */

async function renderMoneyGam3ia(box) {
  const b1 = document.createElement('button');
  b1.className = 'b p';
  b1.textContent = '＋ جمعية';
  b1.onclick = () => openEditor('gam3iyat', null);
  box.appendChild(b1);

  const gs = await R.gam3iyat.all();
  const c = document.createElement('div');
  c.className = 'grid g2';
  c.style.marginTop = '12px';

  if (!gs.length) {
    c.appendChild(
      UI.empty('مفيش جمعيات', 'سجّل الجمعية: القسط، عدد الأعضاء، ودورك — وهنحسبلك.', {
        label: '＋ جمعية',
        fn: () => openEditor('gam3iyat', null)
      })
    );
  }

  gs.forEach(g2 => {
    const cc = document.createElement('div');
    cc.className = 'card pad';
    const t = document.createElement('div');
    t.style.fontWeight = '800';
    t.textContent = g2.name;
    cc.appendChild(t);

    const total = (+g2.amount || 0) * (+g2.members || 0);
    const myMonth = g2.startDate && g2.myTurn ? addDays(g2.startDate, 30 * (+g2.myTurn - 1)) : null;
    const paid = (g2.rounds || []).length;
    const info = document.createElement('div');
    info.className = 'sm muted';
    info.textContent =
      'القسط ' +
      money(g2.amount) +
      ' × ' +
      fmtN(g2.members, 0) +
      ' عضو = ' +
      money(total) +
      ' في دورك' +
      (myMonth ? ' · دورك تقريبًا ' + fmtDate(myMonth) : '') +
      ' · دفعت ' +
      fmtN(paid, 0) +
      ' دور من ' +
      fmtN(g2.members, 0);
    cc.appendChild(info);

    const p = document.createElement('div');
    p.className = 'prog';
    p.style.marginTop = '8px';
    const i = document.createElement('i');
    i.style.width = clamp(g2.members ? (paid / g2.members) * 100 : 0, 100) + '%';
    p.appendChild(i);
    cc.appendChild(p);

    const b = document.createElement('button');
    b.className = 'b sm';
    b.style.marginTop = '8px';
    b.textContent = 'سجّل دور';
    b.onclick = async () => {
      Hist.begin('دور جمعية');
      const rounds = (g2.rounds || []).concat([{ date: today(), amount: +g2.amount || 0 }]);
      await R.gam3iyat.patch(g2.id, { rounds });
      const acc = await defaultAccount();
      const cat = await ensureCategory('جمعية');
      await R.txns.add({
        date: today(),
        amount: +g2.amount || 0,
        type: 'expense',
        accountId: acc.id,
        categoryId: cat.id,
        note: 'جمعية: ' + g2.name
      });
      Hist.commit();
      UI.toast('اتسجّل الدور واتخصم من ' + acc.name, { undo: true });
      Router.render();
    };
    cc.appendChild(b);
    c.appendChild(cc);
  });
  box.appendChild(c);
}

function renderMoneyZakat(box) {
  const c = document.createElement('div');
  c.className = 'card pad';
  const h = document.createElement('div');
  h.style.fontWeight = '800';
  h.textContent = 'حاسبة الزكاة (٢.٥٪)';
  c.appendChild(h);

  const p = document.createElement('p');
  p.className = 'sm muted';
  p.textContent = 'دي حسبة رقمية بسيطة على المبلغ اللي إنت تدخله. مش فتوى — لو محتاج تفصيل ارجع لشيخ/مفتي.';
  c.appendChild(p);

  const inp = document.createElement('input');
  inp.className = 'in';
  inp.type = 'number';
  inp.placeholder = 'المبلغ الخاضع للزكاة';
  c.appendChild(inp);

  const out = document.createElement('div');
  out.className = 'num';
  out.style.cssText = 'font-weight:800;font-size:1.3rem;margin-top:8px';
  out.textContent = money(0);
  inp.oninput = () => (out.textContent = money((+inp.value || 0) * 0.025));
  c.appendChild(out);

  const sug = document.createElement('div');
  sug.className = 'xs dim';
  sug.textContent = 'المقترح = المبلغ × ٢.٥٪. الحساب ظاهر بالمعادلة عشان تتأكد بنفسك.';
  c.appendChild(sug);
  box.appendChild(c);
}

Object.assign(window, {
  renderMoneyGam3ia,
  renderMoneyZakat
});
