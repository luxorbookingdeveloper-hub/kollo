/* ============================================================================
   كله — Kollo | Application Bootstrap & Lifecycle
   Initialization sequence, error boundaries, and afterBoot tasks
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
  Boot, idle, bootFail, afterBoot, boot
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
