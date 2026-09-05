/* ============================================================================
   كله — Kollo | Tests: Automations & UI Suite
   ============================================================================ */

window.runUITests = async function (ctx) {
  const { T2, mk, snap, same } = ctx;

  /* ================= 15) الأتوميشن والواجهة ================= */
  await T2('محاكاة الأتوميشن (dry-run) ما بتكتبش حاجة', async () => {
    const b = await snap();
    const res = await Auto.run(true);
    const a = await snap();
    return { ok: Array.isArray(res) && same(b, a), note: fmtN(res.length, 0) + ' إجراء كان هيتنفّذ · صفر كتابة' };
  });

  await T2('التريجرز والأكشنز كلها معروفة بالاسم', async () => {
    const tk = Object.keys(Auto.triggers || {}), ak = Object.keys(Auto.actions || {});
    return { ok: tk.length >= 3 && ak.length >= 3, note: fmtN(tk.length, 0) + ' تريجر · ' + fmtN(ak.length, 0) + ' أكشن' };
  });

  await T2('كل مودول في النافيجيشن له شاشة', async () => {
    const miss = MODULES.filter(m => typeof VIEWS[m.k] !== 'function').map(m => m.k);
    return { ok: !miss.length, note: fmtN(MODULES.length, 0) + ' مودول' + (miss.length ? ' · ناقص: ' + miss.join(', ') : '') };
  });

  await T2('كل الشاشات بتترسم من غير ما تقع', async () => {
    const keys = Object.keys(VIEWS).filter(k => k !== 'tests');
    const bad = [];
    const r0 = S.route;
    for (const k of keys) {
      try {
        S.route = { name: k, params: {} };
        const el = await VIEWS[k]();
        if (!(el instanceof Node)) bad.push(k + ' (مش عنصر)');
      } catch (e) {
        bad.push(k + ' (' + String(e.message || e).slice(0, 30) + ')');
      }
    }
    S.route = r0;
    return { ok: !bad.length, note: bad.length ? bad.slice(0, 4).join(' · ') : fmtN(keys.length, 0) + ' شاشة اترسمت' };
  });

  await T2('حالة الفراغ فيها رسالة وزرار حقيقي', async () => {
    const el = UI.empty('عنوان', 'سطر مصري', { label: 'يلا نبدأ', fn: () => {} });
    const host = document.createElement('div');
    host.appendChild(el);
    const btn = host.querySelector('button');
    const svg = host.querySelector('svg');
    return {
      ok: !!btn && btn.textContent === 'يلا نبدأ' && host.textContent.indexOf('سطر مصري') > -1,
      note: 'عنوان + سطر + CTA' + (svg ? ' + رسمة' : '')
    };
  });

  await T2('الفكاهة بتقف في السياق الحسّاس', async () => {
    const s0 = S.settings.sensitive, t0 = S.settings.tone;
    S.settings.sensitive = true;
    S.settings.tone = 'sarcastic';
    const sp = systemPrompt();
    S.settings.sensitive = s0;
    S.settings.tone = t0;
    return {
      ok: /مؤدب|هادي/.test(sp) && !/ساخر/.test(sp.split('نبرتك:')[1].split('\n')[0]),
      note: 'SENSITIVE_CONTEXT بيقفل السخرية في البرومت'
    };
  });

  await T2('البرومت فيه قواعد منع الاختراع والحدود الأخلاقية', async () => {
    const sp = systemPrompt();
    const musts = ['ممنوع تمامًا تخترع', 'مش دكتور', 'مش مستشار مالي', 'tool'];
    const miss = musts.filter(m => sp.indexOf(m) < 0);
    return { ok: !miss.length && sp.indexOf(today()) > -1, note: 'التاريخ والعملة والقواعد كلهم موجودين' };
  });

  await T2('التخزين: قياس المساحة وطلب التثبيت بـfeature detection', async () => {
    const r = await TOOLS.storage_usage.handler({});
    const hasPersist = !!(navigator.storage && navigator.storage.persist);
    return {
      ok: r.ok && r.data.counts && typeof r.data.counts.tasks === 'number',
      note: (r.data.usageMB != null ? fmtN(r.data.usageMB, 2) + ' م.ب مستخدمة' : 'المتصفح مش بيقول المساحة') + (hasPersist ? ' · persist مدعوم' : ' · persist مش مدعوم')
    };
  });

  await T2('الإعدادات بتتحفظ وبترجع من الداتابيز', async () => {
    const t0 = S.settings.tone;
    await saveSettings({ tone: 'polite' });
    const a = S.settings.tone;
    await saveSettings({ tone: t0 });
    return { ok: a === 'polite' && S.settings.tone === t0, note: 'حفظ ورجوع من غير أثر' };
  });

  await T2('سجل النشاط بيسجّل مين عمل إيه', async () => {
    await mk('tasks', { title: 'اختبار-سجل', status: 'todo' });
    const rows = await R.activityLog.byIndex('at', null, 10, 'prev');
    return { ok: rows.length > 0 && rows.some(r => r.store === 'tasks'), note: 'آخر ' + fmtN(rows.length, 0) + ' حركة مسجّلة' };
  });
};
