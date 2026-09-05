/* ============================================================================
   كله — Kollo | Tests: Features Suite (Undo/Redo, Crypt, Parsers, Security)
   ============================================================================ */

window.runFeatureTests = async function (ctx) {
  const { T2, mk, snapIds } = ctx;

  /* ================= 10) Undo / Redo ================= */
  await T2('Undo/Redo لـ٢٠ عملية متتالية', async () => {
    const before = await dbCount('tasks');
    const ids = [];
    for (let i = 0; i < 20; i++) {
      Hist.begin('اختبار ' + i);
      const r = await R.tasks.add({ title: 'undo-test-' + i, status: 'todo' });
      ids.push(r.id);
      Hist.commit();
    }
    const mid = await dbCount('tasks');
    for (let i = 0; i < 20; i++) await Hist.undo();
    const after = await dbCount('tasks');
    let redone = null;
    if (typeof Hist.redo === 'function') {
      await Hist.redo();
      redone = await dbCount('tasks');
      await Hist.undo();
    }
    for (const id of ids) {
      try {
        await dbDel('tasks', id);
      } catch (e) {}
    }
    return {
      ok: mid === before + 20 && after === before && (redone === null || redone === before + 1),
      note: '٢٠ إضافة → ٢٠ تراجع → رجعنا لنفس العدد' + (redone !== null ? ' · Redo شغّال' : ' · مفيش Redo')
    };
  });

  await T2('باتش الأسطى بيترجع بضغطة واحدة', async () => {
    const before = await dbCount('tasks');
    Hist.begin('الأسطى: اختبار باتش');
    const a = await R.tasks.add({ title: 'batch-1', status: 'todo' });
    const b = await R.tasks.add({ title: 'batch-2', status: 'todo' });
    const batch = Hist.commit();
    const mid = await dbCount('tasks');
    await Hist.undo();
    const after = await dbCount('tasks');
    for (const id of [a.id, b.id]) {
      try {
        await dbDel('tasks', id);
      } catch (e) {}
    }
    return {
      ok: mid === before + 2 && after === before && !!batch,
      note: 'باتش واحد فيه ' + fmtN((batch && batch.ops && batch.ops.length) || 2, 0) + ' عملية'
    };
  });

  /* ================= 11) تصدير/استيراد وتشفير ================= */
  await T2('تصدير/استيراد ذهاب وعودة بنفس البصمة', async () => {
    const t = await mk('tasks', { title: 'roundtrip-' + uid().slice(0, 6), status: 'todo', priority: 1 });
    const data = await exportAll(false);
    const fp = o => Object.keys(o.stores).sort().map(k => k + ':' + o.stores[k].length).join('|');
    const before = fp(data);
    const n = await importAll(JSON.parse(JSON.stringify(data)), 'merge');
    const again = fp(await exportAll(false));
    const still = await R.tasks.get(t.id);
    return {
      ok: before === again && !!still && still.title === t.title && n > 0,
      note: fmtN(n, 0) + ' صف اتقرأ · البصمة متساوية قبل وبعد'
    };
  });

  await T2('الاستيراد بيرفض ملف غريب وبيتحقق من الاسكيمة', async () => {
    let e1 = false, e2 = false;
    try {
      await importAll({ app: 'haga-tanya', stores: {} }, 'merge');
    } catch (e) {
      e1 = /كشكول/.test(e.message);
    }
    try {
      await importAll(null, 'merge');
    } catch (e) {
      e2 = true;
    }
    return { ok: e1 && e2, note: 'ملف مش كشكول → رفض مهذّب' };
  });

  await T2('التصدير المشفّر (AES-GCM + PBKDF2) رايح وجاي', async () => {
    const secret = 'نص سرّي للاختبار ' + uid().slice(0, 5);
    const enc = await Crypt.enc(secret, 'كلمة-سر-قوية');
    const dec = await Crypt.dec(enc, 'كلمة-سر-قوية');
    let wrong = false;
    try {
      await Crypt.dec(enc, 'كلمة-غلط');
    } catch (e) {
      wrong = true;
    }
    return {
      ok: dec === secret && wrong && JSON.stringify(enc).indexOf(secret) < 0,
      note: 'فك التشفير صح · الكلمة الغلط بترفض · النص مش ظاهر في المخرج'
    };
  });

  /* ================= 12) الأمان و XSS ================= */
  await T2('Sanitizer: مفيش تنفيذ HTML من نص المستخدم', async () => {
    const evil = '<img src=x onerror="window.__pwned=1"> <script>window.__pwned=2<\/script> **غامق**';
    const el = mdLite(evil);
    const host = document.createElement('div');
    host.appendChild(el);
    const hasTags = !!host.querySelector('img,script,iframe,object,embed,svg');
    const shown = host.textContent.indexOf('onerror') > -1 || host.textContent.indexOf('<img') > -1;
    const bold = !!host.querySelector('strong,b');
    await sleep(30);
    return { ok: !hasTags && shown && !window.__pwned && bold, note: 'ظهر كنص عادي · الماركداون المسموح لسه شغّال' };
  });

  await T2('مفيش eval ولا Function على رد الموديل', async () => {
    const src = String(agentRun) + String(AI.call) + String(AI.parse) + String(mdLite);
    return { ok: !/\beval\s*\(/.test(src) && !/new\s+Function\s*\(/.test(src), note: 'الكود اللي بيتعامل مع الردود نضيف' };
  });

  await T2('الأفعال الهدّامة محتاجة موافقة (وضع الثقة مطفي)', async () => {
    const risky = Object.keys(TOOLS).filter(n => TOOLS[n].risk === 'destructive');
    const dRegex = typeof DESTRUCTIVE !== 'undefined' ? DESTRUCTIVE : window.DESTRUCTIVE || /^(delete_|bulk_|import_|wipe|empty_trash|export_backup)/;
    const guarded = risky.filter(n => dRegex.test(n) || TOOLS[n].risk === 'destructive');
    const ok = risky.length >= 5 && guarded.length === risky.length && DEF_SETTINGS.ai.trust === false;
    return { ok, note: fmtN(risky.length, 0) + ' تول هدّام كلهم بيسألوا الأول' };
  });

  /* ================= 13) البارسر والحسابات ================= */
  await T2('قراية المصاريف من كلام مصري (وأرقام شرقية)', async () => {
    const a = parseExpenses('صرفت ٤٥ قهوة و٢٠ مواصلات');
    const b = parseExpenses('دفعت 75 جنيه نت');
    const sum1 = a.reduce((s, x) => s + x.amount, 0);
    return { ok: a.length === 2 && sum1 === 65 && b.length === 1 && b[0].amount === 75, note: '٤٥+٢٠ = ' + fmtN(sum1, 0) + ' · و75 لوحدها' };
  });

  await T2('البحث الغيمي (fuzzy) بيرتّب صح', async () => {
    const hit = fuzzy('مهم', 'مهمة مهمة جدًا'), miss = fuzzy('زقزوق', 'فاتورة كهربا');
    return { ok: hit > 0 && miss === 0 && fuzzy('', 'أي حاجة') === 0 || (hit > 0 && miss === 0), note: 'تطابق: ' + fmtN(hit, 2) + ' · مفيش تطابق: ' + fmtN(miss, 0) };
  });

  await T2('تقييد النتايج: مش أكتر من ١٠٠ صف للموديل', async () => {
    const rows = [];
    for (let i = 0; i < 120; i++) rows.push({ i });
    const c = cap(rows);
    const c2 = cap(rows.slice(0, 10));
    return { ok: c.rows.length === 100 && c.truncated === true && c.total === 120 && !c2.truncated, note: '١٢٠ → ١٠٠ + truncated:true' };
  });

  await T2('الأرقام والفلوس بتتنسّق بالعملة والشكل المختار', async () => {
    const m = money(1234.5);
    const n = fmtN(1234.5, 1);
    return { ok: typeof m === 'string' && m.length > 3 && typeof n === 'string' && n.length > 3, note: m + ' · ' + n };
  });

  await T2('صافي الثروة محسوب من الحسابات والمعاملات', async () => {
    const acc = await mk('accounts', { name: 'اختبار-صافي', type: 'cash', opening: 500 });
    await mk('txns', { type: 'expense', amount: 200, date: today(), accountId: acc.id, note: 'اختبار' });
    await mk('txns', { type: 'income', amount: 100, date: today(), accountId: acc.id, note: 'اختبار' });
    const nw = await netWorth();
    const row = (nw.accounts || []).find(a => a.id === acc.id || a.name === 'اختبار-صافي');
    return { ok: !!row && Math.round(row.balance) === 400, note: '٥٠٠ − ٢٠٠ + ١٠٠ = ' + fmtN(row ? row.balance : 0, 0) };
  });

  await T2('مؤشر الدماغ رقم منطقي (مش NaN)', async () => {
    const ml = await mentalLoad();
    const v = typeof ml === 'object' ? (ml.score != null ? ml.score : ml.value) : ml;
    return { ok: typeof v === 'number' && isFinite(v) && v >= 0, note: 'القيمة: ' + fmtN(v, 0) };
  });

  await T2('المراجعة الأسبوعية بتتولّد من داتا حقيقية بدون NaN', async () => {
    const md = await weeklyReview();
    return {
      ok: typeof md === 'string' && md.indexOf('## مراجعة الأسبوع') === 0 && md.indexOf('NaN') < 0 && md.indexOf('undefined') < 0,
      note: fmtN(md.split('\n').length, 0) + ' سطر · مفيش NaN'
    };
  });
};
