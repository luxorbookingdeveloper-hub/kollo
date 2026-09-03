/* ============================================================================
   كله — Kollo | Store, Event Bus, and Settings
   ============================================================================ */
const Bus = {
  m: new Map(),
  on(k, f) {
    (this.m.get(k) || this.m.set(k, []).get(k)).push(f);
    return () => this.off(k, f);
  },
  off(k, f) {
    const a = this.m.get(k) || [];
    const i = a.indexOf(f);
    if (i > -1) a.splice(i, 1);
  },
  emit(k, d) {
    (this.m.get(k) || []).forEach(f => {
      try { f(d); } catch (e) { console.error(e); }
    });
  }
};

const DEF_SETTINGS = {
  id: 'app',
  name: '',
  currency: 'EGP',
  tone: 'baladi',
  theme: 'auto',
  numerals: 'latn',
  hijri: false,
  bigText: false,
  ai: {
    provider: 'gemini',
    model: '',
    baseUrl: '',
    keyEnc: null,
    keyPlain: '',
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxTokens: 4096,
    stream: true,
    reasoning: 'medium',
    includeReasoning: false,
    maxSteps: 12,
    trust: false,
    attribution: true,
    timeout: 60000,
    interactions: false
  },
  modules: {},
  sensitive: false,
  onboarded: false,
  achievements: [],
  focus: { work: 25, brk: 5 },
  prayer: null
};

const S = {
  settings: JSON.parse(JSON.stringify(DEF_SETTINGS)),
  route: { name: 'today', params: {} },
  cache: {},
  focus: null,
  inbox: []
};

async function loadSettings() {
  const s = await dbGet('settings', 'app');
  S.settings = Object.assign(JSON.parse(JSON.stringify(DEF_SETTINGS)), s || {});
  S.settings.ai = Object.assign({}, DEF_SETTINGS.ai, (s && s.ai) || {});
  S.settings.id = 'app';
  applyTheme();
}

async function saveSettings(patch) {
  Object.assign(S.settings, patch || {});
  S.settings.updatedAt = now();
  await dbPut('settings', S.settings);
  applyTheme();
  Bus.emit('settings');
}

function applyTheme() {
  const t = S.settings.theme === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : S.settings.theme;
  document.documentElement.dataset.theme = t;
  document.documentElement.style.setProperty('--fs', S.settings.bigText ? '1.125rem' : '1rem');
  window.NUMLOC = S.settings.numerals === 'arab' ? 'ar-EG' : 'ar-EG-u-nu-latn';
}

Object.assign(window, {
  Bus, DEF_SETTINGS, S, loadSettings, saveSettings, applyTheme
});
