/* ============================================================================
   كله — Kollo | Module: Settings (الإعدادات العامة وإعدادات الذكاء الاصطناعي)
   Preferences, AI model configuration, module toggles, privacy & storage
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.settings = async () => {
  const box = document.createElement('div');
  const tab = (S.route && S.route.params && S.route.params.tab) || 'general';

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.marginBottom = '12px';

  [['general', 'عام'], ['ai', 'محرّك الأسطى'], ['modules', 'المودولات'], ['privacy', 'الخصوصية'], ['auth', 'الدخول']].forEach(([v, l]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-selected', tab === v ? 'true' : 'false');
    b.textContent = l;
    b.onclick = () => {
      location.hash = '#/settings?tab=' + v;
    };
    seg.appendChild(b);
  });
  box.appendChild(seg);

  if (tab === 'general') {
    renderGeneralSettings(box);
  } else if (tab === 'ai') {
    box.appendChild(await aiSettings());
  } else if (tab === 'modules') {
    renderModulesSettings(box);
  } else if (tab === 'privacy') {
    await renderPrivacySettings(box);
  } else {
    renderAuthPlaceholder(box);
  }

  return box;
};
