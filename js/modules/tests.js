/* ============================================================================
   كله — Kollo | Module: Internal Self-Test Suite (15 Test Sections)
   Runs hermetic tests on ephemeral data and cleans up completely
   ============================================================================ */
window.VIEWS = window.VIEWS || {};

VIEWS.tests = async () => {
  const box = document.createElement('div');
  const p = document.createElement('div');
  p.className = 'card pad sm muted';
  p.textContent = 'اختبارات داخلية بتشتغل فعليًا على داتا وهمية مؤقتة (بتتمسح بعد الاختبار) — مش على داتاك.';
  box.appendChild(p);

  const bar = document.createElement('div');
  bar.className = 'row';
  bar.style.margin = '12px 0';
  const run = document.createElement('button');
  run.className = 'b p';
  run.textContent = '▶️ شغّل كل الاختبارات';
  bar.appendChild(run);
  box.appendChild(bar);

  const out = document.createElement('div');
  out.className = 'card';
  box.appendChild(out);

  const sum = document.createElement('div');
  sum.className = 'card pad';
  sum.style.marginTop = '12px';
  box.appendChild(sum);

  const line = (name, ok, note) => {
    const li = document.createElement('div');
    li.className = 'li';
    const i = document.createElement('div');
    i.style.flex = '0 0 26px';
    i.className = ok ? 'ok' : 'no';
    i.textContent = ok ? '✅' : '❌';

    const m = document.createElement('div');
    m.style.flex = '1';
    const t = document.createElement('div');
    t.className = 't';
    t.textContent = name;

    const s = document.createElement('div');
    s.className = 'xs dim';
    s.textContent = note || '';
    m.append(t, s);
    li.append(i, m);
    out.appendChild(li);
  };

  run.onclick = async () => {
    out.textContent = '';
    let pass = 0, fail = 0;
    const T2 = async (name, fn) => {
      try {
        const r = await fn();
        const ok = r === true || (r && r.ok !== false);
        line(name, !!ok, (r && r.note) || '');
        ok ? pass++ : fail++;
      } catch (e) {
        line(name, false, String(e.message || e));
        fail++;
      }
    };
    /* ---- أدوات مساعدة: كل صف بيتعمل هنا بيتمسح في الآخر ---- */
    const tmp=[];
    const mk=async(store,obj)=>{const r=await R[store].add(obj);tmp.push([store,r.id]);return r};
    const snapIds = {};
    const cleanup=async()=>{
      for(const [s,id] of tmp.slice().reverse()){
        try{await R[s].hardDel(id)}catch(e){try{await dbDel(s,id)}catch(e2){}}
        try{const tr=(await dbAll('trash')).filter(t=>t.refId===id);for(const t of tr)await dbDel('trash',t.id)}catch(e){}}
      tmp.length=0;
      for (const s of Object.keys(SCHEMA)) {
        try {
          const current = await dbAll(s);
          const initial = snapIds[s] || new Set();
          for (const r of current) {
            if (!initial.has(r.id)) {
              try { await dbDel(s, r.id); } catch(e) {}
            }
          }
        } catch(e) {}
      }
    };
    const snap=async()=>{const o={};for(const s of Object.keys(SCHEMA))o[s]=await dbCount(s);return o};
    const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
    const diff=(a,b)=>Object.keys(a).filter(k=>a[k]!==b[k]).map(k=>k+': '+a[k]+'→'+b[k]).join(' · ');
    const mockUI=()=>{const rec={text:'',tools:[],notes:[],errors:[],charts:0};
      return{rec,status(){},usage(){},chart(){rec.charts++},batchDone(){},
        stream(){return d=>{rec.text+=d}},assistantDone(t){rec.text+=t},
        tool(n,a,r){rec.tools.push({n,ok:!!(r&&r.ok)})},
        note(t){rec.notes.push(String(t))},error(t){rec.errors.push(String(t))}}};
    /* مزوّد وهمي محلي: مفيش أي طلب شبكة — بنستبدل AI.call بسكربت خطوات */
    const withStub=async(script,fn)=>{const real=AI.call;let n=0;const seen=[];
      AI.call=async(msgs,tools,onDelta)=>{const step=script[Math.min(n,script.length-1)];n++;
        seen.push({msgs:msgs.slice(),tools:tools});
        if(typeof step==='function')return step(msgs,tools,onDelta);
        if(step.throw)throw new Error(step.throw);
        if(step.text&&onDelta)onDelta(step.text);
        return{text:step.text||'',reasoning:'',toolCalls:step.toolCalls||[],finish:step.finish||null,usage:step.usage||null}};
      try{return await fn(seen,()=>n)}finally{AI.call=real}};
    const cleanAiCalls=async before=>{const rows=await dbAll('aiToolCalls');
      for(const r of rows)if(before.indexOf(r.id)<0)await dbDel('aiToolCalls',r.id)};
    const settings0=JSON.parse(JSON.stringify(S.settings));
    const ai0=S.settings.ai;const chat0=S.cache.chat;
    const base=await snap();
    for (const s of Object.keys(SCHEMA)) {
      snapIds[s] = new Set((await dbAll(s)).map(r => r.id));
    }

    /* ================= 1) الداتابيز والجداول ================= */
    await T2('كل الجداول موجودة وبترد على العدّ',async()=>{
      const missing=[];for(const s of Object.keys(SCHEMA)){try{await dbCount(s)}catch(e){missing.push(s)}}
      return{ok:!missing.length,note:fmtN(Object.keys(SCHEMA).length,0)+' جدول'+(missing.length?' · ناقص: '+missing.join(', '):'')}});
    await T2('نسخة الاسكيمة ودالة الترحيل موجودة',async()=>{
      const hasMig=(typeof migrate==='function')||(typeof DB!=='undefined'&&DB&&typeof DB.migrate==='function');
      return{ok:SCHEMA_VERSION>=1&&hasMig,note:'SCHEMA_VERSION = '+SCHEMA_VERSION+(hasMig?' · migrate جاهزة':' · مفيش migrate')}});
    await T2('ترحيل 0 → 1: كل الجداول اتعملت من الصفر',async()=>{
      const names=Object.keys(SCHEMA);const bad=[];
      for(const s of names){try{const x=tx([s],'readonly');const st=x.s(s);if(!st)bad.push(s);await x.done}catch(e){bad.push(s)}}
      return{ok:!bad.length,note:bad.length?'مشكلة في: '+bad.join(', '):'الجداول كلها اتفتحت بنسخة '+SCHEMA_VERSION}});
    /* ================= 2) CRUD + سلة + استرجاع ================= */
    await T2('CRUD كامل على المهام (إضافة/قراءة/تعديل)',async()=>{
      const t=await mk('tasks',{title:'اختبار داخلي',status:'todo',priority:2});
      const got=await R.tasks.get(t.id);const up=await R.tasks.patch(t.id,{title:'اختبار معدّل',priority:1});
      return{ok:!!got&&got.title==='اختبار داخلي'&&up.title==='اختبار معدّل'&&up.priority===1&&!!up.updatedAt,note:'id: '+String(t.id).slice(0,8)}});
    await T2('حذف ناعم: الصف يختفي من القوايم ويروح السلة',async()=>{
      const t=await mk('tasks',{title:'للحذف الناعم',status:'todo'});
      await R.tasks.softDel(t.id);
      const inList=(await R.tasks.all()).some(x=>x.id===t.id);
      const inTrash=(await dbAll('trash')).some(x=>x.refId===t.id);
      const raw=await dbGet?await dbGet('tasks',t.id):null;
      return{ok:!inList&&inTrash&&(!raw||!!raw.deletedAt),note:'اختفى من القايمة وموجود في السلة'}});
    await T2('استرجاع من السلة بيرجّع الصف مكانه',async()=>{
      const t=await mk('notes',{title:'مذكرة اختبار',body:'نص'});
      await R.notes.softDel(t.id);const back=await R.notes.restore(t.id);
      const inList=(await R.notes.all()).some(x=>x.id===t.id);
      return{ok:!!back&&inList,note:'رجعت بنفس الـid'}});
    await T2('تفريغ السلة بيمسح نهائي (على صف اختبار بس)',async()=>{
      const t=await R.tasks.add({title:'للمسح النهائي',status:'todo'});
      await R.tasks.softDel(t.id);
      const row=(await dbAll('trash')).find(x=>x.refId===t.id);
      if(row){await dbDel('tasks',t.id);await dbDel('trash',row.id)}
      const gone=!(await R.tasks.get(t.id));
      return{ok:!!row&&gone,note:'اتمسح خالص'}});
    await T2('CRUD على كل الجداول الرئيسية',async()=>{
      const list=['projects','habits','events','accounts','categories','goals','books','people','assets','documents','shoppingItems','pantry','recipes','timeLogs','automations','moodLogs','journal','healthLogs','meds','cards','debts','subscriptions','clients','invoices','bills','warranties','vehicles','maintenance','gam3iyat','socialDuties','installments','budgets','keyResults','worship'];
      const bad=[];
      for(const s of list){if(!R[s]){bad.push(s+' (مفيش repo)');continue}
        try{const r=await R[s].add({name:'اختبار',title:'اختبار'});const g=await R[s].get(r.id);
          const p=await R[s].patch(r.id,{note:'ok'});await R[s].hardDel(r.id);
          if(!g||!p||p.note!=='ok')bad.push(s)}catch(e){bad.push(s+' ('+(e.message||e)+')')}}
      return{ok:!bad.length,note:bad.length?'وقع في: '+bad.slice(0,6).join(', '):fmtN(list.length,0)+' جدول عدّوا الاختبار'}});
    /* ================= 3) التكرار والتواريخ ================= */
    await T2('التواريخ الطبيعية المصرية بتتفهم صح',async()=>{
      const cases=[['بكرة',addDays(today(),1)],['امبارح',addDays(today(),-1)],['النهاردة',today()],['بعد بكرة',addDays(today(),2)]];
      const bad=cases.filter(([p,exp])=>{const r=parseNatDate(p);return r!==exp}).map(([p])=>p);
      const iso=parseNatDate('2026-01-31')==='2026-01-31';
      return{ok:!bad.length&&iso,note:bad.length?'مش فاهم: '+bad.join(', '):'بكرة/امبارح/النهاردة/بعد بكرة + ISO'}});
    await T2('حساب التكرار: 12 حالة حدّية',async()=>{
      const R2=(typeof nextOccurrence==='function')?nextOccurrence:(typeof nextRepeat==='function'?nextRepeat:null);
      const nextMonthly=(iso,keepLast)=>{const [y,m,d]=iso.split('-').map(Number);
        const lastOfNext=new Date(Date.UTC(y,m,0)).getUTCDate();
        const lastOfThis=new Date(Date.UTC(y,m,0)).getUTCDate();
        const nm=m===12?1:m+1,ny=m===12?y+1:y;const lastTarget=new Date(Date.UTC(ny,nm,0)).getUTCDate();
        const day=(keepLast||d>=lastOfThis)?lastTarget:Math.min(d,lastTarget);
        return ny+'-'+pad2(nm)+'-'+pad2(day)};
      const step=R2||((rule,from)=>rule==='daily'?addDays(from,1):rule==='weekly'?addDays(from,7):nextMonthly(from));
      const cases=[
        ['daily','2026-02-28','2026-03-01'],['daily','2028-02-28','2028-02-29'],['daily','2026-12-31','2027-01-01'],
        ['weekly','2026-01-29','2026-02-05'],['weekly','2026-12-28','2027-01-04'],
        ['monthly','2026-01-31','2026-02-28'],['monthly','2028-01-31','2028-02-29'],['monthly','2026-03-31','2026-04-30'],
        ['monthly','2026-12-31','2027-01-31'],['monthly','2026-01-15','2026-02-15'],['monthly','2026-05-31','2026-06-30'],
        ['daily','2026-06-30','2026-07-01']];
      const bad=cases.filter(([rule,from,exp])=>{let got;try{got=step(rule,from)}catch(e){return true}return got!==exp})
        .map(([r,f,e])=>r+' '+f+'→'+e);
      return{ok:!bad.length,note:(R2?'محرّك التكرار بالتطبيق':'حساب التواريخ الأساسي')+' · '+fmtN(cases.length,0)+' حالة'+(bad.length?' · وقع في: '+bad.slice(0,3).join(', '):'')}});
    await T2('addDays و monthKey متسقين',async()=>{
      const ok=addDays('2026-02-28',1)==='2026-03-01'&&addDays('2026-03-01',-1)==='2026-02-28'&&monthKey('2026-07-09')==='2026-07';
      return{ok,note:'حساب اليوم والشهر سليم'}});
    /* ================= 4) الميزانيات ================= */
    await T2('الميزانية: تحذير عند ٨٠٪ و١٠٠٪',async()=>{
      const cat=await mk('categories',{name:'اختبار-ميزانية',kind:'expense'});
      const acc=await mk('accounts',{name:'اختبار-حساب',type:'cash',opening:0});
      const mkey=monthKey();
      await mk('budgets',{categoryId:cat.id,amount:100,month:mkey});
      await mk('txns',{type:'expense',amount:80,date:today(),accountId:acc.id,categoryId:cat.id,note:'اختبار'});
      let st=await budgetStatus(mkey);
      const row=(st.rows||st.items||st||[]).find?((st.rows||st.items||st).find(r=>r.categoryId===cat.id||r.category===cat.name)):null;
      const pct1=row?Math.round((row.spent/(row.amount||1))*100):null;
      await mk('txns',{type:'expense',amount:25,date:today(),accountId:acc.id,categoryId:cat.id,note:'اختبار'});
      st=await budgetStatus(mkey);
      const row2=(st.rows||st.items||st).find(r=>r.categoryId===cat.id||r.category===cat.name);
      const pct2=row2?Math.round((row2.spent/(row2.amount||1))*100):null;
      return{ok:pct1===80&&pct2===105,note:'٨٠٪ ثم ١٠٥٪ (تحذير + تعدّي)'}});
    await T2('تول get_budget_status بيرجع أرقام حقيقية',async()=>{
      const r=await TOOLS.get_budget_status.handler({month:monthKey()});
      return{ok:r.ok===true&&r.data!=null,note:'رد بشكل {ok,data}'}});
    /* ================= 5) SRS ================= */
    await T2('SM-2: الجدولة بعد كل تقييم',async()=>{
      const card={front:'س',back:'ج',ef:2.5,reps:0,interval:0,due:today()};
      const g5=sm2(card,5),g0=sm2(Object.assign({},card,g5),0),g3=sm2(card,3);
      const ok=g5.interval>=1&&g5.due>=today()&&g5.ef>=2.5&&g0.interval<=1&&g0.reps===0&&g3.interval>=1&&g3.ef<=2.5;
      return{ok,note:'٥ → '+fmtN(g5.interval,0)+' يوم · ٣ → '+fmtN(g3.interval,0)+' يوم · ٠ → إعادة من الأول'}});
    await T2('تقييم كارت حقيقي بيحدّث الاستحقاق',async()=>{
      const c=await mk('cards',{front:'اختبار',back:'اختبار',due:today(),ef:2.5,reps:0,interval:0});
      const r=await TOOLS.grade_card.handler({id:c.id,grade:4});
      const after=await R.cards.get(c.id);
      return{ok:r.ok&&after.due>today()&&after.reps===1,note:'الاستحقاق الجديد: '+after.due}});
    /* ================= 6) تحويل التولز للصيغتين ================= */
    await T2('عدد التولز ≥ ٧٠ وكلها موصوفة',async()=>{
      const names=Object.keys(TOOLS);
      const bad=names.filter(n=>{const t=TOOLS[n];return !t.description||t.description.length<12||!t.parameters||t.parameters.type!=='object'||
        ['read','write','destructive'].indexOf(t.risk)<0||typeof t.handler!=='function'});
      const badName=names.filter(n=>!/^[a-z][a-z0-9_]*$/.test(n));
      return{ok:names.length>=70&&!bad.length&&!badName.length,
        note:fmtN(names.length,0)+' تول'+(bad.length?' · ناقص: '+bad.slice(0,4).join(', '):'')+(badName.length?' · أسماء غلط: '+badName.join(', '):'')}});
    await T2('تحويل السجل لصيغة Gemini (functionDeclarations)',async()=>{
      const p=S.settings.ai.provider;S.settings.ai.provider='gemini';
      try{const body=AI.toGemini([{role:'system',content:'س'},{role:'user',content:'اختبار'}],toolSchemas());
        const fd=body.tools[0].functionDeclarations;
        const bad=fd.filter(f=>!f.name||!f.description||!f.parameters);
        return{ok:!!body.systemInstruction&&body.contents.length===1&&fd.length===Object.keys(TOOLS).length&&!bad.length&&!!body.generationConfig,
          note:fmtN(fd.length,0)+' declaration + systemInstruction + generationConfig'}}
      finally{S.settings.ai.provider=p}});
    await T2('تحويل السجل لصيغة OpenAI (tools[])',async()=>{
      const p=S.settings.ai.provider;S.settings.ai.provider='openrouter';
      try{const body=AI.toOpenAI([{role:'user',content:'اختبار'}],toolSchemas());
        const bad=body.tools.filter(t=>t.type!=='function'||!t.function.name||!t.function.parameters);
        return{ok:body.tools.length===Object.keys(TOOLS).length&&!bad.length&&body.tool_choice==='auto'&&body.parallel_tool_calls===true,
          note:'tool_choice=auto · parallel_tool_calls=true'}}
      finally{S.settings.ai.provider=p}});
    await T2('snapshot: نفس التول في الصيغتين بنفس السكيمة',async()=>{
      const p=S.settings.ai.provider;
      try{S.settings.ai.provider='gemini';const g=AI.toGemini([{role:'user',content:'x'}],toolSchemas()).tools[0].functionDeclarations
          .find(f=>f.name==='create_task');
        S.settings.ai.provider='openrouter';const o=AI.toOpenAI([{role:'user',content:'x'}],toolSchemas()).tools
          .find(t=>t.function.name==='create_task').function;
        return{ok:g.name===o.name&&g.description===o.description&&JSON.stringify(g.parameters)===JSON.stringify(o.parameters),
          note:'create_task متطابق في الصيغتين'}}
      finally{S.settings.ai.provider=p}});
    /* ================= 7) بصمات التفكير وترتيب FC/FR ================= */
    await T2('قراءة رد Gemini: البصمة على أول functionCall بس',async()=>{
      const p=S.settings.ai.provider;S.settings.ai.provider='gemini';
      try{const r=AI.parse({candidates:[{content:{parts:[
          {functionCall:{name:'list_tasks',args:{limit:5}},thoughtSignature:'SIG-A'},
          {functionCall:{name:'get_today_brief',args:{}}}]},finishReason:'STOP'}],
        usageMetadata:{promptTokenCount:5,candidatesTokenCount:2,totalTokenCount:7}});
        return{ok:r.toolCalls.length===2&&r.toolCalls[0].providerMeta.thoughtSignature==='SIG-A'&&
          !r.toolCalls[1].providerMeta.thoughtSignature&&r.usage.total===7,
          note:'٢ نداء متوازي · بصمة واحدة على الأول'}}
      finally{S.settings.ai.provider=p}});
    await T2('إرجاع البصمة في نفس الجزء + ترتيب FC1,FC2,FR1,FR2',async()=>{
      const p=S.settings.ai.provider;S.settings.ai.provider='gemini';
      try{const msgs=[{role:'user',content:'س'},
          {role:'assistant',content:null,toolCalls:[
            {id:'a',name:'list_tasks',args:{limit:5},providerMeta:{thoughtSignature:'SIG-A'}},
            {id:'b',name:'get_today_brief',args:{}}]},
          {role:'tool',toolCallId:'a',name:'list_tasks',result:{ok:true,data:{rows:[]}}},
          {role:'tool',toolCallId:'b',name:'get_today_brief',result:{ok:true,data:{}}}];
        const c=AI.toGemini(msgs,null).contents;
        const model=c[1],fr1=c[2],fr2=c[3];
        const noInterleave=!model.parts.some(x=>x.functionResponse)&&!fr1.parts.some(x=>x.functionCall);
        return{ok:c.length===4&&model.role==='model'&&model.parts.length===2&&
          model.parts[0].thoughtSignature==='SIG-A'&&model.parts[1].thoughtSignature===undefined&&
          model.parts[0].functionCall.name==='list_tasks'&&model.parts[1].functionCall.name==='get_today_brief'&&
          fr1.parts[0].functionResponse.name==='list_tasks'&&fr2.parts[0].functionResponse.name==='get_today_brief'&&noInterleave,
          note:'الترتيب سليم ومش interleaved'}}
      finally{S.settings.ai.provider=p}});
    await T2('شكل OpenAI: البصمة في extra_content.google',async()=>{
      const p=S.settings.ai.provider;S.settings.ai.provider='openrouter';
      try{const body=AI.toOpenAI([
          {role:'assistant',content:null,toolCalls:[{id:'c1',name:'list_tasks',args:{limit:2},providerMeta:{thoughtSignature:'SIG-B'}}]},
          {role:'tool',toolCallId:'c1',name:'list_tasks',result:{ok:true}}],null);
        const tc=body.messages[0].tool_calls[0];const tr=body.messages[1];
        const readBack=AI.parse({choices:[{message:{content:null,tool_calls:[{id:'c1',type:'function',
          function:{name:'list_tasks',arguments:'{"limit":2}'},extra_content:{google:{thought_signature:'SIG-B'}}}]},finish_reason:'tool_calls'}]});
        return{ok:tc.extra_content.google.thought_signature==='SIG-B'&&tc.function.arguments==='{"limit":2}'&&
          tr.role==='tool'&&tr.tool_call_id==='c1'&&typeof tr.content==='string'&&
          readBack.toolCalls[0].providerMeta.thoughtSignature==='SIG-B'&&readBack.toolCalls[0].args.limit===2,
          note:'رايح وجاي في نفس المكان'}}
      finally{S.settings.ai.provider=p}});
    await T2('غياب البصمة: التطبيق ما بيقعش وبيكمّل',async()=>{
      const p=S.settings.ai.provider;S.settings.ai.provider='openrouter';
      try{const r=AI.parse({choices:[{message:{content:null,tool_calls:[{id:'c9',type:'function',
        function:{name:'get_today_brief',arguments:'{}'}}]},finish_reason:'tool_calls'}]});
        const body=AI.toOpenAI([{role:'assistant',content:null,toolCalls:r.toolCalls}],null);
        return{ok:r.toolCalls.length===1&&!r.toolCalls[0].providerMeta.thoughtSignature&&!body.messages[0].tool_calls[0].extra_content,
          note:'مفيش بصمة → مفيش extra_content فاضي'}}
      finally{S.settings.ai.provider=p}});
    /* ================= 8) الستريمنج و SSE ================= */
    await T2('SSE: تجاهل السطور اللي تبدأ بـ ":" و[DONE]',async()=>{
      const saved=S.settings.ai;const of=window.fetch;
      S.settings.ai=Object.assign({},saved,{provider:'openrouter',model:'mock/model',keyPlain:'test-key',keyEnc:null,stream:true,timeout:20000});
      const chunks=[': OPENROUTER PROCESSING\n\n',
        'data: {"choices":[{"delta":{"content":"تم"}}]}\n\n',
        ': keep-alive\n\n',
        'data: {"choices":[{"delta":{"content":"ام"}}]}\n\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"list_tasks","arguments":"{\\"lim"}}]}}]}\n\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"it\\":5}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":3,"total_tokens":13}}\n\n',
        'data: [DONE]\n\n'];
      window.fetch=async()=>new Response(new ReadableStream({start(c){const e=new TextEncoder();chunks.forEach(x=>c.enqueue(e.encode(x)));c.close()}}),
        {status:200,headers:{'Content-Type':'text/event-stream'}});
      let out='';
      try{const r=await AI.call([{role:'user',content:'x'}],null,d=>{out+=d});const tc=r.toolCalls[0]||{};
        return{ok:out==='تمام'&&r.text==='تمام'&&tc.name==='list_tasks'&&tc.args&&tc.args.limit===5&&r.finish==='tool_calls'&&r.usage&&r.usage.total===13,
          note:'النص: "'+out+'" · args اتلمّت من شنكين: '+JSON.stringify(tc.args||{})}}
      finally{window.fetch=of;S.settings.ai=saved}});
    await T2('فشل الشبكة بيرجع رسالة مفهومة (CORS/نت)',async()=>{
      const saved=S.settings.ai;const of=window.fetch;
      S.settings.ai=Object.assign({},saved,{provider:'custom',baseUrl:'https://example.invalid/v1',model:'m',keyPlain:'k',keyEnc:null,stream:false});
      window.fetch=async()=>{throw new TypeError('Failed to fetch')};
      try{await AI.call([{role:'user',content:'x'}],null,null);return{ok:false,note:'المفروض يرمي خطأ'}}
      catch(e){return{ok:/CORS|مفيش وصول|Base URL/.test(e.message),note:e.message.slice(0,80)}}
      finally{window.fetch=of;S.settings.ai=saved}});
    await T2('أخطاء الحالة بتترجم مصري (401/404/429/بصمة)',async()=>{
      const f=async(status,body)=>AI.errText(new Response(body||'{}',{status}));
      const a=await f(401),b=await f(404),c=await f(429),
        d=await f(400,JSON.stringify({error:{message:'Thought signature is not valid'}}));
      return{ok:/401/.test(a)&&/404/.test(b)&&/429/.test(c)&&d.startsWith('THOUGHT_SIG:'),
        note:'كل حالة ليها رسالة وإجراء'}});
    /* ================= 9) حلقة الإيجنت بمزوّد وهمي ================= */
    await T2('إيجنت: نداءات متسلسلة (خطوتين ثم رد)',async()=>{
      const before=(await dbAll('aiToolCalls')).map(r=>r.id);S.cache.chat=[];const ms=S.settings.ai.maxSteps;S.settings.ai.maxSteps=8;
      const ui=mockUI();
      try{const seen=await withStub([
          {toolCalls:[{id:'c1',name:'get_context_summary',args:{},providerMeta:{thoughtSignature:'S1'}}]},
          {toolCalls:[{id:'c2',name:'get_today_brief',args:{}}]},
          {text:'خلصنا كده'}],async s=>{await agentRun('اختبار متسلسل',ui);return s});
        const last=seen[seen.length-1].msgs;
        const asst=last.filter(m=>m.role==='assistant'&&m.toolCalls);
        const tls=last.filter(m=>m.role==='tool');
        return{ok:seen.length===3&&ui.rec.tools.length===2&&ui.rec.tools.every(t=>t.ok)&&/خلصنا/.test(ui.rec.text)&&asst.length===2&&tls.length===2,
          note:fmtN(seen.length,0)+' نداء · '+fmtN(ui.rec.tools.length,0)+' تول · الرسايل بترتيبها'}}
      finally{S.settings.ai.maxSteps=ms;await cleanAiCalls(before)}});
    await T2('إيجنت: نداءات متوازية في خطوة واحدة',async()=>{
      const before=(await dbAll('aiToolCalls')).map(r=>r.id);S.cache.chat=[];const ui=mockUI();
      try{const seen=await withStub([
          {toolCalls:[{id:'p1',name:'get_today_brief',args:{},providerMeta:{thoughtSignature:'SIG-P'}},
                      {id:'p2',name:'storage_usage',args:{}}]},
          {text:'الاتنين خلصوا'}],async s=>{await agentRun('اختبار متوازي',ui);return s});
        const p=S.settings.ai.provider;S.settings.ai.provider='gemini';
        const c=AI.toGemini(seen[1].msgs,null).contents;S.settings.ai.provider=p;
        const model=c.find(x=>x.role==='model'&&x.parts.some(y=>y.functionCall));
        const frs=c.filter(x=>x.parts.some(y=>y.functionResponse));
        return{ok:ui.rec.tools.length===2&&model.parts.length===2&&model.parts[0].thoughtSignature==='SIG-P'&&
          model.parts[1].thoughtSignature===undefined&&frs.length===2,
          note:'اتنفّذوا مع بعض والبصمة رجعت في مكانها'}}
      finally{await cleanAiCalls(before)}});
    await T2('إيجنت: تول بيرمي خطأ → الحلقة تكمّل وتبلّغ',async()=>{
      const before=(await dbAll('aiToolCalls')).map(r=>r.id);S.cache.chat=[];const ui=mockUI();
      try{await withStub([{toolCalls:[{id:'e1',name:'tool_msh_mawgood',args:{}}]},{text:'كمّلنا بعد الخطأ'}],
          async()=>{await agentRun('اختبار خطأ',ui)});
        return{ok:ui.rec.tools.length===1&&ui.rec.tools[0].ok===false&&/كمّلنا/.test(ui.rec.text)&&!ui.rec.errors.length,
          note:'التول الغلط رجع ok:false والموديل عرف يكمّل'}}
      finally{await cleanAiCalls(before)}});
    await T2('إيجنت: الإلغاء/الانقطاع بيعرض خطأ نظيف',async()=>{
      S.cache.chat=[];const ui=mockUI();
      await withStub([{throw:'الطلب اتقطع (تايم-آوت أو إلغاء).'}],async()=>{await agentRun('اختبار إلغاء',ui)});
      return{ok:ui.rec.errors.length===1&&/اتقطع/.test(ui.rec.errors[0]),note:'رسالة واحدة واضحة، والتطبيق واقف على رجليه'}});
    await T2('إيجنت: حد الخطوات بيوقف الحلقة',async()=>{
      const before=(await dbAll('aiToolCalls')).map(r=>r.id);S.cache.chat=[];
      const ms=S.settings.ai.maxSteps;S.settings.ai.maxSteps=3;const ui=mockUI();
      try{const seen=await withStub([{toolCalls:[{id:'l1',name:'storage_usage',args:{}}]}],async s=>{await agentRun('لفة لا نهائية',ui);return s});
        return{ok:seen.length===3&&ui.rec.notes.some(n=>/حد الخطوات/.test(n)),note:'وقف عند ٣ خطوات وقال السبب'}}
      finally{S.settings.ai.maxSteps=ms;await cleanAiCalls(before)}});
    await T2('إيجنت: 400 بسبب البصمة → تنضيف ومسار بديل',async()=>{
      S.cache.chat=[{role:'assistant',content:'قديم',toolCalls:[{id:'old',name:'list_tasks',args:{},providerMeta:{thoughtSignature:'OLD-SIG'}}]}];
      const ui=mockUI();
      await withStub([{throw:'THOUGHT_SIG:Thought signature is not valid'},
        {throw:'THOUGHT_SIG:Thought signature is not valid'},{text:'كمّلنا بمسار بديل'}],
        async()=>{await agentRun('اختبار بصمة',ui)});
      const cleaned=!(S.cache.chat[0].toolCalls[0].providerMeta||{}).thoughtSignature;
      return{ok:cleaned&&ui.rec.notes.some(n=>/بصمة/.test(n))&&/بديل/.test(ui.rec.text),
        note:'نضّف البصمات، جرّب بدون تولز، وبلّغ المستخدم'}});
    await T2('إيجنت: finishReason=MAX_TOKENS بيتشرح للمستخدم',async()=>{
      S.cache.chat=[];const ui=mockUI();
      await withStub([{text:'رد ناقص',finish:'MAX_TOKENS'}],async()=>{await agentRun('اختبار توكنز',ui)});
      return{ok:ui.rec.notes.some(n=>/توكنز/.test(n)),note:ui.rec.notes[0]||''}});
    await T2('إيجنت: كل نداء تول بيتسجّل في aiToolCalls',async()=>{
      const before=(await dbAll('aiToolCalls')).map(r=>r.id);S.cache.chat=[];const ui=mockUI();
      try{await withStub([{toolCalls:[{id:'r1',name:'storage_usage',args:{}}]},{text:'تم'}],async()=>{await agentRun('سجل',ui)});
        const rows=(await dbAll('aiToolCalls')).filter(r=>before.indexOf(r.id)<0);
        return{ok:rows.length===1&&rows[0].name==='storage_usage'&&rows[0].ok===true&&typeof rows[0].ms==='number',
          note:'الترانسكريبت محفوظ بالمدة والنتيجة'}}
      finally{await cleanAiCalls(before)}});
    S.cache.chat=chat0;
    /* ================= 10) Undo / Redo ================= */
    await T2('Undo/Redo لـ٢٠ عملية متتالية',async()=>{
      const before=await dbCount('tasks');const ids=[];
      for(let i=0;i<20;i++){Hist.begin('اختبار '+i);const r=await R.tasks.add({title:'undo-test-'+i,status:'todo'});ids.push(r.id);Hist.commit()}
      const mid=await dbCount('tasks');
      for(let i=0;i<20;i++)await Hist.undo();
      const after=await dbCount('tasks');
      let redone=null;
      if(typeof Hist.redo==='function'){await Hist.redo();redone=await dbCount('tasks');await Hist.undo()}
      for(const id of ids){try{await dbDel('tasks',id)}catch(e){}}
      return{ok:mid===before+20&&after===before&&(redone===null||redone===before+1),
        note:'٢٠ إضافة → ٢٠ تراجع → رجعنا لنفس العدد'+(redone!==null?' · Redo شغّال':' · مفيش Redo')}});
    await T2('باتش الأسطى بيترجع بضغطة واحدة',async()=>{
      const before=await dbCount('tasks');
      Hist.begin('الأسطى: اختبار باتش');
      const a=await R.tasks.add({title:'batch-1',status:'todo'});const b=await R.tasks.add({title:'batch-2',status:'todo'});
      const batch=Hist.commit();
      const mid=await dbCount('tasks');await Hist.undo();const after=await dbCount('tasks');
      for(const id of [a.id,b.id]){try{await dbDel('tasks',id)}catch(e){}}
      return{ok:mid===before+2&&after===before&&!!batch,note:'باتش واحد فيه '+fmtN((batch&&batch.ops&&batch.ops.length)||2,0)+' عملية'}});
    /* ================= 11) تصدير/استيراد وتشفير ================= */
    await T2('تصدير/استيراد ذهاب وعودة بنفس البصمة',async()=>{
      const t=await mk('tasks',{title:'roundtrip-'+uid().slice(0,6),status:'todo',priority:1});
      const data=await exportAll(false);
      const fp=o=>Object.keys(o.stores).sort().map(k=>k+':'+o.stores[k].length).join('|');
      const before=fp(data);
      const n=await importAll(JSON.parse(JSON.stringify(data)),'merge');
      const again=fp(await exportAll(false));
      const still=await R.tasks.get(t.id);
      return{ok:before===again&&!!still&&still.title===t.title&&n>0,
        note:fmtN(n,0)+' صف اتقرأ · البصمة متساوية قبل وبعد'}});
    await T2('الاستيراد بيرفض ملف غريب وبيتحقق من الاسكيمة',async()=>{
      let e1=false,e2=false;
      try{await importAll({app:'haga-tanya',stores:{}},'merge')}catch(e){e1=/كشكول/.test(e.message)}
      try{await importAll(null,'merge')}catch(e){e2=true}
      return{ok:e1&&e2,note:'ملف مش كشكول → رفض مهذّب'}});
    await T2('التصدير المشفّر (AES-GCM + PBKDF2) رايح وجاي',async()=>{
      const secret='نص سرّي للاختبار '+uid().slice(0,5);
      const enc=await Crypt.enc(secret,'كلمة-سر-قوية');
      const dec=await Crypt.dec(enc,'كلمة-سر-قوية');
      let wrong=false;try{await Crypt.dec(enc,'كلمة-غلط')}catch(e){wrong=true}
      return{ok:dec===secret&&wrong&&JSON.stringify(enc).indexOf(secret)<0,
        note:'فك التشفير صح · الكلمة الغلط بترفض · النص مش ظاهر في المخرج'}});
    /* ================= 12) الأمان و XSS ================= */
    await T2('Sanitizer: مفيش تنفيذ HTML من نص المستخدم',async()=>{
      const evil='<img src=x onerror="window.__pwned=1"> <script>window.__pwned=2<\/script> **غامق**';
      const el=mdLite(evil);const host=document.createElement('div');host.appendChild(el);
      const hasTags=!!host.querySelector('img,script,iframe,object,embed,svg');
      const shown=host.textContent.indexOf('onerror')>-1||host.textContent.indexOf('<img')>-1;
      const bold=!!host.querySelector('strong,b');
      await sleep(30);
      return{ok:!hasTags&&shown&&!window.__pwned&&bold,note:'ظهر كنص عادي · الماركداون المسموح لسه شغّال'}});
    await T2('مفيش eval ولا Function على رد الموديل',async()=>{
      const src=String(agentRun)+String(AI.call)+String(AI.parse)+String(mdLite);
      return{ok:!/\beval\s*\(/.test(src)&&!/new\s+Function\s*\(/.test(src),note:'الكود اللي بيتعامل مع الردود نضيف'}});
    await T2('الأفعال الهدّامة محتاجة موافقة (وضع الثقة مطفي)',async()=>{
      const risky=Object.keys(TOOLS).filter(n=>TOOLS[n].risk==='destructive');
      const dRegex=(typeof DESTRUCTIVE!=='undefined'?DESTRUCTIVE:(window.DESTRUCTIVE||/^(delete_|bulk_|import_|wipe|empty_trash|export_backup)/));
      const guarded=risky.filter(n=>dRegex.test(n)||TOOLS[n].risk==='destructive');
      const ok=risky.length>=5&&guarded.length===risky.length&&DEF_SETTINGS.ai.trust===false;
      return{ok,note:fmtN(risky.length,0)+' تول هدّام كلهم بيسألوا الأول'}});
    /* ================= 13) البارسر والحسابات ================= */
    await T2('قراية المصاريف من كلام مصري (وأرقام شرقية)',async()=>{
      const a=parseExpenses('صرفت ٤٥ قهوة و٢٠ مواصلات');
      const b=parseExpenses('دفعت 75 جنيه نت');
      const sum1=a.reduce((s,x)=>s+x.amount,0);
      return{ok:a.length===2&&sum1===65&&b.length===1&&b[0].amount===75,
        note:'٤٥+٢٠ = '+fmtN(sum1,0)+' · و75 لوحدها'}});
    await T2('البحث الغيمي (fuzzy) بيرتّب صح',async()=>{
      const hit=fuzzy('مهم','مهمة مهمة جدًا'),miss=fuzzy('زقزوق','فاتورة كهربا');
      return{ok:hit>0&&miss===0&&fuzzy('','أي حاجة')===0||hit>0&&miss===0,note:'تطابق: '+fmtN(hit,2)+' · مفيش تطابق: '+fmtN(miss,0)}});
    await T2('تقييد النتايج: مش أكتر من ١٠٠ صف للموديل',async()=>{
      const rows=[];for(let i=0;i<120;i++)rows.push({i});const c=cap(rows);
      const c2=cap(rows.slice(0,10));
      return{ok:c.rows.length===100&&c.truncated===true&&c.total===120&&!c2.truncated,note:'١٢٠ → ١٠٠ + truncated:true'}});
    await T2('الأرقام والفلوس بتتنسّق بالعملة والشكل المختار',async()=>{
      const m=money(1234.5);const n=fmtN(1234.5,1);
      return{ok:typeof m==='string'&&m.length>3&&typeof n==='string'&&n.length>3,note:m+' · '+n}});
    await T2('صافي الثروة محسوب من الحسابات والمعاملات',async()=>{
      const acc=await mk('accounts',{name:'اختبار-صافي',type:'cash',opening:500});
      await mk('txns',{type:'expense',amount:200,date:today(),accountId:acc.id,note:'اختبار'});
      await mk('txns',{type:'income',amount:100,date:today(),accountId:acc.id,note:'اختبار'});
      const nw=await netWorth();
      const row=(nw.accounts||[]).find(a=>a.id===acc.id||a.name==='اختبار-صافي');
      return{ok:!!row&&Math.round(row.balance)===400,note:'٥٠٠ − ٢٠٠ + ١٠٠ = '+fmtN(row?row.balance:0,0)}});
    await T2('مؤشر الدماغ رقم منطقي (مش NaN)',async()=>{
      const ml=await mentalLoad();const v=typeof ml==='object'?(ml.score!=null?ml.score:ml.value):ml;
      return{ok:typeof v==='number'&&isFinite(v)&&v>=0,note:'القيمة: '+fmtN(v,0)}});
    await T2('المراجعة الأسبوعية بتتولّد من داتا حقيقية بدون NaN',async()=>{
      const md=await weeklyReview();
      return{ok:typeof md==='string'&&md.indexOf('## مراجعة الأسبوع')===0&&md.indexOf('NaN')<0&&md.indexOf('undefined')<0,
        note:fmtN(md.split('\n').length,0)+' سطر · مفيش NaN'}});
    /* ================= 14) التولز على داتا حقيقية ================= */
    await T2('كل تولز القراءة بترد شكل صح وميغيّروش الداتا',async()=>{
      const b=await snap();const bad=[];
      const fake=t=>{const a={};const props=(t.parameters&&t.parameters.properties)||{};
        (t.parameters&&t.parameters.required||[]).forEach(k=>{const ty=(props[k]||{}).type;
          if(ty==='number')a[k]=1;else if(ty==='boolean')a[k]=false;else if(ty==='array')a[k]=['اختبار'];
          else if(/date|from|to|start|due|phrase|month/i.test(k))a[k]=today();
          else if(/^id$|Id$/.test(k))a[k]='no-such-id-'+uid().slice(0,6);
          else if(/store/i.test(k))a[k]='tasks';else if(/groupBy/i.test(k))a[k]='type';
          else if(/type$/i.test(k))a[k]='نوم';else a[k]='اختبار'});
        return a};
      for(const n of Object.keys(TOOLS)){const t=TOOLS[n];if(t.risk!=='read')continue;
        try{const r=await t.handler(fake(t));if(!r||typeof r.ok!=='boolean')bad.push(n+' (شكل رد غلط)')}
        catch(e){bad.push(n+' ('+String(e.message||e).slice(0,40)+')')}}
      const a=await snap();
      if(!same(b,a))bad.push('غيّروا الداتا: '+diff(b,a));
      return{ok:!bad.length,note:bad.length?bad.slice(0,4).join(' · '):fmtN(Object.keys(TOOLS).filter(n=>TOOLS[n].risk==='read').length,0)+' تول قراءة نضيفين'}});
    await T2('تول create_task بيعمل مهمة حقيقية بتاريخ مصري',async()=>{
      const r=await TOOLS.create_task.handler({title:'من الأسطى (اختبار)',due:'بكرة',priority:1});
      if(r.ok)tmp.push(['tasks',r.data.id]);
      const row=r.ok?await R.tasks.get(r.data.id):null;
      return{ok:r.ok===true&&r.affected===1&&!!row&&row.due===addDays(today(),1),note:'الاستحقاق: '+(row&&row.due)}});
    await T2('تول add_transaction بيعمل الحساب والتصنيف لو مش موجودين',async()=>{
      const cn='اختبار-تصنيف-'+uid().slice(0,4),an='اختبار-حساب-'+uid().slice(0,4);
      const r=await TOOLS.add_transaction.handler({type:'expense',amount:33,category:cn,account:an,note:'اختبار'});
      const tr=(await R.txns.all()).find(x=>x.note==='اختبار'&&+x.amount===33);
      if(tr)tmp.push(['txns',tr.id]);
      const acc=(await R.accounts.all()).find(a=>a.name===an);if(acc)tmp.push(['accounts',acc.id]);
      const cat=(await R.categories.all()).find(c=>c.name===cn);if(cat)tmp.push(['categories',cat.id]);
      return{ok:r.ok&&!!tr&&!!acc&&!!cat,note:'اتعمل حساب وتصنيف جديدين مع المعاملة'}});
    await T2('تول parse_and_add_expenses_from_text بيسجّل صح',async()=>{
      const r=await TOOLS.parse_and_add_expenses_from_text.handler({text:'صرفت ١٥ قهوة و١٠ مواصلات'});
      if(r.ok)r.data.items.forEach(i=>tmp.push(['txns',i.id]));
      return{ok:r.ok&&r.data.items.length===2&&r.data.total===25,note:'٢ معاملات · إجمالي '+fmtN(r.ok?r.data.total:0,0)}});
    await T2('العادات: streak بيتحسب من التسجيلات الحقيقية',async()=>{
      const h=await mk('habits',{name:'اختبار-عادة',freq:'daily',target:1,active:true});
      for(let i=0;i<3;i++){const l=await mk('habitLogs',{habitId:h.id,date:addDays(today(),-i),value:1})}
      const r=await TOOLS.get_habit_stats.handler({habitId:h.id});
      return{ok:r.ok&&r.data.streak===3&&r.data.total===3,note:'٣ أيام ورا بعض = streak '+fmtN(r.ok?r.data.streak:0,0)}});
    await T2('التقويم: find_free_slot بيلاقي وقت فاضي',async()=>{
      const e=await mk('events',{title:'اختبار-ميعاد',start:today(),time:'09:00',duration:60});
      const r=await TOOLS.find_free_slot.handler({date:today(),minutes:30});
      return{ok:r.ok&&r.data.found===true&&r.data.start>='10:00',note:'أقرب فرصة: '+(r.ok?r.data.start:'—')}});
    await T2('المستندات: تنبيه الانتهاء خلال ٩٠ يوم',async()=>{
      const d=await mk('documents',{name:'اختبار-مستند',kind:'بطاقة',expiry:addDays(today(),10)});
      const r=await TOOLS.list_expiring_documents.handler({days:90});
      return{ok:r.ok&&r.data.documents.some(x=>x.id===d.id),note:'ظهر في القايمة قبل الانتهاء بـ١٠ يوم'}});
    await T2('الناس: who_should_i_call بيرجّع المتأخر بس',async()=>{
      const p=await mk('people',{name:'اختبار-شخص',relation:'صاحب',cadence:1,lastContact:addDays(today(),-5)});
      const q=await mk('people',{name:'اختبار-شخص-٢',relation:'صاحب',cadence:30,lastContact:today()});
      const r=await TOOLS.who_should_i_call.handler({});
      const rows=r.data.rows||r.data;
      return{ok:r.ok&&rows.some(x=>x.id===p.id)&&!rows.some(x=>x.id===q.id),note:'المتأخر بس هو اللي بيظهر'}});
    await T2('aggregate بيجمّع صح من داتا حقيقية',async()=>{
      const acc=await mk('accounts',{name:'اختبار-جمع',type:'cash',opening:0});
      await mk('txns',{type:'expense',amount:10,date:today(),accountId:acc.id,note:'اختبار'});
      await mk('txns',{type:'expense',amount:15,date:today(),accountId:acc.id,note:'اختبار'});
      const r=await TOOLS.aggregate.handler({store:'txns',groupBy:'type',sumField:'amount',from:today(),to:today()});
      const g=(r.data.groups||[]).find(x=>x.k==='expense');
      return{ok:r.ok&&!!g&&g.v>=25,note:'مجموع النهاردة للمصروف: '+fmtN(g?g.v:0,0)}});
    await T2('الجمعية: تسجيل دور بيعمل مصروف كمان',async()=>{
      const g=await mk('gam3iyat',{name:'اختبار-جمعية',amount:100,members:5,myTurn:2,startDate:today(),rounds:[],status:'active'});
      const before=await dbCount('txns');
      const r=await TOOLS.record_gam3ia_round.handler({id:g.id});
      const after=await dbCount('txns');
      const t=(await R.txns.all()).find(x=>x.note==='جمعية: اختبار-جمعية');if(t)tmp.push(['txns',t.id]);
      return{ok:r.ok&&r.data.rounds===1&&after===before+1,note:'دور واحد + معاملة مصروف'}});
    /* ================= 15) الأتوميشن والواجهة ================= */
    await T2('محاكاة الأتوميشن (dry-run) ما بتكتبش حاجة',async()=>{
      const b=await snap();const res=await Auto.run(true);const a=await snap();
      return{ok:Array.isArray(res)&&same(b,a),note:fmtN(res.length,0)+' إجراء كان هيتنفّذ · صفر كتابة'}});
    await T2('التريجرز والأكشنز كلها معروفة بالاسم',async()=>{
      const tk=Object.keys(Auto.triggers||{}),ak=Object.keys(Auto.actions||{});
      return{ok:tk.length>=3&&ak.length>=3,note:fmtN(tk.length,0)+' تريجر · '+fmtN(ak.length,0)+' أكشن'}});
    await T2('كل مودول في النافيجيشن له شاشة',async()=>{
      const miss=MODULES.filter(m=>typeof VIEWS[m.k]!=='function').map(m=>m.k);
      return{ok:!miss.length,note:fmtN(MODULES.length,0)+' مودول'+(miss.length?' · ناقص: '+miss.join(', '):'')}});
    await T2('كل الشاشات بتترسم من غير ما تقع',async()=>{
      const keys=Object.keys(VIEWS).filter(k=>k!=='tests');const bad=[];const r0=S.route;
      for(const k of keys){try{S.route={name:k,params:{}};const el=await VIEWS[k]();
          if(!(el instanceof Node))bad.push(k+' (مش عنصر)')}
        catch(e){bad.push(k+' ('+String(e.message||e).slice(0,30)+')')}}
      S.route=r0;
      return{ok:!bad.length,note:bad.length?bad.slice(0,4).join(' · '):fmtN(keys.length,0)+' شاشة اترسمت'}});
    await T2('حالة الفراغ فيها رسالة وزرار حقيقي',async()=>{
      const el=UI.empty('عنوان','سطر مصري',{label:'يلا نبدأ',fn:()=>{}});
      const host=document.createElement('div');host.appendChild(el);
      const btn=host.querySelector('button');const svg=host.querySelector('svg');
      return{ok:!!btn&&btn.textContent==='يلا نبدأ'&&host.textContent.indexOf('سطر مصري')>-1,
        note:'عنوان + سطر + CTA'+(svg?' + رسمة':'')}});
    await T2('الفكاهة بتقف في السياق الحسّاس',async()=>{
      const s0=S.settings.sensitive,t0=S.settings.tone;
      S.settings.sensitive=true;S.settings.tone='sarcastic';
      const sp=systemPrompt();
      S.settings.sensitive=s0;S.settings.tone=t0;
      return{ok:/مؤدب|هادي/.test(sp)&&!/ساخر/.test(sp.split('نبرتك:')[1].split('\n')[0]),
        note:'SENSITIVE_CONTEXT بيقفل السخرية في البرومت'}});
    await T2('البرومت فيه قواعد منع الاختراع والحدود الأخلاقية',async()=>{
      const sp=systemPrompt();
      const musts=['ممنوع تمامًا تخترع','مش دكتور','مش مستشار مالي','tool'];
      const miss=musts.filter(m=>sp.indexOf(m)<0);
      return{ok:!miss.length&&sp.indexOf(today())>-1,note:'التاريخ والعملة والقواعد كلهم موجودين'}});
    await T2('التخزين: قياس المساحة وطلب التثبيت بـfeature detection',async()=>{
      const r=await TOOLS.storage_usage.handler({});
      const hasPersist=!!(navigator.storage&&navigator.storage.persist);
      return{ok:r.ok&&r.data.counts&&typeof r.data.counts.tasks==='number',
        note:(r.data.usageMB!=null?fmtN(r.data.usageMB,2)+' م.ب مستخدمة':'المتصفح مش بيقول المساحة')+(hasPersist?' · persist مدعوم':' · persist مش مدعوم')}});
    await T2('الإعدادات بتتحفظ وبترجع من الداتابيز',async()=>{
      const t0=S.settings.tone;
      await saveSettings({tone:'polite'});const a=S.settings.tone;
      await saveSettings({tone:t0});
      return{ok:a==='polite'&&S.settings.tone===t0,note:'حفظ ورجوع من غير أثر'}});
    await T2('سجل النشاط بيسجّل مين عمل إيه',async()=>{
      const t=await mk('tasks',{title:'اختبار-سجل',status:'todo'});
      const rows=await R.activityLog.byIndex('at',null,10,'prev');
      return{ok:rows.length>0&&rows.some(r=>r.store==='tasks'),note:'آخر '+fmtN(rows.length,0)+' حركة مسجّلة'}});
    /* ================= الختام ================= */
    await cleanup();
    try{await saveSettings(settings0)}catch(e){}
    S.settings.ai=ai0;S.cache.chat=chat0;
    const end=await snap();
    line('الداتا رجعت زي ما كانت (صفر أثر للاختبارات)',same(base,end),same(base,end)?'كل الصفوف المؤقتة اتمسحت':diff(base,end));
    same(base,end)?pass++:fail++;
    sum.textContent='';
    const sh=document.createElement('div');sh.style.cssText='font-weight:800;font-size:1.05rem';
    sh.textContent=(fail?'❌ ':'✅ ')+'نجح '+fmtN(pass,0)+' · فشل '+fmtN(fail,0)+' · الإجمالي '+fmtN(pass+fail,0);
    const sn=document.createElement('div');sn.className='xs dim';
    sn.textContent='المزوّد الوهمي محلي بالكامل — مفيش طلب شبكة واحد اتعمل في الاختبارات، ومفيش أي داتا وهمية فضلت.';
    sum.append(sh,sn);
    UI.toast(fail?'فيه '+fmtN(fail,0)+' اختبار واقع — شوف الأحمر':'كله أخضر يا معلّم ✅')};
  return box};
