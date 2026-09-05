/* ============================================================================
   كله — Kollo | Core Helpers: Entity Field Schemas (FLDS)
   ============================================================================ */

window.FLDS = window.FLDS || {};

Object.assign(window.FLDS, {
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
});

const FLDS = window.FLDS;
