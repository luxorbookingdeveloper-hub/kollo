/* ============================================================================
   كله — Kollo | Feature: Global Keyboard Shortcuts
   Cmd+K, Cmd+Z/Shift+Z, Quick numbers 1-9, Focus mode, Theme toggle
   ============================================================================ */
function bindShortcuts() {
  let lastSpace = 0;
  const typing = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

  document.addEventListener('keydown', async e => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      return openPalette();
    }
    if (meta && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey && typeof Hist.redo === 'function') {
        const b = await Hist.redo();
        UI.toast(b ? 'رجّعنا تاني: ' + b.label : 'مفيش حاجة نعيدها');
      } else {
        const b = await Hist.undo();
        UI.toast(b ? 'رجّعنا: ' + b.label : 'مفيش حاجة نرجّعها');
      }
      try {
        Bus.emit('data');
        Router.render();
      } catch (x) {}
      return;
    }
    if (typing(e.target)) return;
    if (e.key === ' ') {
      const n = Date.now();
      if (n - lastSpace < 420) {
        e.preventDefault();
        lastSpace = 0;
        return openPalette();
      }
      lastSpace = n;
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      return openPalette();
    }
    if (e.key === '?') {
      e.preventDefault();
      return shortcutsSheet();
    }
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      return cycleTheme();
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      return startFocus();
    }
    if (/^[1-9]$/.test(e.key)) {
      const vis = MODULES.filter(m => S.settings.modules[m.k] !== false);
      const m = vis[+e.key - 1];
      if (m) {
        e.preventDefault();
        Router.go(m.k);
      }
    }
  });

  /* اقفل الطبقة اللي فوق بالـEscape لو الشاشة نفسها مقفلتهاش */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (typeof closeDrawer === 'function') closeDrawer();
    const l = $('#layers');
    if (l && !l.children.length && document.body.classList.contains('focus-on')) {
      document.body.classList.remove('focus-on');
    }
  });
}

function shortcutsSheet() {
  const b = document.createElement('div');
  b.appendChild(
    mdLite(
      [
        '**Ctrl/Cmd + K** — كومَند باليت وبحث وإدخال حر',
        '**Space مرتين** — شنطة الطوارئ (نفس الباليت)',
        '**Ctrl/Cmd + Z** — تراجع · **Ctrl/Cmd + Shift + Z** — إعادة',
        '**١ إلى ٩** — تنقّل بين المودولات الظاهرة',
        '**/** — بحث · **?** — الشاشة دي · **T** — تغيير الثيم · **F** — وضع التركيز',
        '**Esc** — اقفل أي طبقة مفتوحة'
      ].join('\n')
    )
  );
  UI.sheet({ title: 'اختصارات الكيبورد', body: b, actions: [{ label: 'تمام', kind: 'p' }] });
}

Object.assign(window, {
  bindShortcuts, shortcutsSheet
});
