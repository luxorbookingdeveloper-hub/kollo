/* ============================================================================
   كله — Kollo | Money Module: Overview View (نظرة عامة)
   KPIs, monthly donut chart, 30-day expense line chart, and forecast
   ============================================================================ */

async function renderMoneyOverview(box, nw) {
  const k = document.createElement('div');
  k.className = 'grid g3';
  [
    ['الكاش والحسابات', money(nw.cash)],
    ['عليّ', money(nw.owe)],
    ['ليّ', money(nw.lent)],
    ['الصافي', money(nw.net)]
  ].forEach(([l, v]) => {
    const c = document.createElement('div');
    c.className = 'card kpi';
    const a = document.createElement('div');
    a.className = 'xs dim';
    a.textContent = l;
    const b = document.createElement('b');
    b.textContent = v;
    c.append(a, b);
    k.appendChild(c);
  });
  box.appendChild(k);

  const mk = monthKey();
  const tx = await txnsBetween(mk + '-01', mk + '-31');
  const cats = await R.categories.all();
  const exp = tx.filter(t => t.type === 'expense');
  const byCat = await WK.call({
    op: 'agg',
    rows: exp.map(t => ({
      k: (cats.find(c => c.id === t.categoryId) || {}).name || 'متنوع',
      v: Math.abs(+t.amount || 0)
    }))
  });

  const c1 = document.createElement('div');
  c1.className = 'card pad';
  c1.style.marginTop = '12px';
  const h1 = document.createElement('div');
  h1.style.fontWeight = '800';
  h1.textContent = 'مصاريف ' + monAr[+mk.slice(5) - 1] + ' بالتصنيف';
  c1.appendChild(h1);

  if (byCat.length) {
    c1.appendChild(Chart.donut(byCat.map(x => ({ l: x.k, v: x.v }))));
    const lg = document.createElement('div');
    lg.className = 'row wrap';
    lg.style.marginTop = '8px';
    byCat.slice(0, 8).forEach(x => {
      const s = document.createElement('span');
      s.className = 'chip';
      s.textContent = x.k + ' · ' + money(x.v);
      lg.appendChild(s);
    });
    c1.appendChild(lg);
  } else {
    c1.appendChild(
      UI.empty('مفيش معاملات الشهر ده', 'سجّل أول مصروف — أو قول للأسطى "صرفت ٤٥ قهوة".', {
        label: '＋ معاملة',
        fn: () => addTxn()
      })
    );
  }
  box.appendChild(c1);

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today(), -i);
    days.push({
      l: String(+d.slice(8)),
      v: (await txnsBetween(d, d)).filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(+t.amount || 0), 0)
    });
  }

  const c2 = document.createElement('div');
  c2.className = 'card pad';
  c2.style.marginTop = '12px';
  const h2 = document.createElement('div');
  h2.style.fontWeight = '800';
  h2.textContent = 'آخر ٣٠ يوم';
  c2.appendChild(h2);
  c2.appendChild(Chart.line(days));
  box.appendChild(c2);

  const fc = document.createElement('div');
  fc.className = 'card pad sm';
  fc.style.marginTop = '12px';
  const m6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const k2 = monthKey(ymd(d));
    m6.push((await txnsBetween(k2 + '-01', k2 + '-31')).filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(+t.amount || 0), 0));
  }
  const avg = m6.reduce((a, b) => a + b, 0) / (m6.filter(Boolean).length || 1);
  fc.textContent = 'توقّع الشهر الجاي (متوسط آخر ٦ شهور): ' + money(avg) + ' — رقم تقديري من بياناتك بس.';
  box.appendChild(fc);

  const btn = document.createElement('button');
  btn.className = 'b p';
  btn.style.marginTop = '12px';
  btn.textContent = '＋ معاملة';
  btn.onclick = () => addTxn();
  box.appendChild(btn);

  const parse = document.createElement('button');
  parse.className = 'b';
  parse.style.marginTop = '12px';
  parse.textContent = '📝 سجّل بالكلام';
  parse.onclick = () => quickExpenses();
  box.appendChild(parse);
}

Object.assign(window, { renderMoneyOverview });
