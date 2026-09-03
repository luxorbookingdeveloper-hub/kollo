/* ============================================================================
   كله — Kollo | Background Worker (inline blob) for search & aggregation
   Includes graceful main-thread fallback if Worker/Blob is restricted
   ============================================================================ */
const WK = (function() {
  const src = `self.onmessage=function(e){var d=e.data,id=d.id;try{
    if(d.op==='search'){var q=(d.q||'').toLowerCase();var norm=function(x){return x.replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')};
      q=norm(q);var out=[];d.rows.forEach(function(r){var hay=norm(String(r.text||'').toLowerCase());var i=hay.indexOf(q);
        if(i>-1)out.push({id:r.id,store:r.store,title:r.title,score:2-(i/(hay.length+1))})});
      out.sort(function(a,b){return b.score-a.score});self.postMessage({id:id,ok:1,res:out.slice(0,120)})}
    else if(d.op==='agg'){var m={};d.rows.forEach(function(r){var k=r.k==null?'—':r.k;m[k]=(m[k]||0)+(+r.v||0)});
      var arr=Object.keys(m).map(function(k){return{k:k,v:m[k]}});arr.sort(function(a,b){return Math.abs(b.v)-Math.abs(a.v)});
      self.postMessage({id:id,ok:1,res:arr})}
    else self.postMessage({id:id,ok:0,err:'op مش معروف'})}catch(err){self.postMessage({id:id,ok:0,err:String(err&&err.message||err)})}};`;

  function localExec(d) {
    if (d.op === 'search') {
      let q = (d.q || '').toLowerCase();
      const norm = x => x.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
      q = norm(q);
      const out = [];
      d.rows.forEach(r => {
        const hay = norm(String(r.text || '').toLowerCase());
        const i = hay.indexOf(q);
        if (i > -1) out.push({ id: r.id, store: r.store, title: r.title, score: 2 - (i / (hay.length + 1)) });
      });
      out.sort((a, b) => b.score - a.score);
      return out.slice(0, 120);
    } else if (d.op === 'agg') {
      const m = {};
      d.rows.forEach(r => {
        const k = r.k == null ? '—' : r.k;
        m[k] = (m[k] || 0) + (+r.v || 0);
      });
      const arr = Object.keys(m).map(k => ({ k: k, v: m[k] }));
      arr.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
      return arr;
    }
    throw new Error('op مش معروف');
  }

  let w = null, seq = 0, pend = new Map(), workerFailed = false;

  function boot() {
    if (workerFailed) return null;
    if (w) return w;
    try {
      if (typeof Worker === 'undefined' || typeof Blob === 'undefined') {
        workerFailed = true;
        return null;
      }
      w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = e => {
        const p = pend.get(e.data.id);
        if (!p) return;
        pend.delete(e.data.id);
        e.data.ok ? p.res(e.data.res) : p.rej(new Error(e.data.err));
      };
      w.onerror = () => {
        workerFailed = true;
      };
      return w;
    } catch (e) {
      workerFailed = true;
      return null;
    }
  }

  return {
    call(msg) {
      const worker = boot();
      if (!worker) {
        try {
          return Promise.resolve(localExec(msg));
        } catch (err) {
          return Promise.reject(err);
        }
      }
      const id = ++seq;
      return new Promise((res, rej) => {
        pend.set(id, { res, rej });
        try {
          worker.postMessage(Object.assign({ id }, msg));
        } catch (e) {
          pend.delete(id);
          try {
            res(localExec(msg));
          } catch (err) {
            rej(err);
          }
        }
      });
    }
  };
})();

window.WK = WK;
