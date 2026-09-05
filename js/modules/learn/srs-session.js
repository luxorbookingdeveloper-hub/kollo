/* ============================================================================
   كله — Kollo | Module: Learning - SRS Flashcards Session (SM-2 Algorithm)
   ============================================================================ */
async function renderSrsSession() {
  const box = document.createElement('div');
  const due = (await R.cards.all()).filter(c => !c.due || c.due <= today());
  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ كارت';
  add.onclick = () => openEditor('cards', null);
  box.appendChild(add);

  const c = document.createElement('div');
  c.className = 'card pad';
  c.style.marginTop = '12px';

  if (!due.length) {
    c.appendChild(
      UI.empty('مفيش كروت مستحقة', 'اعمل كروت من مذكرة (سطور بالشكل: سؤال :: جواب) أو ضيف كارت.', {
        label: '＋ كارت',
        fn: () => openEditor('cards', null)
      })
    );
    box.appendChild(c);
    return box;
  }

  let idx = 0,
    showBack = false;
  const paint = () => {
    c.textContent = '';
    const card = due[idx];
    if (!card) {
      c.appendChild(UI.empty('خلصنا المراجعة 👏', 'ارجع بكرة — المراجعة المتباعدة شغلها بالراحة.', null));
      return;
    }
    const pr = document.createElement('div');
    pr.className = 'xs dim';
    pr.textContent = 'كارت ' + fmtN(idx + 1, 0) + ' من ' + fmtN(due.length, 0);
    c.appendChild(pr);

    const f = document.createElement('div');
    f.style.cssText = 'font-size:1.15rem;font-weight:800;margin:14px 0;min-height:56px';
    f.textContent = card.front;
    c.appendChild(f);

    if (showBack) {
      const b = document.createElement('div');
      b.className = 'muted';
      b.style.marginBottom = '12px';
      b.textContent = card.back;
      c.appendChild(b);

      const row = document.createElement('div');
      row.className = 'row wrap';
      [[0, 'نسيت خالص'], [3, 'صح بالعافية'], [4, 'صح'], [5, 'سهلة']].forEach(([g, l]) => {
        const bb = document.createElement('button');
        bb.className = 'b sm';
        bb.textContent = l;
        bb.onclick = async () => {
          Hist.begin('مراجعة كارت');
          await R.cards.patch(card.id, sm2(card, g));
          Hist.commit();
          idx++;
          showBack = false;
          paint();
        };
        row.appendChild(bb);
      });
      c.appendChild(row);
    } else {
      const b = document.createElement('button');
      b.className = 'b p';
      b.textContent = 'وريني الجواب';
      b.onclick = () => {
        showBack = true;
        paint();
      };
      c.appendChild(b);
    }
  };
  paint();
  box.appendChild(c);
  return box;
}

window.renderSrsSession = renderSrsSession;
