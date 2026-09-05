/* ============================================================================
   كله — Kollo | Feature: First-Run Onboarding Wizard
   Step-by-step setup modal for name, currency, life areas, first goal, and AI
   ============================================================================ */

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

    const paint = () => {
      dots.textContent = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('span');
        d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + (i <= step ? 'var(--acc)' : 'var(--line)');
        dots.appendChild(d);
      }
      body.textContent = '';
      next.textContent = step === total - 1 ? 'يلا نبدأ' : 'كمّل';
      renderOnboardingStep(body, step, data, AREAS, finish);
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

Object.assign(window, { firstRunWizard });
