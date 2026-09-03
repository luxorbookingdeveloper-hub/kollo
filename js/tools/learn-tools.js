/* ============================================================================
   كله — Kollo | AI Tools: Learning & Flashcard Tools
   ============================================================================ */
/* --- تعلّم --- */
registerTool({
  name: 'add_book',
  description: 'Add a book to the reading list.',
  risk: 'write',
  parameters: P({ title: S_STR, author: S_STR, pages: S_NUM }, ['title']),
  handler: async a => {
    const r = await R.books.add({
      title: a.title,
      author: a.author || '',
      pages: num(a.pages),
      page: 0,
      status: 'reading'
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'update_reading_progress',
  description: 'Update current page of a book.',
  risk: 'write',
  parameters: P({ id: S_STR, page: S_NUM }, ['id', 'page']),
  handler: async a => {
    const b = await R.books.get(a.id);
    if (!b) return ERR('الكتاب مش موجود');
    const r = await R.books.patch(a.id, {
      page: num(a.page),
      status: (b.pages && num(a.page) >= +b.pages) ? 'done' : 'reading'
    });
    return OK({ id: r.id, page: r.page, pct: b.pages ? Math.round((r.page / b.pages) * 100) : null }, { affected: 1 });
  }
});

registerTool({
  name: 'add_quote',
  description: 'Save a quote from a book as a note.',
  risk: 'write',
  parameters: P({ bookId: S_STR, text: S_STR, page: S_NUM }, ['text']),
  handler: async a => {
    const b = a.bookId ? await R.books.get(a.bookId) : null;
    const r = await R.notes.add({
      title: 'اقتباس' + (b ? ': ' + b.title : ''),
      body: '> ' + a.text + (a.page ? '\n\n— صفحة ' + num(a.page) : ''),
      tags: ['اقتباسات']
    });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'create_flashcards_from_note',
  description: 'Create SRS flashcards from note lines shaped "question :: answer".',
  risk: 'write',
  parameters: P({ noteId: S_STR }, ['noteId']),
  handler: async a => {
    const n = await R.notes.get(a.noteId);
    if (!n) return ERR('المذكرة مش موجودة');
    const lines = String(n.body || '').split('\n').filter(l => l.includes('::'));
    if (!lines.length) return ERR('مفيش سطور بالشكل: سؤال :: جواب');
    const ids = [];
    for (const l of lines) {
      const [f, b] = l.split('::');
      const c = await R.cards.add({
        front: f.trim(),
        back: (b || '').trim(),
        noteId: n.id,
        due: today(),
        ef: 2.5,
        reps: 0,
        interval: 0
      });
      ids.push(c.id);
    }
    return OK({ ids }, { affected: ids.length });
  }
});

registerTool({
  name: 'get_due_cards',
  description: 'Get flashcards due today.',
  risk: 'read',
  parameters: P({ limit: S_NUM }),
  handler: async a => {
    const rows = (await R.cards.all()).filter(c => !c.due || c.due <= today()).slice(0, num(a.limit, 20));
    return OK(cap(rows.map(c => ({ id: c.id, front: c.front, back: c.back, due: c.due }))));
  }
});

registerTool({
  name: 'grade_card',
  description: 'Grade a flashcard 0-5 (SM-2 schedules next review).',
  risk: 'write',
  parameters: P({ id: S_STR, grade: S_NUM }, ['id', 'grade']),
  handler: async a => {
    const c = await R.cards.get(a.id);
    if (!c) return ERR('الكارت مش موجود');
    const r = await R.cards.patch(a.id, sm2(c, clamp(num(a.grade, 3), 0, 5)));
    return OK({ id: r.id, due: r.due, interval: r.interval }, { affected: 1 });
  }
});

