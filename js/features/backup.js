/* ============================================================================
   كله — Kollo | Feature: Backup, Export & Import
   Full local export (JSON + optional Base64 attachments), AES encryption, and merge/replace import
   ============================================================================ */
async function exportAll(withBlobs) {
  const out = { app: 'kollo', legacyApp: 'kashkool', schema: SCHEMA_VERSION, at: now(), stores: {} };
  for (const s of Object.keys(SCHEMA)) {
    const rows = await dbAll(s);
    if (s === 'attachments' && !withBlobs) {
      out.stores[s] = [];
      continue;
    }
    if (s === 'attachments') {
      out.stores[s] = [];
      for (const r of rows) {
        let b64 = null;
        if (r.blob instanceof Blob) {
          b64 = await new Promise(res => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.readAsDataURL(r.blob);
          });
        }
        out.stores[s].push(Object.assign({}, r, { blob: null, dataUrl: b64 }));
      }
      continue;
    }
    out.stores[s] = rows;
  }
  return out;
}

async function importAll(obj, mode) {
  if (!obj || (obj.app !== 'kollo' && obj.app !== 'kashkool')) {
    throw new Error('الملف ده مش نسخة كله أو كشكول');
  }
  if (mode === 'replace') {
    for (const s of Object.keys(SCHEMA)) {
      const x = tx([s], 'readwrite');
      x.s(s).clear();
      await x.done;
    }
  }
  let n = 0;
  for (const s of Object.keys(obj.stores || {})) {
    if (!SCHEMA[s]) continue;
    for (const r of obj.stores[s]) {
      let rec = r;
      if (s === 'attachments' && r.dataUrl) {
        const res = await fetch(r.dataUrl);
        rec = Object.assign({}, r, { blob: await res.blob(), dataUrl: undefined });
      }
      await dbPut(s, rec);
      n++;
    }
  }
  return n;
}

async function backupUI() {
  const b = document.createElement('div');
  const p = document.createElement('p');
  p.className = 'sm muted';
  p.textContent = 'التصدير JSON كامل. المرفقات (صور/مستندات) بتتحوّل base64 — الملف يكبر. تقدر تشفّر النسخة بكلمة سر.';
  b.appendChild(p);

  const wb = document.createElement('label');
  wb.style.cssText = 'display:flex;gap:8px;align-items:center;min-height:44px';
  const wbi = document.createElement('input');
  wbi.type = 'checkbox';
  const wbs = document.createElement('span');
  wbs.textContent = 'ضمّن المرفقات';
  wb.append(wbi, wbs);
  b.appendChild(wb);

  const pw = document.createElement('input');
  pw.className = 'in';
  pw.type = 'password';
  pw.placeholder = 'كلمة سر للتشفير (اختياري)';
  b.appendChild(pw);

  const est = document.createElement('div');
  est.className = 'xs dim';
  est.style.marginTop = '8px';
  try {
    const e = await navigator.storage.estimate();
    est.textContent = 'التخزين: ' + fmtN((e.usage || 0) / 1048576, 1) + ' م.ب مستخدمة من ~' + fmtN((e.quota || 0) / 1048576, 0) + ' م.ب متاحة';
  } catch (e) {
    est.textContent = 'المتصفح مش بيقول حجم التخزين.';
  }
  b.appendChild(est);

  const imp = document.createElement('div');
  imp.style.marginTop = '14px';
  const il = document.createElement('div');
  il.style.fontWeight = '800';
  il.textContent = 'استيراد';
  imp.appendChild(il);

  const fi = document.createElement('input');
  fi.type = 'file';
  fi.accept = '.json,application/json';
  fi.className = 'in';
  imp.appendChild(fi);

  const ipw = document.createElement('input');
  ipw.className = 'in';
  ipw.type = 'password';
  ipw.placeholder = 'كلمة سر النسخة (لو مشفّرة)';
  imp.appendChild(ipw);

  const prev = document.createElement('div');
  prev.className = 'sm muted';
  prev.style.marginTop = '6px';
  imp.appendChild(prev);

  let parsed = null;
  fi.onchange = async () => {
    const f = fi.files[0];
    if (!f) return;
    try {
      let txt = await f.text();
      let o = JSON.parse(txt);
      if (o.enc) {
        if (!ipw.value) {
          prev.textContent = 'النسخة مشفّرة — اكتب كلمة السر وجرّب تاني.';
          return;
        }
        o = JSON.parse(await Crypt.dec(o.enc, ipw.value));
      }
      parsed = o;
      const counts = Object.keys(o.stores || {})
        .map(s => s + ': ' + fmtN((o.stores[s] || []).length, 0))
        .slice(0, 8)
        .join(' · ');
      prev.textContent = 'معاينة — نسخة ' + (o.at || '').slice(0, 10) + ' · سكيما ' + o.schema + ' · ' + counts;
    } catch (e) {
      prev.textContent = 'مش قادر أقرا الملف: ' + e.message;
    }
  };
  b.appendChild(imp);

  UI.sheet({
    title: 'نسخة احتياطية',
    body: b,
    actions: [
      { label: 'إقفال' },
      {
        label: '⬇️ صدّر',
        fn: async () => {
          const data = await exportAll(wbi.checked);
          if (pw.value) {
            const enc = await Crypt.enc(JSON.stringify(data), pw.value);
            dl('kollo-backup-' + today() + '.json', JSON.stringify({ app: 'kollo', enc }, null, 0));
          } else {
            dl('kollo-backup-' + today() + '.json', JSON.stringify(data));
          }
          UI.toast('نزّلنا النسخة 👌');
          return false;
        }
      },
      {
        label: '⬆️ استورد (دمج)',
        kind: 'p',
        fn: async () => {
          if (!parsed) {
            UI.toast('اختار ملف الأول');
            return false;
          }
          const n = await importAll(parsed, 'merge');
          Bus.emit('data');
          UI.toast('استوردنا ' + fmtN(n, 0) + ' صف');
          Router.render();
        }
      },
      {
        label: 'استبدال كامل',
        kind: 'd',
        fn: async () => {
          if (!parsed) {
            UI.toast('اختار ملف الأول');
            return false;
          }
          if (!(await UI.confirm('استبدال كل الداتا؟', 'ده هيمسح كل حاجة موجودة ويحل مكانها النسخة. مفيش رجوع.', true))) {
            return false;
          }
          const n = await importAll(parsed, 'replace');
          Bus.emit('data');
          UI.toast('استبدلنا بـ' + fmtN(n, 0) + ' صف');
          Router.render();
        }
      }
    ]
  });
}

Object.assign(window, {
  exportAll, importAll, backupUI
});
