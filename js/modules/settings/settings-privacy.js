/* ============================================================================
   كله — Kollo | Settings Module: Privacy & Auth Views
   ============================================================================ */

async function renderPrivacySettings(box) {
  const c = document.createElement('div');
  c.className = 'card pad';
  const h = document.createElement('h2');
  h.style.cssText = 'font-weight:800;font-size:1.05rem';
  h.textContent = 'خصوصيتك';

  const p = mdLite(
    [
      'كل داتاك محفوظة على جهازك في IndexedDB. مفيش سيرفر، مفيش تتبّع، مفيش analytics.',
      'التطبيق مش بيعمل أي طلب شبكة إلا لمزوّد الذكاء الاصطناعي اللي إنت اخترته، ولما تنده الأسطى بس.',
      'مفتاح الـAPI بيتخزّن على جهازك، وتقدر تشفّره بكلمة سر (AES-GCM + PBKDF2) — ساعتها بيتفتح مرة كل جلسة.',
      'النسخة الاحتياطية ملف عندك. لو حاسس إنها فيها حاجات حسّاسة، صدّرها مشفّرة بكلمة سر.',
      'المرفقات بتتخزّن Blob محلي. المتصفح ممكن يفضّي التخزين لو المساحة قلّت — اضغط الزر تحت عشان تطلب تخزين دايم.'
    ].join('\n\n')
  );
  c.append(h, p);

  const pb = document.createElement('button');
  pb.className = 'b';
  pb.textContent = '📌 اطلب تخزين دايم';
  pb.onclick = async () => {
    try {
      if (!navigator.storage || !navigator.storage.persist) {
        return UI.toast('المتصفح ده مش بيدعم الطلب ده');
      }
      const ok = await navigator.storage.persist();
      UI.toast(ok ? 'تمام — التخزين بقى دايم' : 'المتصفح مش موافق يثبّت التخزين — النسخة الاحتياطية بقت أهم');
    } catch (e) {
      UI.toast('مش قادر: ' + e.message);
    }
  };
  c.appendChild(pb);

  const est = document.createElement('div');
  est.className = 'xs dim';
  est.style.marginTop = '8px';
  try {
    const e = await navigator.storage.estimate();
    est.textContent = 'مستخدم: ' + fmtN((e.usage || 0) / 1048576, 2) + ' م.ب من ~' + fmtN((e.quota || 0) / 1048576, 0) + ' م.ب';
  } catch (e) {
    est.textContent = 'المتصفح مش بيقول حجم التخزين.';
  }
  c.appendChild(est);
  box.appendChild(c);
}

function renderAuthPlaceholder(box) {
  const c = document.createElement('div');
  c.className = 'card pad';
  const b = document.createElement('span');
  b.className = 'badge w';
  b.textContent = 'معطّلة حاليًا';

  const h = document.createElement('h2');
  h.style.cssText = 'font-weight:800;font-size:1.05rem';
  h.textContent = 'طبقة الدخول';

  const p = document.createElement('p');
  p.className = 'muted sm';
  p.textContent = 'الواجهة دي موجودة كشكل بس (AUTH_ENABLED = false). التطبيق كله محلي ومفيش حساب ولا سيرفر — الحقول مقفولة عن قصد.';
  c.append(h, b, p);

  ['البريد', 'كلمة السر'].forEach(l => {
    const w = document.createElement('div');
    w.className = 'fld';
    const lb = document.createElement('label');
    lb.textContent = l;
    const i = document.createElement('input');
    i.className = 'in';
    i.disabled = true;
    i.placeholder = '—';
    w.append(lb, i);
    c.appendChild(w);
  });

  const btn = document.createElement('button');
  btn.className = 'b p';
  btn.textContent = 'دخول';
  btn.disabled = true;
  c.appendChild(btn);
  box.appendChild(c);
}

Object.assign(window, {
  renderPrivacySettings,
  renderAuthPlaceholder
});
