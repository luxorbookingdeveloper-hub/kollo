/* ============================================================================
   كله — Kollo | Module: AI Chat Interface (شاشة الأسطى)
   Conversation view, streaming responses, tool cards, and chart rendering
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

  const msg = (cls, text) => {
    const d = document.createElement('div');
    d.className = 'aimsg ' + cls;
    if (cls === 'a') d.appendChild(mdLite(text));
    else d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  };

  const ui = {
    _cur: null,
    status(t) {
      st.textContent = t || '';
      stop.hidden = !t;
      send.disabled = !!t;
    },
    stream() {
      ui._cur = null;
      return d => {
        if (!ui._cur) {
          ui._cur = document.createElement('div');
          ui._cur.className = 'aimsg a';
          log.appendChild(ui._cur);
        }
        ui._cur._raw = (ui._cur._raw || '') + d;
        ui._cur.textContent = '';
        ui._cur.appendChild(mdLite(ui._cur._raw));
        log.scrollTop = log.scrollHeight;
      };
    },
    assistantDone(t) {
      if (ui._cur) {
        ui._cur.textContent = '';
        ui._cur.appendChild(mdLite(t));
        ui._cur = null;
      } else {
        msg('a', t);
      }
      log.scrollTop = log.scrollHeight;
    },
    tool(name, args, res, ms) {
      const d = document.createElement('div');
      d.className = 'aimsg t';

      const head = document.createElement('div');
      head.style.direction = 'rtl';
      head.style.textAlign = 'right';
      head.style.fontFamily = 'var(--f-ar)';
      head.textContent =
        (res && res.ok ? '🛠️ ' : '⚠️ ') +
        name +
        ' · ' +
        fmtN(ms, 0) +
        'ms' +
        (res && res.affected ? ' · ' + fmtN(res.affected, 0) + ' صف' : '');

      const btn = document.createElement('button');
      btn.className = 'b sm g';
      btn.textContent = 'وريني عمل إيه';

      const pre = document.createElement('div');
      pre.hidden = true;
      pre.textContent = 'args: ' + JSON.stringify(args) + '\n\nresult: ' + JSON.stringify(res).slice(0, 1400);

      btn.onclick = () => {
        pre.hidden = !pre.hidden;
      };
      d.append(head, btn, pre);
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    },
    chart(c) {
      const d = document.createElement('div');
      d.className = 'card pad';
      if (c.title) {
        const h = document.createElement('div');
        h.style.fontWeight = '800';
        h.textContent = c.title;
        d.appendChild(h);
      }
      const fn = Chart[c.kind] || Chart.bars;
      d.appendChild(fn(c.data, { h: 200 }));
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    },
    note(t) {
      const d = document.createElement('div');
      d.className = 'xs dim';
      d.textContent = 'ℹ️ ' + t;
      log.appendChild(d);
    },
    usage(u) {
      st.textContent = 'توكنز الجلسة (تقديري): ' + fmtN(u.in, 0) + ' داخل · ' + fmtN(u.out, 0) + ' خارج';
    },
    error(t) {
      const d = document.createElement('div');
      d.className = 'aimsg a';
      d.style.borderInlineStart = '4px solid var(--bad)';
      d.appendChild(mdLite('حصلت مشكلة: ' + t));
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    },
    batchDone(b, n) {
      const d = document.createElement('div');
      d.className = 'row';
      d.style.gap = '8px';
      const s2 = document.createElement('span');
      s2.className = 'xs dim';
      s2.textContent = 'الأسطى عدّل ' + fmtN(n, 0) + ' حاجة.';

      const u = document.createElement('button');
      u.className = 'b sm';
      u.textContent = '↩️ رجّع كل ده';
      u.onclick = async () => {
        await Hist.undo();
        UI.toast('رجّعنا كل اللي عمله الأسطى');
        u.disabled = true;
        Bus.emit('data');
      };

      d.append(s2, u);
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }
  };

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
