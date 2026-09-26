/* ============================================================================
   كله — Kollo | AI Chat UI: Message Rendering, Streaming & Tool Cards
   ============================================================================ */

window.createAIChatUI = function (log, st, stop, send) {
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

      const bar = document.createElement('div');
      bar.style.marginTop = '8px';
      const cp = document.createElement('button');
      cp.className = 'b sm g';
      cp.style.fontSize = '12px';
      cp.textContent = '📋 نسخ نص الخطأ';
      cp.onclick = async () => {
        const ok = await copyText(t);
        if (ok) {
          cp.textContent = '✅ تم النسخ!';
          setTimeout(() => { cp.textContent = '📋 نسخ نص الخطأ'; }, 2000);
        }
      };
      bar.appendChild(cp);
      d.appendChild(bar);

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

  return { msg, ui };
};
