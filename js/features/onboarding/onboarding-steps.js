/* ============================================================================
   كله — Kollo | Feature: Onboarding Wizard Steps
   Renders content for each step of the onboarding wizard
   ============================================================================ */

function renderOnboardingStep(body, step, data, AREAS, finish) {
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
        c.classList.toggle('on', data.areas.indexOf(a) > -1);
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
}

Object.assign(window, { renderOnboardingStep });
