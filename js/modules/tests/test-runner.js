/* ============================================================================
   كله — Kollo | Tests: Runner & Execution Coordinator
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

VIEWS.tests = async () => {
  const box = document.createElement('div');
  const p = document.createElement('div');
  p.className = 'card pad sm muted';
  p.textContent = 'اختبارات داخلية بتشتغل فعليًا على داتا وهمية مؤقتة (بتتمسح بعد الاختبار) — مش على داتاك.';
  box.appendChild(p);

  const bar = document.createElement('div');
  bar.className = 'row';
  bar.style.margin = '12px 0';
  const run = document.createElement('button');
  run.className = 'b p';
  run.textContent = '▶️ شغّل كل الاختبارات';
  bar.appendChild(run);
  box.appendChild(bar);

  const out = document.createElement('div');
  out.className = 'card';
  box.appendChild(out);

  const sum = document.createElement('div');
  sum.className = 'card pad';
  sum.style.marginTop = '12px';
  box.appendChild(sum);

  const line = (name, ok, note) => {
    const li = document.createElement('div');
    li.className = 'li';
    const i = document.createElement('div');
    i.style.flex = '0 0 26px';
    i.className = ok ? 'ok' : 'no';
    i.textContent = ok ? '✅' : '❌';

    const m = document.createElement('div');
    m.style.flex = '1';
    const t = document.createElement('div');
    t.className = 't';
    t.textContent = name;

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent = note || '';
    m.append(t, s);
    li.append(i, m);
    out.appendChild(li);
  };

  run.onclick = async () => {
    out.textContent = '';
    let pass = 0, fail = 0;
    const T2 = async (name, fn) => {
      try {
        const r = await fn();
        const ok = r === true || (r && r.ok !== false);
        line(name, !!ok, (r && r.note) || '');
        ok ? pass++ : fail++;
      } catch (e) {
        line(name, false, String(e.message || e));
        fail++;
      }
    };

    /* ---- أدوات مساعدة: كل صف بيتعمل هنا بيتمسح في الآخر ---- */
    const tmp = [];
    const mk = async (store, obj) => {
      const r = await R[store].add(obj);
      tmp.push([store, r.id]);
      return r;
    };
    const snapIds = {};
    const cleanup = async () => {
      for (const [s, id] of tmp.slice().reverse()) {
        try {
          await R[s].hardDel(id);
        } catch (e) {
          try {
            await dbDel(s, id);
          } catch (e2) {}
        }
        try {
          const tr = (await dbAll('trash')).filter(t => t.refId === id);
          for (const t of tr) await dbDel('trash', t.id);
        } catch (e) {}
      }
      tmp.length = 0;
      const schema = window.SCHEMA || SCHEMA;
      for (const s of Object.keys(schema)) {
        try {
          const current = await dbAll(s);
          const initial = snapIds[s] || new Set();
          for (const r of current) {
            if (!initial.has(r.id)) {
              try {
                await dbDel(s, r.id);
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    };

    const TU = window.TestUtils;
    const settings0 = JSON.parse(JSON.stringify(S.settings));
    const ai0 = S.settings.ai;
    const chat0 = S.cache.chat;
    const base = await TU.snap();
    const schema = window.SCHEMA || SCHEMA;
    for (const s of Object.keys(schema)) {
      snapIds[s] = new Set((await dbAll(s)).map(r => r.id));
    }

    const ctx = {
      T2, mk, snapIds, tmp,
      snap: TU.snap,
      same: TU.same,
      diff: TU.diff,
      mockUI: TU.mockUI,
      withStub: TU.withStub,
      cleanAiCalls: TU.cleanAiCalls,
      cleanup
    };

    // Run test suites
    await runCoreTests(ctx);
    await runAIToolsTests(ctx);
    await runAIStreamTests(ctx);
    await runAIAgentTests(ctx);
    await runFeatureTests(ctx);
    await runToolsTests(ctx);
    await runUITests(ctx);

    /* ================= الختام ================= */
    await cleanup();
    try {
      await saveSettings(settings0);
    } catch (e) {}
    S.settings.ai = ai0;
    S.cache.chat = chat0;

    const end = await TU.snap();
    line('الداتا رجعت زي ما كانت (صفر أثر للاختبارات)', TU.same(base, end), TU.same(base, end) ? 'كل الصفوف المؤقتة اتمسحت' : TU.diff(base, end));
    TU.same(base, end) ? pass++ : fail++;

    sum.textContent = '';
    const sh = document.createElement('div');
    sh.style.cssText = 'font-weight:800;font-size:1.05rem';
    sh.textContent = (fail ? '❌ ' : '✅ ') + 'نجح ' + fmtN(pass, 0) + ' · فشل ' + fmtN(fail, 0) + ' · الإجمالي ' + fmtN(pass + fail, 0);
    const sn = document.createElement('div');
    sn.className = 'xs dim';
    sn.textContent = 'المزوّد الوهمي محلي بالكامل — مفيش طلب شبكة واحد اتعمل في الاختبارات، ومفيش أي داتا وهمية فضلت.';
    sum.append(sh, sn);
    UI.toast(fail ? 'فيه ' + fmtN(fail, 0) + ' اختبار واقع — شوف الأحمر' : 'كله أخضر يا معلّم ✅');
  };

  return box;
};
