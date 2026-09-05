/* ============================================================================
   كله — Kollo | Database Layer (IndexedDB wrapper + migrations)
   ============================================================================ */
const DB = { h: null };

function migrate(oldV, newV, txInstance, db) {
  /* v0 -> v1 : إنشاء كل الجداول والفهارس */
  if (oldV < 1) {
    const schema = window.SCHEMA || SCHEMA;
    for (const name in schema) {
      const st = db.objectStoreNames.contains(name)
        ? txInstance.objectStore(name)
        : db.createObjectStore(name, { keyPath: 'id' });
      schema[name].forEach(ix => {
        let multi = false, n = ix;
        if (n[0] === '*') {
          multi = true;
          n = n.slice(1);
        }
        const kp = n.includes('+') ? n.split('+') : n;
        if (!st.indexNames.contains(n)) {
          st.createIndex(n, kp, { multiEntry: multi && !Array.isArray(kp) });
        }
      });
    }
  }
}

function openDB() {
  return new Promise((res, rej) => {
    const dbName = 'kollo';
    const rq = indexedDB.open(dbName, SCHEMA_VERSION);
    rq.onupgradeneeded = e => migrate(e.oldVersion, e.newVersion, rq.transaction, rq.result);
    rq.onsuccess = async () => {
      DB.h = rq.result;
      DB.h.onversionchange = () => DB.h.close();

      // Check if old 'kashkool' db exists and 'kollo' has empty settings; if so, migrate data
      try {
        if ('databases' in indexedDB) {
          const dbs = await indexedDB.databases();
          const hasOld = dbs.some(d => d.name === 'kashkool');
          if (hasOld) {
            const hasData = await dbCount('settings');
            if (hasData === 0) {
              await copyFromOldDB('kashkool');
            }
          }
        }
      } catch (e) {}

      res(DB.h);
    };
    rq.onerror = () => rej(rq.error);
  });
}

async function copyFromOldDB(oldDbName) {
  try {
    const oldDb = await new Promise((r, j) => {
      const q = indexedDB.open(oldDbName, SCHEMA_VERSION);
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    const schema = window.SCHEMA || SCHEMA;
    for (const s of Object.keys(schema)) {
      if (!oldDb.objectStoreNames.contains(s)) continue;
      const rows = await new Promise(r => {
        const tr = oldDb.transaction(s, 'readonly');
        const req = tr.objectStore(s).getAll();
        req.onsuccess = () => r(req.result || []);
        req.onerror = () => r([]);
      });
      for (const row of rows) {
        await dbPut(s, row);
      }
    }
    oldDb.close();
  } catch (e) {}
}

const pReq = rq => new Promise((res, rej) => {
  rq.onsuccess = () => res(rq.result);
  rq.onerror = () => rej(rq.error);
});

function tx(names, mode) {
  const t = DB.h.transaction(names, mode || 'readonly');
  const done = new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
  return { t, done, s: n => t.objectStore(n) };
}

async function dbGet(store, id) {
  const x = tx([store]);
  return pReq(x.s(store).get(id));
}

async function dbPut(store, obj) {
  const x = tx([store], 'readwrite');
  const r = pReq(x.s(store).put(obj));
  await x.done;
  return r;
}

async function dbDel(store, id) {
  const x = tx([store], 'readwrite');
  x.s(store).delete(id);
  await x.done;
}

async function dbAll(store, limit) {
  const x = tx([store]);
  const out = [];
  await new Promise((res, rej) => {
    const c = x.s(store).openCursor();
    c.onerror = () => rej(c.error);
    c.onsuccess = () => {
      const cur = c.result;
      if (!cur || (limit && out.length >= limit)) return res();
      out.push(cur.value);
      cur.continue();
    };
  });
  return out;
}

async function dbIndex(store, index, range, limit, dir) {
  const x = tx([store]);
  const out = [];
  await new Promise((res, rej) => {
    const c = x.s(store).index(index).openCursor(range || null, dir || 'next');
    c.onerror = () => rej(c.error);
    c.onsuccess = () => {
      const cur = c.result;
      if (!cur || (limit && out.length >= limit)) return res();
      out.push(cur.value);
      cur.continue();
    };
  });
  return out;
}

async function dbCount(store) {
  const x = tx([store]);
  return pReq(x.s(store).count());
}

// Bind to window
Object.assign(window, {
  DB, migrate, openDB, pReq, tx, dbGet, dbPut, dbDel, dbAll, dbIndex, dbCount
});
