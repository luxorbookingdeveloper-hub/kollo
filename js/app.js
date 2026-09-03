/* ============================================================================
   كله — Kollo | Application Bootstrap & Lifecycle
   Initialization sequence, First-run onboarding wizard, error boundaries, and afterBoot tasks
   ============================================================================ */
const Boot = { done: false, errors: [] };

function idle(fn, ms) {
  return 'requestIdleCallback' in window
    ? requestIdleCallback(fn, { timeout: ms || 1500 })
    : setTimeout(fn, ms || 300);
}

function bootFail(msg) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:24px;text-align:center;background:#0d1b2a;color:#f4efe6;font-family:system-ui,sans-serif';
  const h = document.createElement('div');
  h.style.cssText = 'font-size:1.2rem;font-weight:800;margin-bottom:8px';
  h.textContent = 'كله مش قادر يفتح';
  const p = document.createElement('div');
  p.style.cssText = 'max-width:520px;line-height:1.8;opacity:.85';
  p.textContent = msg;
  const b = document.createElement('button');
  b.textContent = 'جرّب تاني';
  b.style.cssText = 'margin-top:16px;min-height:44px;padding:0 18px;border-radius:12px;border:0;cursor:pointer';
  b.onclick = () => location.reload();
  const w = document.createElement('div');
  w.append(h, p, b);
  el.appendChild(w);
  document.body.appendChild(el);
}

/* ---- ويزارد أول تشغيل ---- */
function firstRunWizard() {
  return new Promise(resolve => {
    const layers = $('#layers') || document.body;
    const bd = document.createElement('div');
    bd.className = 'sheet-bd';
    const w = document.createElement('div');
    w.className = 'card';
    w.setAttribute('role', 'dialog');
    w.setAttribute('aria-modal', 'true');
    w.setAttribute('aria-label', 'أول مرة في كله');
    w.style.cssText =
      'position:fixed;z-index:96;inset-inline:0;inset-block-end:0;margin-inline:auto;width:min(560px,96vw);max-height:92vh;overflow:auto;padding:18px;border-start-start-radius:22px;border-start-end-radius:22px';

    const dots = document.createElement('div');
    dots.className = 'row';
    dots.style.justifyContent = 'center';
    dots.style.gap = '6px';

    const body = document.createElement('div');
    body.style.marginTop = '14px';

    const nav = document.createElement('div');
    nav.className = 'row';
    nav.style.marginTop = '16px';

    const skip = document.createElement('button');
    skip.className = 'b g';
    skip.textContent = 'عدّيها';

    const next = document.createElement('button');
    next.className = 'b p';
    next.style.marginInlineStart = 'auto';

    nav.append(skip, next);
    w.append(dots, body, nav);
    layers.append(bd, w);

    requestAnimationFrame(() => {
      bd.classList.add('in');
      w.classList.add('in');
    });

    const data = { name: '', currency: 'EGP', areas: [], goal: '' };
    const AREAS = ['شغل', 'صحة', 'فلوس', 'أهل', 'تعلّم', 'روحاني', 'ترفيه'];
    let step = 0;
    const total = 5;

    const fld = (label, el, hint) => {
      const d = document.createElement('div');
      d.className = 'fld';
      const l = document.createElement('label');
      l.textContent = label;
      d.append(l, el);
      if (hint) {
        const h = document.createElement('div');
        h.className = 'xs dim';
        h.textContent = hint;
        d.appendChild(h);
      }
      return d;
    };

    const head = (t, s) => {
      const d = document.createElement('div');
      const a = document.createElement('div');
      a.style.cssText = 'font-weight:800;font-size:1.15rem';
      a.textContent = t;
      const b = document.createElement('div');
      b.className = 'sm muted';
      b.textContent = s;
      d.append(a, b);
      return d;
    };

    const paint = () => {
      dots.textContent = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('span');
        d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + (i <= step ? 'var(--acc)' : 'var(--line)');
        dots.appendChild(d);
      }
      body.textContent = '';
      next.textContent = step === total - 1 ? 'يلا نبدأ' : 'كمّل';

      if (step === 0) {
        body.appendChild(head('أهلاً بيك في كله', 'مدير حياتك اللي مش بينسى. خمس خطوات صغيرة وتقدر تعدّيهم كلهم.'));
        const i = document.createElement('input');
        i.className = 'in';
        i.value = data.name;
        i.placeholder = 'اسمك';
        i.setAttribute('aria-label', 'اسمك');
        i.oninput = () => (data.name = i.value);
        body.appendChild(fld('ننده لك إيه؟', i, 'الأسطى هيستخدم الاسم ده في الكلام معاك.'));
        setTimeout(() => i.focus(), 60);
      } else if (step === 1) {
        body.appendChild(head('العملة', 'كود ISO من ٣ حروف زي EGP أو SAR أو USD.'));
        const i = document.createElement('input');
        i.className = 'in';
        i.value = data.currency;
        i.maxLength = 3;
        i.setAttribute('aria-label', 'العملة');
        i.oninput = () => (data.currency = i.value.toUpperCase());
        body.appendChild(fld('عملتك', i, 'تقدر تغيّرها بعدين من الإعدادات.'));
      } else if (step === 2) {
        body.appendChild(head('إيه اللي يهمك؟', 'اللي متختاره هيتخفي من القوايم — وترجّعه في أي وقت.'));
        const row = document.createElement('div');
        row.className = 'row wrap';
        row.style.marginTop = '10px';
        AREAS.forEach(a => {
          const c = document.createElement('button');
          c.className = 'chip' + (data.areas.indexOf(a) > -1 ? ' on' : '');
          c.textContent = a;
          c.onclick = () => {
            const ix = data.areas.indexOf(a);
            if (ix > -1) data.areas.splice(ix, 1);
            else data.areas.push(a);
            paint();
          };
          row.appendChild(c);
        });
        body.appendChild(row);
      } else if (step === 3) {
        body.appendChild(head('أول هدف', 'هدف واحد واضح أحسن من عشرة مظبّبين. اكتبه بجملة قصيرة.'));
        const i = document.createElement('input');
        i.className = 'in';
        i.value = data.goal;
        i.placeholder = 'مثال: أقرأ كل يوم نص ساعة';
        i.setAttribute('aria-label', 'أول هدف');
        i.oninput = () => (data.goal = i.value);
        body.appendChild(fld('الهدف', i, 'هنسجّله كهدف حقيقي، وتقدر تضيف له نتايج قابلة للقياس بعدين.'));
      } else {
        body.appendChild(
          head(
            'الأسطى (اختياري)',
            'التطبيق كامل وشغّال من غير ذكاء اصطناعي. لو ربطت مفتاحك، الأسطى بيقرا داتاك وينفّذ بالأوامر.'
          )
        );
        const p = document.createElement('div');
        p.className = 'sm muted';
        p.textContent =
          'المفتاح بيتخزّن على جهازك جوه المتصفح، وممكن تقفله بكلمة سر. مفيش أي طلب شبكة في التطبيق غير نداء المزوّد اللي إنت تختاره.';
        const b = document.createElement('button');
        b.className = 'b';
        b.style.marginTop = '10px';
        b.textContent = '🔧 أربط المفتاح دلوقتي';
        b.onclick = async () => {
          await finish();
          Router.go('settings?tab=ai');
        };
        body.append(p, b);
      }
    };

    const close = () => {
      bd.classList.remove('in');
      w.classList.remove('in');
      setTimeout(() => {
        bd.remove();
        w.remove();
      }, 240);
      document.removeEventListener('keydown', onk);
      resolve();
    };

    const finish = async () => {
      const patch = { onboarded: true };
      if (data.name.trim()) patch.name = data.name.trim();
      if (/^[A-Z]{3}$/.test(data.currency)) patch.currency = data.currency;
      if (data.areas.length) {
        const m = Object.assign({}, S.settings.modules);
        const map = {
          شغل: 'work',
          صحة: 'health',
          فلوس: 'money',
          أهل: 'people',
          تعلّم: 'learn',
          روحاني: 'spirit',
          ترفيه: 'notes'
        };
        Object.keys(map).forEach(k => {
          if (AREAS.indexOf(k) > -1 && data.areas.indexOf(k) < 0 && map[k] !== 'notes') m[map[k]] = false;
        });
        patch.modules = m;
        patch.areas = data.areas.slice();
      }
      try {
        await saveSettings(patch);
      } catch (e) {}
      if (data.goal.trim()) {
        try {
          Hist.begin('أول هدف');
          await R.goals.add({
            title: data.goal.trim(),
            area: data.areas[0] || 'شغل',
            horizon: 'quarter',
            status: 'active'
          });
          Hist.commit();
        } catch (e) {}
      }
      try {
        if (typeof buildNav === 'function') buildNav();
      } catch (e) {}
      close();
      try {
        Router.render();
      } catch (e) {}
      UI.toast('اتفضّل — البيت بيتك 🏠');
    };

    next.onclick = async () => {
      if (step < total - 1) {
        step++;
        paint();
      } else await finish();
    };
    skip.onclick = async () => {
      if (step < total - 1) {
        step++;
        paint();
      } else await finish();
    };

    const onk = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      } else if (e.key === 'Enter' && step < total - 1) {
        e.preventDefault();
        step++;
        paint();
      }
    };
    document.addEventListener('keydown', onk);
    paint();
  });
}

/* ---- ما بعد أول رسم ---- */
async function afterBoot() {
  try {
    if (S.settings.autoRun !== false) {
      const done = await Auto.run(false);
      if (done && done.length) {
        Bus.emit('data');
        UI.toast('الحبشتكنات نفّذت ' + fmtN(done.length, 0) + ' إجراء');
      }
    }
  } catch (e) {}
  try {
    await remindersCheck();
  } catch (e) {}
  try {
    await Badges.check(true);
  } catch (e) {}
  try {
    await nudgeCheck();
  } catch (e) {}
  try {
    await memoryCheck();
  } catch (e) {}
  try {
    const h = new Date().getHours();
    if (h >= 21 && typeof dailyShutdown === 'function' && String(S.settings.lastShutdown || '') !== today()) {
      UI.toast('الليلة قربت تخلص — نعمل الحساب الختامي؟');
    }
  } catch (e) {}
}

/* ---- الإقلاع الرئيسي ---- */
async function boot() {
  if (Boot.done) return;
  Boot.done = true;

  window.addEventListener('error', e => {
    Boot.errors.push(String(e.message || ''));
    try {
      UI.toast('حصلت مشكلة غير متوقّعة — الداتا مكانها ومحفوظة');
    } catch (x) {}
  });

  window.addEventListener('unhandledrejection', e => {
    const m = String((e.reason && e.reason.message) || e.reason || '');
    Boot.errors.push(m);
    try {
      UI.toast('عملية مكملتش: ' + m.slice(0, 90));
    } catch (x) {}
  });

  try {
    if (typeof openDB === 'function') await openDB();
    else if (typeof DB !== 'undefined' && DB && typeof DB.open === 'function') await DB.open();
    else if (typeof initDB === 'function') await initDB();
  } catch (e) {
    return bootFail(
      'مش قادر أفتح قاعدة البيانات المحلية: ' +
        (e.message || e) +
        '. لو المتصفح في وضع التخفي، التخزين بيبقى مقفول — افتح نافذة عادية.'
    );
  }

  try {
    if (typeof loadSettings === 'function') await loadSettings();
  } catch (e) {}

  try {
    if (typeof applyTheme === 'function') applyTheme();
    else document.documentElement.setAttribute('data-theme', S.settings.theme || 'auto');
  } catch (e) {}

  try {
    document.documentElement.classList.toggle('big-text', !!S.settings.bigText);
  } catch (e) {}

  try {
    if (typeof buildNav === 'function') buildNav();
  } catch (e) {}

  try {
    if (typeof Router.start === 'function') Router.start();
    else if (typeof Router.init === 'function') Router.init();
    else {
      window.addEventListener('hashchange', () => Router.render());
      if (!location.hash) location.hash = '#/today';
      Router.render();
    }
  } catch (e) {
    return bootFail('الراوتر مقدرش يشتغل: ' + (e.message || e));
  }

  bindShortcuts();
  bindEggs();

  try {
    if (!S.settings.onboarded) await firstRunWizard();
  } catch (e) {}

  idle(() => {
    afterBoot();
  }, 2500);
}

Object.assign(window, {
  Boot, idle, bootFail, firstRunWizard, afterBoot, boot
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
