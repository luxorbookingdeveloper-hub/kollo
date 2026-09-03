/* ============================================================================
   كله — Kollo | Repositories & History Layer (CRUD + Undo/Redo)
   ============================================================================ */
const Hist = {
  stack: [],
  ptr: -1,
  cur: null,
  begin(label) {
    this.cur = { label, ops: [], id: uid(), at: now() };
    return this.cur;
  },
  op(store, before, after) {
    const b = this.cur || this.begin('تغيير');
    b.ops.push({
      store,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null
    });
    if (!this.cur) this.commit();
  },
  commit() {
    if (!this.cur) return null;
    if (!this.cur.ops.length) {
      this.cur = null;
      return null;
    }
    this.stack = this.stack.slice(0, this.ptr + 1);
    this.stack.push(this.cur);
    if (this.stack.length > 60) this.stack.shift();
    this.ptr = this.stack.length - 1;
    const b = this.cur;
    this.cur = null;
    Bus.emit('hist');
    return b;
  },
  async apply(batch, dir) {
    for (const o of (dir === 'undo' ? [...batch.ops].reverse() : batch.ops)) {
      const v = dir === 'undo' ? o.before : o.after;
      if (v) await dbPut(o.store, v);
      else if ((dir === 'undo' ? o.after : o.before)) await dbDel(o.store, (o.after || o.before).id);
    }
  },
  async undo() {
    if (this.ptr < 0) return null;
    const b = this.stack[this.ptr];
    await this.apply(b, 'undo');
    this.ptr--;
    Bus.emit('data');
    Bus.emit('hist');
    return b;
  },
  async redo() {
    if (this.ptr >= this.stack.length - 1) return null;
    const b = this.stack[++this.ptr];
    await this.apply(b, 'redo');
    Bus.emit('data');
    Bus.emit('hist');
    return b;
  },
  find(id) {
    return this.stack.find(b => b.id === id);
  }
};

function mkRepo(store) {
  return {
    store,
    async add(obj) {
      const rec = Object.assign({ id: uid(), createdAt: now(), updatedAt: now(), deletedAt: null }, obj);
      await dbPut(store, rec);
      Hist.op(store, null, rec);
      Log(store, 'add', rec.id);
      Bus.emit('data', store);
      return rec;
    },
    async put(obj) {
      const before = obj.id ? await dbGet(store, obj.id) : null;
      const rec = Object.assign({ id: uid(), createdAt: now(), deletedAt: null }, before || {}, obj, { updatedAt: now() });
      await dbPut(store, rec);
      Hist.op(store, before, rec);
      Log(store, before ? 'update' : 'add', rec.id);
      Bus.emit('data', store);
      return rec;
    },
    async patch(id, fields) {
      const before = await dbGet(store, id);
      if (!before) throw new Error('العنصر مش موجود: ' + id);
      const rec = Object.assign({}, before, fields, { updatedAt: now() });
      await dbPut(store, rec);
      Hist.op(store, before, rec);
      Log(store, 'update', id);
      Bus.emit('data', store);
      return rec;
    },
    async get(id) {
      return dbGet(store, id);
    },
    async all(opt) {
      opt = opt || {};
      const rows = await dbAll(store);
      return opt.withDeleted ? rows : rows.filter(r => !r.deletedAt);
    },
    async byIndex(ix, range, limit, dir) {
      const rows = await dbIndex(store, ix, range, limit, dir);
      return rows.filter(r => !r.deletedAt);
    },
    async count() {
      return dbCount(store);
    },
    async softDel(id) {
      const before = await dbGet(store, id);
      if (!before) return null;
      const rec = Object.assign({}, before, { deletedAt: now(), updatedAt: now() });
      await dbPut(store, rec);
      Hist.op(store, before, rec);
      await dbPut('trash', {
        id: uid(),
        store,
        refId: id,
        title: before.title || before.name || before.note || id,
        deletedAt: now(),
        createdAt: now()
      });
      Log(store, 'delete', id);
      Bus.emit('data', store);
      return rec;
    },
    async restore(id) {
      const before = await dbGet(store, id);
      if (!before) return null;
      const rec = Object.assign({}, before, { deletedAt: null, updatedAt: now() });
      await dbPut(store, rec);
      Hist.op(store, before, rec);
      Bus.emit('data', store);
      return rec;
    },
    async hardDel(id) {
      const before = await dbGet(store, id);
      await dbDel(store, id);
      Hist.op(store, before, null);
      Bus.emit('data', store);
      return true;
    }
  };
}

const R = {};
Object.keys(SCHEMA).forEach(n => {
  R[n] = mkRepo(n);
});

async function Log(store, action, refId) {
  if (store === 'activityLog' || store === 'aiMessages') return;
  try {
    await dbPut('activityLog', { id: uid(), at: now(), store, action, refId, createdAt: now(), deletedAt: null });
  } catch (e) {}
}

Object.assign(window, {
  Hist, mkRepo, R, Log
});
