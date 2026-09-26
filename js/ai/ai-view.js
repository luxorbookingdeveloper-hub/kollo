/* ============================================================================
   كله — Kollo | Module: AI Chat Interface (شاشة الأسطى)
   Conversation view, chips, and interaction coordinator
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

window.VIEWS.ai = async () => {
  const box = document.createElement('div');
  const s = S.settings.ai;

  if (!s.model || !(s.keyPlain || s.keyEnc)) {
    const c = document.createElement('div');
    c.className = 'card pad';
    const h = document.createElement('h2');
    h.style.cssText = 'font-weight:800;font-size:1.1rem';
    h.textContent = 'الأسطى مستني مفتاحك';

    const p = document.createElement('p');
    p.className = 'muted sm';
    p.textContent =
      'الأسطى محرّك ذكاء كامل جوه التطبيق: بيقرا داتاك الحقيقية، بينفّذ بالتولز، وبيقولك مصدر كل رقم. محتاج مفتاح API واحد بس، وبيتخزّن على جهازك.';

    const b = document.createElement('button');
    b.className = 'b p';
    b.textContent = '🔧 افتح إعدادات المحرّك';
    b.onclick = () => Router.go('settings?tab=ai');

    c.append(h, p, b);
    box.appendChild(c);

    const ex = document.createElement('div');
    ex.className = 'card pad sm muted';
    ex.style.marginTop = '12px';
    ex.textContent =
      'أمثلة لما يشتغل: «رتّب لي أجندة الأسبوع» · «صرفت ٤٥ قهوة و٢٠ مواصلات» · «فهّمني فين فلوسي بتروح» · «مراجعة أسبوعية».';
    box.appendChild(ex);

    return box;
  }

  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.cssText = 'display:flex;flex-direction:column;min-height:62vh';

  const log = document.createElement('div');
  log.style.cssText = 'flex:1;overflow:auto;padding:14px;display:grid;gap:10px;align-content:start';
  log.setAttribute('aria-live', 'polite');

  const st = document.createElement('div');
  st.className = 'xs dim';
  st.style.padding = '0 14px';

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)';

  const ta = document.createElement('textarea');
  ta.className = 'in';
  ta.rows = 1;
  ta.style.minHeight = '44px';
  ta.placeholder = 'اكتب للأسطى… (Enter يبعت، Shift+Enter سطر جديد)';

  const send = document.createElement('button');
  send.className = 'b p';
  send.textContent = 'ابعت';

  const stop = document.createElement('button');
  stop.className = 'b d';
  stop.textContent = 'كفاية';
  stop.hidden = true;

  const resetBtn = document.createElement('button');
  resetBtn.className = 'b g sm';
  resetBtn.title = 'محادثة جديدة';
  resetBtn.setAttribute('aria-label', 'محادثة جديدة');
  resetBtn.textContent = '🔄';
  resetBtn.onclick = () => {
    AI.chatId = uid();
    S.cache.chat = [];
    log.textContent = '';
    msg('a', 'بدأنا محادثة جديدة. اسألني عن داتاك أو قولي أعمل إيه.');
  };
  bar.prepend(resetBtn);

  bar.append(ta, send, stop);
  wrap.append(log, st, bar);
  box.appendChild(wrap);

  const chips = document.createElement('div');
  chips.className = 'row wrap';
  chips.style.marginTop = '10px';

  ['رتّب لي أجندة الأسبوع', 'فهّمني فين فلوسي بتروح الشهر ده', 'مراجعة أسبوعية', 'إيه اللي فاتني؟', 'اعمل خطة لأهم مهمة عندي'].forEach(t => {
    const c = document.createElement('button');
    c.className = 'chip';
    c.textContent = t;
    c.onclick = () => {
      ta.value = t;
      go();
    };
    chips.appendChild(c);
  });
  box.appendChild(chips);

  const { msg, ui } = window.createAIChatUI(log, st, stop, send);

  if (!S.cache.chat || !S.cache.chat.length) {
    try {
      const chats = await R.aiChats.all();
      const latest = chats.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
      if (latest) {
        AI.chatId = latest.id;
        const saved = (await R.aiMessages.byIndex('chatId', IDBKeyRange.only(latest.id)))
          .sort((a, b) => (a.at || '').localeCompare(b.at || ''))
          .slice(-30);
        if (saved.length) S.cache.chat = saved.map(m => ({ role: m.role, content: m.content }));
      }
    } catch (e) {}
  }

  (S.cache.chat || []).forEach(m => msg(m.role === 'user' ? 'u' : 'a', m.content || ''));
  if (!(S.cache.chat || []).length) {
    msg('a', 'أهلاً. أنا الأسطى. اسألني عن داتاك، أو قولي أعمل إيه — وهنفّذ وأوريك كل خطوة. مش بختلق أرقام: كل رقم من داتاك المسجّلة.');
  }

  AI.chatId = AI.chatId || uid();

  async function go() {
    const t = ta.value.trim();
    if (!t || AI.busy) return;
    ta.value = '';
    msg('u', t);
    AI.busy = true;
    await agentRun(t, ui);
    AI.busy = false;
    ui.status(null);
    send.disabled = false;
  }

  send.onclick = go;
  stop.onclick = () => {
    if (AI.abort) AI.abort.abort();
    ui.status(null);
    AI.busy = false;
  };

  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      go();
    }
  });

  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
  });

  return box;
};
