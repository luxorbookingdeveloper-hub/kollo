/* ============================================================================
   كله — Kollo | Common Helpers (Finance, SRS, Forms, CollectionView)
   ============================================================================ */
async function txnsBetween(a, b) {
  return R.txns.byIndex('date', IDBKeyRange.bound(a, b));
}

async function budgetStatus(mk) {
  const buds = (await R.budgets.all()).filter(b => b.month === mk);
  const cats = await R.categories.all();
  const tx = await txnsBetween(mk + '-01', mk + '-31');
  const out = [];
  for (const b of buds) {
    const spent = tx
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((s, t) => s + Math.abs(+t.amount || 0), 0);
    const c = cats.find(c => c.id === b.categoryId);
    out.push({
      id: b.id,
      category: c ? c.name : '—',
      categoryId: b.categoryId,
      amount: +b.amount || 0,
      limit: +b.amount || 0,
      spent,
      pct: b.amount ? Math.round(spent / b.amount * 100) : 0,
      left: (+b.amount || 0) - spent
    });
  }
  return out.sort((x, y) => y.pct - x.pct);
}

async function netWorth() {
  const acc = await R.accounts.all();
  const tx = await R.txns.all();
  const bal = {};
  acc.forEach(a => bal[a.id] = +a.opening || 0);

  tx.forEach(t => {
    const v = +t.amount || 0;
    if (t.type === 'income') bal[t.accountId] = (bal[t.accountId] || 0) + v;
    else if (t.type === 'expense') bal[t.accountId] = (bal[t.accountId] || 0) - Math.abs(v);
    else if (t.type === 'transfer') {
      bal[t.accountId] = (bal[t.accountId] || 0) - Math.abs(v);
      if (t.toAccountId) bal[t.toAccountId] = (bal[t.toAccountId] || 0) + Math.abs(v);
    }
  });

  const debts = await R.debts.all();
  const owe = debts.filter(d => d.dir === 'owe' && d.status !== 'closed').reduce((s, d) => s + (+d.remaining || +d.amount || 0), 0);
  const lent = debts.filter(d => d.dir === 'lent' && d.status !== 'closed').reduce((s, d) => s + (+d.remaining || +d.amount || 0), 0);
  const assets = acc.reduce((s, a) => s + (bal[a.id] || 0), 0);
  return {
    accounts: acc.map(a => ({ id: a.id, name: a.name, type: a.type, balance: bal[a.id] || 0 })),
    cash: assets,
    owe,
    lent,
    net: assets + lent - owe
  };
}

const CAT_HINTS = {
  'قهوة': 'أكل وشرب', 'كافيه': 'أكل وشرب', 'اكل': 'أكل وشرب', 'أكل': 'أكل وشرب', 'غدا': 'أكل وشرب',
  'عشا': 'أكل وشرب', 'سوبر ماركت': 'أكل وشرب', 'مواصلات': 'مواصلات', 'اوبر': 'مواصلات', 'تاكسي': 'مواصلات',
  'مترو': 'مواصلات', 'بنزين': 'مواصلات', 'ايجار': 'إيجار', 'إيجار': 'إيجار', 'كهربا': 'فواتير', 'غاز': 'فواتير',
  'نت': 'فواتير', 'مياه': 'فواتير', 'تليفون': 'فواتير', 'دوا': 'صحة', 'دكتور': 'صحة', 'صيدلية': 'صحة',
  'سيجارة': 'متنوع', 'هدية': 'هدايا', 'قسط': 'أقساط', 'اشتراك': 'اشتراكات', 'مدرسة': 'تعليم', 'كورس': 'تعليم', 'سينما': 'ترفيه'
};

async function ensureCategory(name, kind) {
  const cats = await R.categories.all();
  let c = cats.find(x => x.name === name);
  if (c) return c;
  return R.categories.add({ name, kind: kind || 'expense' });
}

async function defaultAccount() {
  const acc = await R.accounts.all();
  if (acc.length) return acc[0];
  return R.accounts.add({ name: 'كاش', type: 'cash', opening: 0 });
}

function parseExpenses(text) {
  const norm = String(text || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const parts = norm.split(/[،,\n]|(?:\s+و(?=\d|\s))/).map(s => s.trim()).filter(Boolean);
  const out = [];
  parts.forEach(p => {
    const m = p.match(/(-?\d+(?:[.,]\d+)?)/);
    if (!m) return;
    const amount = Math.abs(parseFloat(m[1].replace(',', '.')));
    const label = p.replace(m[1], '').replace(/جنيه|ج\.م|جنية|EGP/gi, '').trim() || 'مصروف';
    let cat = 'متنوع';
    for (const k in CAT_HINTS) {
      if (label.includes(k)) {
        cat = CAT_HINTS[k];
        break;
      }
    }
    out.push({ label, amount, category: cat });
  });
  return out;
}

/* SRS — SM-2 */
function sm2(card, grade) {
  /* grade 0..5 */
  let ef = card.ef == null ? 2.5 : card.ef, rep = card.reps || 0, iv = card.interval || 0;
  if (grade < 3) {
    rep = 0;
    iv = 1;
  } else {
    ef = clamp(ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)), 1.3, 2.8);
    rep++;
    iv = rep === 1 ? 1 : rep === 2 ? 6 : Math.round(iv * ef);
  }
  return { ef, reps: rep, interval: iv, due: addDays(today(), iv), lastGrade: grade };
}

/* نبرة الكلام: مؤدب / بلدي / ساخر */
const TONE = {
  polite: {
    save: 'اتحفظ ✅',
    del: 'اتحذف، وموجود في السلة لو غيّرت رأيك.',
    late: 'المهمة دي فاتت — عايز تأجّلها؟',
    empty: 'مفيش حاجة هنا لسه — ابدأ بأول واحدة.',
    done: 'تمام، خلصنا.',
    hi: 'أهلاً بيك'
  },
  baladi: {
    save: 'اتحفظ ✅ يا معلم',
    del: 'مشيناها — في سلة المهملات لو ندمت.',
    late: 'دي فاتت من إمبارح… نأجّلها ولا هتخلّصها؟',
    empty: 'مفيش حاجة هنا لسه… سجّل أول واحدة وابدأ.',
    done: 'خلاص؟ تمام.',
    hi: 'إزيك يا'
  },
  sarcastic: {
    save: 'حفظنا… ياريت المرة الجاية تخلّصها كمان ✅',
    del: 'مسحناها زي ما مسحنا خطط السنة اللي فاتت.',
    late: 'المهمة دي بقالها فترة بتتفرج علينا. نأجّلها تاني؟',
    empty: 'فاضي زي محفظتي آخر الشهر — يلا سجّل حاجة.',
    done: 'خلصت؟ مش متوقع بصراحة.',
    hi: 'يا واد يا'
  }
};

const T = k => {
  const t = S.settings.sensitive ? TONE.polite : (TONE[S.settings.tone] || TONE.baladi);
  return t[k] || TONE.polite[k] || '';
};

const FLDS = {
  tasks: [
    { k: 'title', l: 'المهمة', t: 'text', req: true },
    { k: 'due', l: 'موعدها', t: 'date' },
    { k: 'priority', l: 'الأولوية', t: 'select', opts: [{ v: 1, l: 'مهم وعاجل' }, { v: 2, l: 'مهم' }, { v: 3, l: 'عادي' }, { v: 4, l: 'لما يحصل' }] },
    { k: 'estimate', l: 'تقدير الوقت (دقيقة)', t: 'number' },
    { k: 'tags', l: 'تاجات (بفاصلة)', t: 'tags' },
    { k: 'note', l: 'ملاحظات', t: 'textarea' }
  ],
  projects: [
    { k: 'name', l: 'اسم المشروع', t: 'text', req: true },
    { k: 'status', l: 'الحالة', t: 'select', opts: [{ v: 'active', l: 'شغّال' }, { v: 'paused', l: 'واقف' }, { v: 'done', l: 'خلص' }] },
    { k: 'due', l: 'الديدلاين', t: 'date' },
    { k: 'note', l: 'وصف', t: 'textarea' }
  ],
  habits: [
    { k: 'name', l: 'العادة', t: 'text', req: true },
    { k: 'freq', l: 'التكرار', t: 'select', opts: [{ v: 'daily', l: 'كل يوم' }, { v: 'weekly', l: 'أسبوعي' }, { v: 'count', l: 'عدد مرات في الأسبوع' }] },
    { k: 'target', l: 'الهدف (مرات/كمية)', t: 'number' },
    { k: 'unit', l: 'الوحدة', t: 'text', ph: 'مرة، صفحة، دقيقة' },
    { k: 'freezeDays', l: 'أيام تجميد مسموحة', t: 'number' }
  ],
  events: [
    { k: 'title', l: 'الميعاد', t: 'text', req: true },
    { k: 'start', l: 'التاريخ', t: 'date', req: true },
    { k: 'time', l: 'الساعة', t: 'time' },
    { k: 'prep', l: 'وقت التحضير/السفر (دقيقة)', t: 'number' },
    { k: 'place', l: 'المكان', t: 'text' },
    { k: 'repeat', l: 'تكرار', t: 'select', opts: [{ v: '', l: 'مرة واحدة' }, { v: 'daily', l: 'يومي' }, { v: 'weekly', l: 'أسبوعي' }, { v: 'monthly', l: 'شهري' }, { v: 'yearly', l: 'سنوي' }] }
  ],
  notes: [
    { k: 'title', l: 'العنوان', t: 'text', req: true },
    { k: 'body', l: 'المحتوى (ماركداون-لايت + [[روابط]])', t: 'textarea' },
    { k: 'tags', l: 'وسوم', t: 'tags' },
    { k: 'pinned', l: 'مثبّتة', t: 'switch' }
  ],
  accounts: [
    { k: 'name', l: 'اسم الحساب', t: 'text', req: true },
    { k: 'type', l: 'النوع', t: 'select', opts: [{ v: 'cash', l: 'كاش' }, { v: 'bank', l: 'بنك' }, { v: 'wallet', l: 'محفظة' }] },
    { k: 'opening', l: 'الرصيد الافتتاحي', t: 'money' }
  ],
  debts: [
    { k: 'name', l: 'مع مين', t: 'text', req: true },
    { k: 'dir', l: 'النوع', t: 'select', opts: [{ v: 'owe', l: 'عليّ' }, { v: 'lent', l: 'ليّ' }] },
    { k: 'amount', l: 'المبلغ', t: 'money', req: true },
    { k: 'due', l: 'موعد السداد', t: 'date' },
    { k: 'note', l: 'ملاحظة', t: 'textarea' }
  ],
  subscriptions: [
    { k: 'name', l: 'الاشتراك', t: 'text', req: true },
    { k: 'amount', l: 'المبلغ', t: 'money', req: true },
    { k: 'cycle', l: 'الدورة', t: 'select', opts: [{ v: 'monthly', l: 'شهري' }, { v: 'yearly', l: 'سنوي' }, { v: 'weekly', l: 'أسبوعي' }] },
    { k: 'nextDue', l: 'الجاي', t: 'date' }
  ],
  installments: [
    { k: 'name', l: 'القسط', t: 'text', req: true },
    { k: 'amount', l: 'قيمة القسط', t: 'money', req: true },
    { k: 'count', l: 'عدد الأقساط', t: 'number' },
    { k: 'paid', l: 'المدفوع', t: 'number' },
    { k: 'due', l: 'موعد القسط الجاي', t: 'date' }
  ],
  gam3iyat: [
    { k: 'name', l: 'الجمعية', t: 'text', req: true },
    { k: 'amount', l: 'القسط الشهري', t: 'money', req: true },
    { k: 'members', l: 'عدد الأعضاء', t: 'number', req: true },
    { k: 'myTurn', l: 'دوري رقم', t: 'number' },
    { k: 'startDate', l: 'بدأت في', t: 'date' }
  ],
  goals: [
    { k: 'title', l: 'الهدف', t: 'text', req: true },
    { k: 'area', l: 'مجال الحياة', t: 'select', opts: ['شغل', 'صحة', 'فلوس', 'أهل', 'تعلّم', 'روحاني', 'ترفيه'].map(v => ({ v, l: v })) },
    { k: 'horizon', l: 'المدى', t: 'select', opts: [{ v: 'year', l: 'سنوي' }, { v: 'quarter', l: 'ربع سنة' }, { v: 'month', l: 'شهري' }] },
    { k: 'why', l: 'ليه مهم؟', t: 'textarea' }
  ],
  people: [
    { k: 'name', l: 'الاسم', t: 'text', req: true },
    { k: 'relation', l: 'القرابة/الصلة', t: 'text' },
    { k: 'phone', l: 'تليفون', t: 'text' },
    { k: 'birthday', l: 'عيد الميلاد', t: 'date' },
    { k: 'cadence', l: 'أطمن عليه كل (يوم)', t: 'number' }
  ],
  socialDuties: [
    { k: 'title', l: 'الواجب', t: 'text', req: true },
    { k: 'kind', l: 'النوع', t: 'select', opts: ['فرح', 'عزاء', 'عزومة', 'ولادة', 'خطوبة'].map(v => ({ v, l: v })) },
    { k: 'date', l: 'التاريخ', t: 'date' },
    { k: 'amount', l: 'المبلغ', t: 'money' },
    { k: 'personId', l: 'الشخص (ID)', t: 'text' }
  ],
  healthLogs: [
    { k: 'type', l: 'النوع', t: 'select', opts: ['نوم', 'مياه', 'تمرين', 'ضغط', 'سكر', 'نبض', 'ملاحظة'].map(v => ({ v, l: v })) },
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'value', l: 'القيمة', t: 'text' },
    { k: 'note', l: 'ملاحظة', t: 'textarea' }
  ],
  meds: [
    { k: 'name', l: 'الدوا', t: 'text', req: true },
    { k: 'dose', l: 'الجرعة (زي ما الدكتور قال)', t: 'text' },
    { k: 'times', l: 'المواعيد', t: 'text', ph: '٨ص، ٨م' },
    { k: 'stock', l: 'العلبة فيها كام', t: 'number' },
    { k: 'active', l: 'شغّال', t: 'switch' }
  ],
  moodLogs: [
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'mood', l: 'المزاج (1-5)', t: 'number', req: true },
    { k: 'energy', l: 'الطاقة (1-5)', t: 'number' },
    { k: 'reasons', l: 'أسباب', t: 'tags' }
  ],
  journal: [
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'body', l: 'اكتب اللي في دماغك', t: 'textarea', req: true },
    { k: 'gratitude', l: 'حاجة إنت شاكر عليها', t: 'text' }
  ],
  books: [
    { k: 'title', l: 'الكتاب', t: 'text', req: true },
    { k: 'author', l: 'المؤلف', t: 'text' },
    { k: 'pages', l: 'عدد الصفحات', t: 'number' },
    { k: 'page', l: 'واقف عند صفحة', t: 'number' },
    { k: 'status', l: 'الحالة', t: 'select', opts: [{ v: 'reading', l: 'بقراه' }, { v: 'done', l: 'خلصته' }, { v: 'later', l: 'بعدين' }] }
  ],
  courses: [
    { k: 'title', l: 'الكورس', t: 'text', req: true },
    { k: 'provider', l: 'الجهة', t: 'text' },
    { k: 'progress', l: 'التقدّم %', t: 'number' },
    { k: 'status', l: 'الحالة', t: 'select', opts: [{ v: 'active', l: 'شغّال' }, { v: 'done', l: 'خلص' }] }
  ],
  assets: [
    { k: 'name', l: 'الحاجة', t: 'text', req: true },
    { k: 'category', l: 'التصنيف', t: 'select', opts: ['أجهزة', 'أثاث', 'عربية', 'عقار', 'متنوع'].map(v => ({ v, l: v })) },
    { k: 'value', l: 'قيمتها', t: 'money' },
    { k: 'boughtAt', l: 'اتشترت', t: 'date' }
  ],
  warranties: [
    { k: 'name', l: 'الضمان لإيه', t: 'text', req: true },
    { k: 'expiry', l: 'ينتهي في', t: 'date', req: true },
    { k: 'note', l: 'ملاحظة', t: 'textarea' }
  ],
  vehicles: [
    { k: 'name', l: 'العربية', t: 'text', req: true },
    { k: 'plate', l: 'اللوحة', t: 'text' },
    { k: 'km', l: 'العدّاد', t: 'number' }
  ],
  maintenance: [
    { k: 'title', l: 'الصيانة', t: 'text', req: true },
    { k: 'vehicleId', l: 'العربية (ID)', t: 'text' },
    { k: 'due', l: 'موعدها', t: 'date' },
    { k: 'km', l: 'عند كم كيلو', t: 'number' },
    { k: 'cost', l: 'التكلفة', t: 'money' }
  ],
  bills: [
    { k: 'kind', l: 'النوع', t: 'select', opts: ['كهربا', 'مياه', 'غاز', 'نت', 'تليفون'].map(v => ({ v, l: v })) },
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'reading', l: 'القراية', t: 'number' },
    { k: 'amount', l: 'المبلغ', t: 'money' }
  ],
  documents: [
    { k: 'name', l: 'المستند', t: 'text', req: true },
    { k: 'kind', l: 'النوع', t: 'select', opts: ['بطاقة', 'باسبور', 'رخصة', 'تأشيرة', 'تأمين', 'عقد', 'متنوع'].map(v => ({ v, l: v })) },
    { k: 'expiry', l: 'ينتهي في', t: 'date' },
    { k: 'note', l: 'ملاحظة', t: 'textarea' }
  ],
  shoppingItems: [
    { k: 'name', l: 'الحاجة', t: 'text', req: true },
    { k: 'qty', l: 'الكمية', t: 'text' },
    { k: 'section', l: 'القسم', t: 'select', opts: ['خضار', 'بقالة', 'لحمة', 'منظفات', 'متنوع'].map(v => ({ v, l: v })) }
  ],
  pantry: [
    { k: 'name', l: 'المخزون', t: 'text', req: true },
    { k: 'qty', l: 'الكمية', t: 'text' },
    { k: 'expiry', l: 'الصلاحية', t: 'date' }
  ],
  recipes: [
    { k: 'name', l: 'الوصفة', t: 'text', req: true },
    { k: 'ingredients', l: 'المكوّنات (بفاصلة)', t: 'tags' },
    { k: 'steps', l: 'الخطوات', t: 'textarea' }
  ],
  timeLogs: [
    { k: 'title', l: 'إيه اللي عملته', t: 'text', req: true },
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'minutes', l: 'الدقايق', t: 'number', req: true },
    { k: 'projectId', l: 'مشروع (ID)', t: 'text' }
  ],
  clients: [
    { k: 'name', l: 'العميل', t: 'text', req: true },
    { k: 'rate', l: 'سعر الساعة', t: 'money' },
    { k: 'note', l: 'ملاحظة', t: 'textarea' }
  ],
  invoices: [
    { k: 'number', l: 'رقم الفاتورة', t: 'text', req: true },
    { k: 'clientId', l: 'العميل (ID)', t: 'text' },
    { k: 'amount', l: 'المبلغ', t: 'money', req: true },
    { k: 'due', l: 'الاستحقاق', t: 'date' },
    { k: 'status', l: 'الحالة', t: 'select', opts: [{ v: 'open', l: 'مفتوحة' }, { v: 'paid', l: 'اتحصلت' }] }
  ],
  worship: [
    { k: 'kind', l: 'النوع', t: 'select', opts: ['صلاة', 'ورد قرآن', 'أذكار', 'صيام', 'صدقة'].map(v => ({ v, l: v })) },
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'value', l: 'الكمية/ملاحظة', t: 'text' }
  ],
  automations: [
    { k: 'name', l: 'اسم الأوتوميشن', t: 'text', req: true },
    { k: 'trigger', l: 'المُشغِّل', t: 'select', opts: Object.keys(window.Auto && window.Auto.triggers ? window.Auto.triggers : {}).map(v => ({ v, l: window.Auto.triggers[v] })) },
    { k: 'action', l: 'الإجراء', t: 'select', opts: Object.keys(window.Auto && window.Auto.actions ? window.Auto.actions : {}).map(v => ({ v, l: window.Auto.actions[v] })) },
    { k: 'active', l: 'شغّال', t: 'switch' }
  ],
  cards: [
    { k: 'front', l: 'الوش', t: 'textarea', req: true },
    { k: 'back', l: 'الضهر', t: 'textarea', req: true },
    { k: 'deck', l: 'الديك', t: 'text' }
  ]
};

function titleOf(r) {
  return r.title || r.name || r.front || r.number || r.kind || r.type || r.body || '—';
}

function subOf(store, r) {
  const bits = [];
  if (r.due) bits.push('⏰ ' + relDay(r.due));
  if (r.date) bits.push('📅 ' + relDay(r.date));
  if (r.start) bits.push('📅 ' + relDay(r.start) + (r.time ? ' ' + r.time : ''));
  if (r.amount != null) bits.push('💰 ' + money(r.amount));
  if (r.expiry) bits.push('⌛ ' + relDay(r.expiry));
  if (r.minutes) bits.push('⏱️ ' + fmtN(r.minutes, 0) + 'د');
  if (r.status) bits.push(r.status);
  if (r.tags && r.tags.length) bits.push(r.tags.map(t => '#' + t).join(' '));
  return bits.join(' · ');
}

async function openEditor(store, rec) {
  const flds = FLDS[store] || [{ k: 'title', l: 'العنوان', t: 'text', req: true }, { k: 'note', l: 'ملاحظات', t: 'textarea' }];
  UI.form({
    title: (rec ? 'تعديل' : 'إضافة') + ' — ' + (MODULES.find(m => m.store === store) || { t: store }).t,
    fields: flds,
    values: rec || {},
    onSave: async v => {
      Hist.begin(rec ? 'تعديل' : 'إضافة');
      const out = rec ? await R[store].patch(rec.id, v) : await R[store].add(v);
      Hist.commit();
      UI.toast(T('save'), { undo: true });
      Router.render();
      return out;
    }
  });
}

async function collectionView(store, opt) {
  opt = opt || {};
  const box = document.createElement('div');
  let rows = await R[store].all();
  const bar = document.createElement('div');
  bar.className = 'card pad row wrap';
  bar.style.marginBottom = '12px';

  const q = document.createElement('input');
  q.className = 'in';
  q.placeholder = 'دوّر…';
  q.style.flex = '1 1 180px';
  q.value = (S.route && S.route.params && S.route.params.q) || '';

  const sort = document.createElement('select');
  sort.className = 'in';
  sort.style.flex = '0 0 150px';
  [
    ['updatedAt', 'الأحدث'],
    ['title', 'بالاسم'],
    ['due', 'بالموعد'],
    ['amount', 'بالمبلغ']
  ].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    sort.appendChild(o);
  });

  const add = document.createElement('button');
  add.className = 'b p';
  add.textContent = '＋ إضافة';
  add.onclick = () => openEditor(store, null);
  bar.append(q, sort, add);
  box.appendChild(bar);

  const listWrap = document.createElement('div');
  listWrap.className = 'card';
  box.appendChild(listWrap);

  const mini = document.createElement('div');
  mini.className = 'card pad sm muted';
  mini.style.marginTop = '12px';
  box.appendChild(mini);

  const paint = () => {
    let v = rows.slice();
    const qq = q.value.trim();
    if (qq) {
      v = v
        .map(r => ({ r, s: Math.max(fuzzy(qq, titleOf(r)), fuzzy(qq, JSON.stringify(r.tags || []))) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map(x => x.r);
    }
    const sk = sort.value;
    v.sort((a, b) =>
      sk === 'title'
        ? String(titleOf(a)).localeCompare(String(titleOf(b)), 'ar')
        : sk === 'amount'
        ? Math.abs(+b.amount || 0) - Math.abs(+a.amount || 0)
        : String(b[sk] || '').localeCompare(String(a[sk] || ''))
    );

    listWrap.textContent = '';
    if (!v.length) {
      listWrap.appendChild(
        UI.empty(opt.emptyTitle || 'مفيش حاجة هنا لسه…', opt.emptyText || T('empty'), {
          label: 'ابدأ بأول واحدة',
          fn: () => openEditor(store, null)
        })
      );
    } else {
      const render = r => {
        const li = document.createElement('div');
        li.className = 'li';
        const main = document.createElement('div');
        main.style.flex = '1';
        main.style.minWidth = '0';
        const t1 = document.createElement('div');
        t1.className = 't';
        t1.textContent = titleOf(r);
        const t2 = document.createElement('div');
        t2.className = 'xs dim';
        t2.textContent = subOf(store, r);
        main.append(t1, t2);

        const e = document.createElement('button');
        e.className = 'b sm g';
        e.textContent = '✏️';
        e.setAttribute('aria-label', 'تعديل');
        e.onclick = () => openEditor(store, r);

        const d = document.createElement('button');
        d.className = 'b sm g';
        d.textContent = '🗑️';
        d.setAttribute('aria-label', 'حذف');
        d.onclick = async () => {
          Hist.begin('حذف');
          await R[store].softDel(r.id);
          Hist.commit();
          UI.toast(T('del'), { undo: true });
          rows = await R[store].all();
          paint();
        };

        li.append(main, e, d);
        return li;
      };

      if (v.length > 200) listWrap.appendChild(UI.vlist(v, render, 68));
      else v.forEach(r => listWrap.appendChild(render(r)));
    }
    mini.textContent =
      'إجمالي: ' +
      fmtN(v.length, 0) +
      ' عنصر' +
      (rows.some(r => r.amount != null)
        ? ' · مجموع المبالغ: ' + money(v.reduce((s, r) => s + Math.abs(+r.amount || 0), 0))
        : '');
  };

  q.addEventListener('input', debounce(paint, 120));
  sort.onchange = paint;
  paint();

  const offBus = Bus.on('data', debounce(async () => {
    rows = await R[store].all();
    paint();
  }, 150));

  return box;
}

Object.assign(window, {
  txnsBetween, budgetStatus, netWorth, CAT_HINTS, ensureCategory, defaultAccount,
  parseExpenses, sm2, TONE, T, FLDS, titleOf, subOf, openEditor, collectionView
});
