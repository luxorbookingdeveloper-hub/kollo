/* ============================================================================
   كله — Kollo | Router (hash-based) & Navigation
   ============================================================================ */
const MODULES = [
  { k: 'today', t: 'النهاردة', i: '☀️', nav: 1 },
  { k: 'tasks', t: 'المهام', i: '✅', nav: 1, store: 'tasks' },
  { k: 'projects', t: 'المشاريع', i: '📁', store: 'projects' },
  { k: 'habits', t: 'العادات', i: '🔁', store: 'habits' },
  { k: 'calendar', t: 'المواعيد', i: '📅', store: 'events' },
  { k: 'notes', t: 'المذكرات', i: '📝', store: 'notes' },
  { k: 'money', t: 'الفلوس', i: '💰', nav: 1 },
  { k: 'health', t: 'الصحة', i: '🩺', store: 'healthLogs' },
  { k: 'mood', t: 'المزاج والجورنال', i: '🌤️', store: 'moodLogs' },
  { k: 'goals', t: 'الأهداف', i: '🎯', store: 'goals' },
  { k: 'learn', t: 'التعلّم', i: '📚', store: 'books' },
  { k: 'people', t: 'الناس', i: '👥', store: 'people' },
  { k: 'home', t: 'البيت والممتلكات', i: '🏠', store: 'assets' },
  { k: 'work', t: 'الشغل والوقت', i: '💼', store: 'timeLogs' },
  { k: 'kitchen', t: 'المطبخ والتسوّق', i: '🛒', store: 'shoppingItems' },
  { k: 'spirit', t: 'الروحاني', i: '🕌', store: 'worship' },
  { k: 'docs', t: 'المستندات', i: '📄', store: 'documents' },
  { k: 'auto', t: 'الأوتوميشن', i: '⚙️', store: 'automations' },
  { k: 'reports', t: 'التقارير', i: '📊' },
  { k: 'ai', t: 'الأسطى', i: '🧠', nav: 1 },
  { k: 'settings', t: 'الإعدادات', i: '🔧' },
  { k: 'trash', t: 'سلة المهملات', i: '🗑️' },
  { k: 'tests', t: 'الاختبارات الداخلية', i: '🧪' }
];

window.VIEWS = window.VIEWS || {};

const Router = {
  parse() {
    const h = (location.hash || '#/today').replace(/^#\/?/, '');
    const [p, q] = h.split('?');
    const params = {};
    (q || '').split('&').filter(Boolean).forEach(kv => {
      const [a, b] = kv.split('=');
      params[decodeURIComponent(a)] = decodeURIComponent(b || '');
    });
    const seg = p.split('/').filter(Boolean);
    return { name: seg[0] || 'today', id: seg[1] || null, params };
  },
  go(path) {
    location.hash = '#/' + String(path).replace(/^#?\/?/, '');
  },
  async render() {
    S.route = Router.parse();
    const mod = MODULES.find(m => m.k === S.route.name) || MODULES[0];
    document.title = mod.t + ' · كله';
    const headTtl = $('#head-ttl');
    if (headTtl && headTtl.lastChild) headTtl.lastChild.textContent = mod.t;

    const paint = async () => {
      const v = $('#view');
      if (!v) return;
      v.textContent = '';
      const node = await (window.VIEWS[S.route.name] || window.VIEWS.today)(S.route);
      v.appendChild(node);
      v.classList.add('stg');
      buildNav();
      window.scrollTo({ top: 0 });
    };

    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        await document.startViewTransition(paint).finished;
      } catch (e) {
        await paint();
      }
    } else {
      await paint();
    }
  },
  start() {
    window.addEventListener('hashchange', () => Router.render());
    if (!location.hash) location.hash = '#/today';
    Router.render();
  }
};

function buildNav() {
  const logoEl = $('#logo');
  if (logoEl && !logoEl.hasChildNodes()) {
    logoEl.appendChild(logoSVG(22));
  }
  const side = $('#side');
  if (side) {
    side.textContent = '';
    const brand = document.createElement('div');
    brand.style.cssText = 'display:flex;gap:9px;align-items:center;padding:6px 10px 14px;font-weight:800';
    brand.appendChild(logoSVG(26));
    const bt = document.createElement('span');
    bt.textContent = 'كله';
    brand.appendChild(bt);
    side.appendChild(brand);

    MODULES.forEach(m => {
      if (S.settings.modules[m.k] === false) return;
      const a = document.createElement('a');
      a.href = '#/' + m.k;
      a.textContent = m.i + ' ' + m.t;
      if (S.route.name === m.k) a.setAttribute('aria-current', 'page');
      side.appendChild(a);
    });
  }

  const tabs = $('#tabs');
  if (tabs) {
    tabs.textContent = '';
    [
      ['today', '☀️', 'النهاردة'],
      ['tasks', '✅', 'مهام'],
      ['money', '💰', 'فلوس'],
      ['ai', '🧠', 'الأسطى'],
      ['more', '☰', 'كل حاجة']
    ].forEach(([k, i, t]) => {
      const b = document.createElement('button');
      b.dataset.nav = k;
      const s1 = document.createElement('span');
      s1.textContent = i;
      s1.style.fontSize = '1.15rem';
      const s2 = document.createElement('b');
      s2.textContent = t;
      b.append(s1, s2);
      if (S.route.name === k) b.setAttribute('aria-current', 'page');
      b.onclick = () => (k === 'more' ? openMore() : Router.go(k));
      tabs.appendChild(b);
    });
  }
}

function openMore() {
  const b = document.createElement('div');
  b.className = 'grid g3';
  MODULES.forEach(m => {
    if (S.settings.modules[m.k] === false) return;
    const a = document.createElement('button');
    a.className = 'b';
    a.style.justifyContent = 'flex-start';
    a.textContent = m.i + ' ' + m.t;
    a.onclick = () => {
      sh.close();
      Router.go(m.k);
    };
    b.appendChild(a);
  });
  const sh = UI.sheet({ title: 'كل حاجة', body: b, actions: [{ label: 'إقفال' }] });
}

Object.assign(window, {
  MODULES, Router, buildNav, openMore
});
