/* ============================================================================
   كله — Kollo | AI Tools: Kitchen & Pantry Tools
   ============================================================================ */
/* --- تسوّق/مطبخ --- */
registerTool({
  name: 'add_shopping_items',
  description: 'Add items to the shopping list.',
  risk: 'write',
  parameters: P({ items: { type: 'array', items: S_STR }, section: S_STR }, ['items']),
  handler: async a => {
    const list = (a.items || []).filter(Boolean);
    if (!list.length) return ERR('مفيش حاجات');
    const ids = [];
    for (const n of list) {
      const r = await R.shoppingItems.add({ name: n, section: a.section || 'متنوع', done: false });
      ids.push(r.id);
    }
    return OK({ ids }, { affected: ids.length });
  }
});

registerTool({
  name: 'check_pantry',
  description: 'Check what exists in the pantry and what expires soon.',
  risk: 'read',
  parameters: P({}),
  handler: async () => {
    const p = await R.pantry.all();
    return OK({
      items: p.map(x => ({ id: x.id, name: x.name, qty: x.qty, expiry: x.expiry })),
      expiringSoon: p.filter(x => x.expiry && x.expiry <= addDays(today(), 7)).map(x => x.name)
    });
  }
});

registerTool({
  name: 'add_recipe',
  description: 'Add a recipe with ingredients.',
  risk: 'write',
  parameters: P({ name: S_STR, ingredients: { type: 'array', items: S_STR }, steps: S_STR }, ['name']),
  handler: async a => {
    const r = await R.recipes.add({ name: a.name, ingredients: a.ingredients || [], steps: a.steps || '' });
    return OK({ id: r.id }, { affected: 1 });
  }
});

registerTool({
  name: 'shopping_list_from_recipe',
  description: 'Add missing recipe ingredients (not in pantry) to shopping list.',
  risk: 'write',
  parameters: P({ recipeId: S_STR }, ['recipeId']),
  handler: async a => {
    const r = await R.recipes.get(a.recipeId);
    if (!r) return ERR('الوصفة مش موجودة');
    const pantry = await R.pantry.all();
    const need = (r.ingredients || []).filter(i => !pantry.some(p => String(p.name).includes(i)));
    if (!need.length) return OK({ missing: [], message: 'كل المكوّنات موجودة' });
    for (const n of need) {
      await R.shoppingItems.add({ name: n, section: 'متنوع', done: false, note: 'من وصفة: ' + r.name });
    }
    return OK({ missing: need }, { affected: need.length });
  }
});

