/* ============================================================================
   كله — Kollo | Core Text & Markdown Utilities
   Fuzzy string search and safe DOM-based Markdown-lite renderer
   ============================================================================ */

function fuzzy(q, s) {
  q = String(q || '').trim().toLowerCase();
  s = String(s || '').toLowerCase();
  if (!q) return 1;
  const norm = x => x.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْ]/g, '');
  q = norm(q);
  s = norm(s);
  if (s.includes(q)) return 2 - (s.indexOf(q) / (s.length + 1));
  let i = 0, sc = 0;
  for (const ch of s) {
    if (ch === q[i]) {
      i++;
      sc += 1;
    }
    if (i === q.length) break;
  }
  return i === q.length ? .5 + sc / (s.length * 4) : 0;
}

/* Markdown-lite sanitizer: بنبني DOM بإيدينا، ممنوع innerHTML لأي محتوى من المستخدم/الموديل */
function mdLite(text) {
  const wrap = document.createElement('div');
  wrap.className = 'md';
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  let i = 0;

  const inline = (el, s) => {
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\[[^\]]+\]\])/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) el.appendChild(document.createTextNode(s.slice(last, m.index)));
      const t = m[0];
      let n;
      if (t.startsWith('**')) {
        n = document.createElement('strong');
        n.textContent = t.slice(2, -2);
      } else if (t.startsWith('`')) {
        n = document.createElement('code');
        n.textContent = t.slice(1, -1);
      } else if (t.startsWith('[[')) {
        n = document.createElement('a');
        n.textContent = t.slice(2, -2);
        n.href = '#/notes?q=' + encodeURIComponent(t.slice(2, -2));
      } else {
        n = document.createElement('em');
        n.textContent = t.slice(1, -1);
      }
      el.appendChild(n);
      last = m.index + t.length;
    }
    if (last < s.length) el.appendChild(document.createTextNode(s.slice(last)));
    return el;
  };

  while (i < lines.length) {
    const L = lines[i];
    if (/^```/.test(L)) {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      code.textContent = buf.join('\n');
      pre.appendChild(code);
      wrap.appendChild(pre);
      continue;
    }
    if (/^\s*[-*]\s+/.test(L)) {
      const ul = document.createElement('ul');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const li = document.createElement('li');
        inline(li, lines[i].replace(/^\s*[-*]\s+/, ''));
        ul.appendChild(li);
        i++;
      }
      wrap.appendChild(ul);
      continue;
    }
    if (/^#{1,4}\s+/.test(L)) {
      const lvl = L.match(/^#+/)[0].length;
      const h = document.createElement('h' + Math.min(4, lvl + 2));
      h.style.fontWeight = '800';
      inline(h, L.replace(/^#+\s+/, ''));
      wrap.appendChild(h);
      i++;
      continue;
    }
    if (!L.trim()) {
      i++;
      continue;
    }
    const p = document.createElement('p');
    inline(p, L);
    wrap.appendChild(p);
    i++;
  }
  return wrap;
}

Object.assign(window, {
  fuzzy, mdLite
});
