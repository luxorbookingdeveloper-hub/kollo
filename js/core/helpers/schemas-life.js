/* ============================================================================
   كله — Kollo | Core Helpers: Life & Productivity Schemas
   ============================================================================ */

window.FLDS = window.FLDS || {};

Object.assign(window.FLDS, {
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
  worship: [
    { k: 'kind', l: 'النوع', t: 'select', opts: ['صلاة', 'ورد قرآن', 'أذكار', 'صيام', 'صدقة'].map(v => ({ v, l: v })) },
    { k: 'date', l: 'التاريخ', t: 'date', req: true },
    { k: 'value', l: 'الكمية/ملاحظة', t: 'text' }
  ]
});
