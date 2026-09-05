/* ============================================================================
   كله — Kollo | Feature: Global Multi-Store Search
   Searches all major stores with text indexing and WebWorker fuzzy matching
   ============================================================================ */

async function searchEverything(q, limit) {
  const stores = ['tasks', 'projects', 'notes', 'people', 'txns', 'events', 'goals', 'books', 'documents', 'assets', 'shoppingItems', 'habits'];
  const rows = [];
  for (const s of stores) {
    const list = await R[s].all();
    list.forEach(r =>
      rows.push({
        id: r.id,
        store: s,
        title: titleOf(r),
        text: [titleOf(r), r.note, r.body, (r.tags || []).join(' '), r.relation, r.author].filter(Boolean).join(' ')
      })
    );
  }
  const res = await WK.call({ op: 'search', q, rows });
  return res.slice(0, limit || 40);
}

Object.assign(window, {
  searchEverything
});
