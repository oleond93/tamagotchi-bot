// pet.js — вся логіка тамагочі: стан, занепад (decay), дії, еволюція.
// Чиста логіка, без залежностей від Телеграму чи LLM.

import { eggMystery } from "./egg.js";
import { PERSONALITIES } from "./personalities.js";

// Повний каталог характеристик (усі можливі). Кожна: [назва, емодзі].
export const STAT_META = {
  warmth: ["Тепло", "🔥"],
  hunger: ["Ситість", "🍗"],
  hygiene: ["Чистота", "🛁"],
  energy: ["Енергія", "⚡"],
  mood: ["Настрій", "🎉"],
  sanity: ["Психіка", "🤪"],
  social: ["Спілкування", "🫂"],
  purpose: ["Сенс буття", "🌌"],
};

export const STATS = Object.keys(STAT_META);
// Сумісність зі старим кодом (brain.js): псевдонім для каталогу назв.
export const STAT_LABELS = STAT_META;

// Які характеристики активні на кожній стадії (за індексом). Поступово
// відкриваються; деякі з ростом зникають (яйце переростає «тепло» тощо).
const STAGE_STATS = [
  ["warmth"], //                                              🥚 Яйце
  ["warmth", "hunger", "hygiene"], //                         🫠 Слизька Грудка
  ["hunger", "hygiene", "energy", "mood"], //                 👾 Дивне Створіння
  ["hunger", "hygiene", "energy", "mood", "sanity"], //       😈 Хаотичний Монстр
  ["hunger", "hygiene", "energy", "mood", "sanity", "social"], // 🐉 Стародавнє Зло
  ["hunger", "energy", "mood", "sanity", "social", "purpose"], // 🌌 Космічна Сутність
];

// Швидкість занепаду за годину (для всіх можливих характеристик).
// Підібрано так, щоб 100→0 займало ~1.5–2.2 год (голод найшвидший) —
// більше приводів заходити частіше.
const DECAY_PER_HOUR = {
  warmth: 60.0, // ~1.7 год
  hunger: 66.0, // ~1.5 год
  hygiene: 45.0, // ~2.2 год
  energy: 50.0, // ~2.0 год
  mood: 55.0, // ~1.8 год
  sanity: 40.0, // ~2.5 год
  social: 45.0, // ~2.2 год
  purpose: 35.0, // ~2.9 год
};

// Дії: кожна відновлює свою характеристику. label — текст кнопки, toast — спливне.
const ACTIONS = {
  warm: { stat: "warmth", label: "🔥 Гріти", toast: "🔥 Тепленько!", effects: { warmth: 45, mood: 5 } },
  feed: { stat: "hunger", label: "🍗 Годувати", toast: "🍗 Ням-ням!", effects: { hunger: 40, hygiene: -5, mood: 3 } },
  clean: { stat: "hygiene", label: "🛁 Мити", toast: "🛁 Чистенький!", effects: { hygiene: 50, mood: 5 } },
  sleep: { stat: "energy", label: "😴 Спати", toast: "😴 Хр-р-р...", effects: { energy: 50, hunger: -5 } },
  play: { stat: "mood", label: "🎮 Гратися", toast: "🎮 Віііі!", effects: { mood: 35, energy: -15, hunger: -10 } },
  calm: { stat: "sanity", label: "🧘 Заспокоїти", toast: "🧘 Дзеееен...", effects: { sanity: 40, mood: 10 } },
  talk: { stat: "social", label: "🫂 Спілкуватись", toast: "🫂 Як приємно!", effects: { social: 40, mood: 15, energy: -5 } },
  meditate: { stat: "purpose", label: "🌌 Медитувати", toast: "🌌 Просвітлення...", effects: { purpose: 40, sanity: 20, energy: -10 } },
};
export { ACTIONS };

// Характеристика → дія, що її відновлює.
const STAT_ACTION = Object.fromEntries(
  Object.entries(ACTIONS).map(([k, v]) => [v.stat, k])
);

// Як дії «ліплять» характер під час формувального періоду (стадії 🫠 і 👾).
// Кожна дія додає ваги певним архетипам — і домінанта поступово зсувається.
const ACTION_AFFINITY = {
  feed: { sunshine: 1 },
  play: { sunshine: 1, gremlin: 1 },
  clean: { nerd: 1 },
  sleep: { sleepy: 1 },
  calm: { philosopher: 1 },
  talk: { sunshine: 1, drama: 1 },
  meditate: { philosopher: 1 },
};

// --- Емоційні реакції на повідомлення користувача ----------------------------
// Окремий ТИМЧАСОВИЙ шар поверх показників: аватар «відчуває» тон того, що йому
// пишуть. Емоцію визначає LLM (тег у відповіді), а механіку — цей каталог.
// valence: +1 позитивна / -1 негативна / 0 нейтральна (no-op).
// effects — дельти показників ПРИ СИЛІ 10 (далі масштабуються силою й вдачею).
// bubble — репліка для картки, коли емоція активна.
export const EMOTIONS = {
  joy:     { label: "радість",    emoji: "😄", valence: 1,  effects: { mood: 6, energy: 3 },            bubble: "😄 «Я такий щасливий!»" },
  love:    { label: "розчулення", emoji: "🥰", valence: 1,  effects: { mood: 6, social: 5, sanity: 3 }, bubble: "🥰 «Ти найкращий...»" },
  hurt:    { label: "образа",     emoji: "😔", valence: -1, effects: { mood: -6, social: -5 },          bubble: "😔 «Мені прикро від твоїх слів...»" },
  anger:   { label: "злість",     emoji: "😠", valence: -1, effects: { mood: -6, sanity: -5 },          bubble: "😠 «Я досі серджусь.»" },
  sadness: { label: "сум",        emoji: "😢", valence: -1, effects: { mood: -6, energy: -4 },          bubble: "😢 «Щось мені сумно...»" },
  fear:    { label: "тривога",    emoji: "😨", valence: -1, effects: { sanity: -6, mood: -4 },          bubble: "😨 «Мені трохи лячно...»" },
  boredom: { label: "нудьга",     emoji: "🥱", valence: -1, effects: { mood: -4 },                      bubble: "🥱 «Нуу-удно з тобою...»" },
  neutral: { label: "спокій",     emoji: "🙂", valence: 0,  effects: {},                                bubble: null },
};

// Сила реакції за вдачею: множник для негативних / позитивних емоцій.
// Дике спалахує від образи й важко тане від ласки; янгол — навпаки.
const TEMPERAMENT_REACT = {
  wild:     { neg: 1.4, pos: 0.75 },
  feisty:   { neg: 1.2, pos: 0.9 },
  balanced: { neg: 1.0, pos: 1.0 },
  gentle:   { neg: 0.8, pos: 1.15 },
  angelic:  { neg: 0.6, pos: 1.3 },
};

// Як емоції ліплять характер (дрейф архетипів у формувальний період).
const EMOTION_AFFINITY = {
  anger:   { rebel: 1, gremlin: 1 },
  hurt:    { drama: 1 },
  love:    { sunshine: 1 },
  joy:     { sunshine: 1 },
  sadness: { drama: 1 },
  boredom: { sleepy: 1 },
  fear:    {},
};

const EMOTION_HALFLIFE_H = 0.42; // ~25 хв до зменшення інтенсивності вдвічі
const EMOTION_MIN = 1.0; //         нижче цього — емоція згасає до neutral
const EMOTION_DELTA_CAP = 8; //     макс |зміна| показника за одне повідомлення

// --- Памʼять (натхнення — Hermes Agent) --------------------------------------
// Два шари, обидва живуть у тому ж JSON-блобі (без нових таблиць):
//  • dialog   — короткострокове вікно останніх реплік (передається в LLM як історія);
//  • memories — довгострокові КУРОВАНІ факти про власника (LLM сам тегує `[[mem:…]]`).
// Забування — суто кодом (кап + витіснення найстарішого), без зайвих викликів API.
export const DIALOG_MAX = 12; //        реплік у вікні (≈6 туди-сюди)
export const DIALOG_ENTRY_MAX = 280; // обрізання тексту однієї репліки
export const MEMORY_MAX = 30; //        максимум збережених фактів
export const MEMORY_ENTRY_MAX = 160; // обрізання тексту факту
export const MEMORY_PROMPT_MAX = 12; // скільки найсвіжіших фактів інжектимо в промпт

// «Класові» механіки характеру (див. PERSONALITIES[*].traits).
const ABILITY_COOLDOWN_H = 8; //   кулдаун фірмової здібності
const SYNERGY_LIKE = 1.4; //       резонанс: ×множник на основний показник дії
const SYNERGY_DISLIKE = 0.6; //    бекфайр: ×множник + штраф настрою
const SYNERGY_MOOD_PENALTY = 5; // штраф настрою при бекфайрі

// Екранування для Telegram parse_mode=HTML (текст факту приходить від LLM).
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Поріг середнього тепла → вдача. Спільне для фіналу (computeTemperament)
// та для «передчуття» по ходу (eggTemperamentTrajectory).
function temperamentFromWarmth(avg) {
  if (avg >= 85) return "angelic";
  if (avg >= 68) return "gentle";
  if (avg >= 50) return "balanced";
  if (avg >= 32) return "feisty";
  return "wild";
}

// Вдача — визначається якістю догляду за яйцем (середнє тепло). Впливає на
// те, як улюбленець спілкується (LLM) та як він підписаний у картці.
export const TEMPERAMENTS = {
  angelic: {
    label: "😇 Янгол",
    reveal: "Стільки тепла й турботи! Він виріс 😇 <b>Янголом</b> 💛",
    prompt: "ВДАЧА: ти неймовірно лагідний, ніжний і вдячний — обожнюєш власника й щиро дбаєш про нього у відповідь.",
  },
  gentle: {
    label: "🥰 Лагідне",
    reveal: "Ти добре дбав — він виріс 🥰 <b>Лагідним</b>!",
    prompt: "ВДАЧА: ти добрий і ласкавий, легко радієш, рідко сердишся.",
  },
  balanced: {
    label: "😌 Врівноважене",
    reveal: "Виріс 😌 <b>Врівноваженим</b> — спокійним, без крайнощів.",
    prompt: "ВДАЧА: ти спокійний і врівноважений, без емоційних крайнощів.",
  },
  feisty: {
    label: "😼 Норовливе",
    reveal: "Бракувало трохи тепла — і він став 😼 <b>Норовливим</b> 😏",
    prompt: "ВДАЧА: ти норовливий і пустотливий, любиш капостити та дражнитися — але по-доброму.",
  },
  wild: {
    label: "😈 Дике",
    reveal: "Йому часто було холодно... тож він став 😈 <b>Диким</b>!",
    prompt: "ВДАЧА: ти дике, непокірне й кусюче — бурчиш, огризаєшся, ледь визнаєш власника, хоч глибоко всередині прив'язаний.",
  },
};

// Стадії еволюції: [вік у днях, назва, емодзі, опис].
const EVOLUTION_STAGES = [
  [0, "Яйце", "🥚", "тремтить і чогось чекає"],
  [1, "Слизька Грудка", "🫠", "ще не визначилось, ким бути"],
  [3, "Дивне Створіння", "👾", "має забагато енергії та думок"],
  [7, "Хаотичний Монстр", "😈", "офіційно небезпечне (для шкарпеток)"],
  [14, "Стародавнє Зло", "🐉", "пам'ятає те, чого не було"],
  [30, "Космічна Сутність", "🌌", "переросло цей чат, але лишилось з тобою"],
];

// Гілчаста еволюція (натхнення — Digimon): ФІНАЛЬНА форма (index FINAL_INDEX) залежить від
// вдача × домінантний характер. Часовий кістяк (вік/індекс/активні показники/стиль мовлення)
// НЕ міняється — гілкується лише ідентичність форми. Див. evolutionPath / _stageIdentity.
const FINAL_INDEX = EVOLUTION_STAGES.length - 1;
const FORMS = {
  demon:       { emoji: "👹", name: "Хаос-Демон", desc: "сіє безлад і регоче з нього" },
  imp:         { emoji: "🃏", name: "Дух-Бешкетник", desc: "капостить, але по-доброму" },
  outlaw:      { emoji: "🦹", name: "Відступник", desc: "сам собі закон" },
  free:        { emoji: "🦸", name: "Вільний Дух", desc: "нескорений, але з добрим серцем" },
  angel:       { emoji: "🌟", name: "Світлий Янгол", desc: "випромінює тепло й спокій" },
  sun:         { emoji: "☀️", name: "Сонцесяйний", desc: "зігріває всіх навколо" },
  enlightened: { emoji: "🧘", name: "Просвітлений", desc: "осягнув суть буття" },
  void:        { emoji: "🌌", name: "Космічний Розум", desc: "мислить цілими галактиками" },
  star:        { emoji: "🌠", name: "Наднова-Зірка", desc: "сяє так, що не відвести очей" },
  machine:     { emoji: "🛸", name: "Розумна Машина", desc: "обчислила сенс усього сущого" },
  dream:       { emoji: "💤", name: "Сон-Сутність", desc: "живе десь між сном і явою" },
  cosmic:      { emoji: "🌌", name: "Космічна Сутність", desc: "переросла цей чат, але лишилась з тобою" },
};

export function now() {
  return Date.now() / 1000;
}

// Часовий пояс для «нічного» сповільнення (встановлює index.js з env).
let TZ_OFFSET = 3;
export function setTzOffset(h) {
  TZ_OFFSET = Number(h) || 0;
}

// Уночі (22:00–08:00 за локальним часом) занепад сповільнюється у ~5.5 раза
// (фактор 0.18), щоб за ~8 год сну показники падали майже до мінімуму, але не до нуля.
const NIGHT_START = 22;
const NIGHT_END = 8;
const NIGHT_FACTOR = 0.18;

// Скільки з проміжку [t0, t1] (сек) припало на «ніч» — для коректного
// сповільнення занепаду за час сну (проміжок може охоплювати ніч і ранок).
function nightHoursIn(t0, t1) {
  let nh = 0;
  const step = 0.1; // крок 6 хв
  for (let h = 0; (t0 + h * 3600) < t1; h += step) {
    const localH = (((t0 + h * 3600) / 3600 + TZ_OFFSET) % 24 + 24) % 24;
    if (localH >= NIGHT_START || localH < NIGHT_END) nh += step;
  }
  return nh;
}

const clamp = (v) => Math.max(0, Math.min(100, v));

// Візуальний роздільник між блоками картки.
const DIV = "\n┈┈┈┈┈┈┈┈┈┈\n";

export class Pet {
  constructor(d = {}) {
    const t = now();
    this.name = d.name ?? "Безіменко";
    // Характер: ваги по архетипах (persona). При вилупленні один отримує перевагу
    // (рандом), далі дрейфує від догляду; на стадії 😈 застигає (persona_locked).
    // personality = поточний домінантний архетип (для зручності/сумісності).
    this.personality = d.personality ?? null;
    this.persona = d.persona ?? null; // {gremlin: 10, sunshine: 3, ...}
    this.persona_locked = d.persona_locked ?? false;
    this.born_at = d.born_at ?? t;
    this.last_update = d.last_update ?? t;
    this.last_seen = d.last_seen ?? t;
    this.last_nudge = d.last_nudge ?? 0;
    this.awaiting_name = d.awaiting_name ?? false;
    this.alive = d.alive ?? true;
    this.warmth = d.warmth ?? 80;
    this.hunger = d.hunger ?? 80;
    this.hygiene = d.hygiene ?? 80;
    this.energy = d.energy ?? 80;
    this.mood = d.mood ?? 80;
    this.sanity = d.sanity ?? 70;
    this.social = d.social ?? 80;
    this.purpose = d.purpose ?? 70;
    this.counts = d.counts ?? {}; // лічильники дій: feed/play/sleep/clean/revive/event
    this.achievements = d.achievements ?? []; // id здобутих досягнень
    // Стадія, про яку власника вже сповістили. Для існуючих улюбленців
    // (без поля) backfill до поточної — щоб не спамити святкуваннями заднім числом.
    this.seen_stage = d.seen_stage ?? this.evolutionInfo().index;
    // Накопичення якості догляду за яйцем (для визначення вдачі) + сама вдача.
    this.egg_warm_sum = d.egg_warm_sum ?? 0; // Σ тепло·години
    this.egg_hours = d.egg_hours ?? 0; //       Σ години у стадії яйця
    this.temperament = d.temperament ?? null; // фіксується при вилупленні
    this.last_event = d.last_event ?? 0; //     час останньої події (кулдаун)
    // Лічильники та прапорці для досягнень.
    this.interactions = d.interactions ?? 0; //   усього дій користувача
    this.chat_count = d.chat_count ?? 0; //       повідомлень у вільному чаті
    this.deaths = d.deaths ?? 0; //               скільки разів «помирав»
    this.streak = d.streak ?? 0; //               днів поспіль
    this.best_streak = d.best_streak ?? 0;
    this.last_active_day = d.last_active_day ?? 0; // день останньої активності
    this.flags = d.flags ?? {}; //                разові «моменти»: maxed/red/froze/cult/...
    this.menu_set = d.menu_set ?? false; //       чи вже надсилали постійну клавіатуру
    // Тимчасова емоція від спілкування (окремо від показників). Згасає з часом.
    this.emotion = d.emotion ?? null; //          ключ зі EMOTIONS або null (= спокій)
    this.emotion_intensity = d.emotion_intensity ?? 0; // 0..10
    this.emotion_at = d.emotion_at ?? 0; //       час встановлення (для згасання)
    // Памʼять: вікно діалогу + куровані факти про власника (див. блок констант вище).
    this.dialog = d.dialog ?? []; //   [{ r:'u'|'a', t }] — останні репліки
    this.memories = d.memories ?? []; // [{ t, at }] — довгострокові факти
    // Проактивність: коли востаннє відпрацював «ритуал» (день-індекс), напр. {morning, streak}.
    this.rituals = d.rituals ?? {};
    // Час останнього використання фірмової здібності (кулдаун).
    this.last_ability = d.last_ability ?? 0;
  }

  // Вдача за середнім теплом, яке яйце мало до вилуплення.
  computeTemperament() {
    const avg = this.egg_hours > 0 ? this.egg_warm_sum / this.egg_hours : 70;
    return temperamentFromWarmth(avg);
  }

  // Поточна «траєкторія» вдачі, поки це ще яйце — для передчуття в картці.
  // Орієнтується на накопичене середнє тепло (а спочатку — на поточне);
  // ще не зафіксована й може зсунутись від подальшого догляду.
  eggTemperamentTrajectory() {
    const avg = this.egg_hours > 0 ? this.egg_warm_sum / this.egg_hours : this.warmth;
    return temperamentFromWarmth(avg);
  }

  // Щойно перестали бути яйцем — закріпити вдачу (від догляду) і завести характер.
  finalizeOnHatch() {
    if (this.isEgg()) return;
    if (!this.temperament) this.temperament = this.computeTemperament();
    if (!this.persona) {
      if (this.personality && PERSONALITIES[this.personality]) {
        // Існуючий улюбленець без persona — зберігаємо його поточний характер.
        this.persona = { [this.personality]: 10 };
      } else {
        const keys = Object.keys(PERSONALITIES);
        const chosen = keys[Math.floor(Math.random() * keys.length)];
        this.persona = { [chosen]: 10 };
        this.personality = chosen;
      }
    }
    // На стадії 😈 (індекс 3) характер остаточно формується.
    if (!this.persona_locked && this.evolutionInfo().index >= 3) {
      this.persona_locked = true;
    }
  }

  temperamentLabel() {
    return this.temperament ? TEMPERAMENTS[this.temperament].label : "";
  }

  // --- Характер (persona) як суміш архетипів -------------------------------
  _personaSorted() {
    return Object.entries(this.persona || {}).sort((a, b) => b[1] - a[1]);
  }

  dominantPersona() {
    const e = this._personaSorted();
    return e.length ? e[0][0] : this.personality;
  }

  // Чи це «суміш» — другий архетип близький до першого (≥ 60%).
  isMixedPersona() {
    const e = this._personaSorted();
    return e.length >= 2 && e[1][1] > 0 && e[1][1] >= e[0][1] * 0.6;
  }

  personaForming() {
    return !!this.persona && !this.persona_locked && !this.isEgg();
  }

  personalityLabel() {
    if (!this.persona) {
      return this.personality && PERSONALITIES[this.personality]
        ? PERSONALITIES[this.personality].label
        : "";
    }
    const e = this._personaSorted();
    if (this.isMixedPersona()) {
      return `${PERSONALITIES[e[0][0]].label} × ${PERSONALITIES[e[1][0]].label}`;
    }
    return PERSONALITIES[e[0][0]] ? PERSONALITIES[e[0][0]].label : "";
  }

  // Текст характеру для LLM (одного архетипу або суміші двох).
  personaPrompt() {
    if (!this.persona) {
      return (PERSONALITIES[this.personality] || PERSONALITIES.gremlin).prompt;
    }
    const e = this._personaSorted();
    if (this.isMixedPersona()) {
      const a = PERSONALITIES[e[0][0]];
      const b = PERSONALITIES[e[1][0]];
      return `Ти — СУМІШ двох характерів, поєднуй риси обох:\n(1) ${a.prompt}\n(2) ${b.prompt}`;
    }
    return (PERSONALITIES[e[0][0]] || PERSONALITIES.gremlin).prompt;
  }

  // --- «Класові» риси характеру (traits домінантного архетипу) -------------
  // Риси поточного домінантного архетипу (пасив/синергія/здібність) або {}.
  _traits() {
    const p = PERSONALITIES[this.dominantPersona()];
    return (p && p.traits) || {};
  }

  // Множник занепаду показника від характеру (default 1.0).
  _decayMult(stat) {
    const d = this._traits().decay;
    return (d && d[stat]) || 1;
  }

  // Синергія дії з характером: 'like' (резонанс) / 'dislike' (бекфайр) / null.
  _actionSynergy(action) {
    const t = this._traits();
    if (t.likes && t.likes.includes(action)) return "like";
    if (t.dislikes && t.dislikes.includes(action)) return "dislike";
    return null;
  }

  // Опис фірмової здібності поточного характеру (або null для яйця/без persona).
  abilityInfo() {
    if (this.isEgg() || !this.persona) return null;
    return this._traits().ability || null;
  }

  // Секунд до готовності здібності (0 = готова).
  abilityReadyIn() {
    const since = now() - (this.last_ability || 0);
    return Math.max(0, ABILITY_COOLDOWN_H * 3600 - since);
  }

  // Рандомні ефекти для «Капості» Ґремліна: один активний показник вгору, інший вниз.
  _chaosEffects() {
    const act = this.activeStats();
    if (!act.length) return {};
    const up = act[Math.floor(Math.random() * act.length)];
    const down = act[Math.floor(Math.random() * act.length)];
    const e = {};
    e[up] = 20 + Math.floor(Math.random() * 16); //          +20..35
    e[down] = (e[down] || 0) - (5 + Math.floor(Math.random() * 11)); // −5..15
    return e;
  }

  // Застосувати фірмову здібність. Ефекти лише на активні показники. Повертає
  // { ok, info, applied } або { ok:false, reason } (none/dead/cooldown).
  useAbility() {
    if (!this.alive) return { ok: false, reason: "dead" };
    const info = this.abilityInfo();
    if (!info) return { ok: false, reason: "none" };
    if (this.abilityReadyIn() > 0) return { ok: false, reason: "cooldown", left: this.abilityReadyIn() };
    this.applyDecay();
    const effects = info.rand ? this._chaosEffects() : info.effects || {};
    const act = new Set(this.activeStats());
    const applied = {};
    for (const [s, d] of Object.entries(effects)) {
      if (!act.has(s)) continue;
      const before = this[s];
      this[s] = clamp(this[s] + d);
      applied[s] = Math.round(this[s] - before);
    }
    this.last_ability = now();
    this.counts.ability = (this.counts.ability || 0) + 1;
    this.interactions += 1;
    if (STATS.some((s) => this[s] >= 100)) this.flags.maxed = true;
    return { ok: true, info, applied };
  }

  // Короткий HTML-блок «класових» рис для /personality (здібність + смаки).
  personaPerks() {
    const t = this._traits();
    if (this.isEgg() || !this.persona) return "";
    const lines = [];
    if (t.ability) lines.push(`✨ Здібність: <b>${t.ability.label}</b>`);
    const nm = (a) => (ACTIONS[a] ? ACTIONS[a].label : a);
    if (t.likes && t.likes.length) lines.push(`💖 Любить: ${t.likes.map(nm).join(", ")}`);
    if (t.dislikes && t.dislikes.length) lines.push(`😤 Не любить: ${t.dislikes.map(nm).join(", ")}`);
    return lines.join("\n");
  }

  // Дрейф характеру від догляду (лише у формувальний період).
  nudgePersona(weights) {
    if (!weights || this.persona_locked || this.isEgg() || !this.persona) return;
    for (const [k, w] of Object.entries(weights)) {
      if (PERSONALITIES[k]) this.persona[k] = (this.persona[k] || 0) + w;
    }
    this.personality = this.dominantPersona();
  }

  temperamentReveal() {
    return this.temperament ? TEMPERAMENTS[this.temperament].reveal : "";
  }

  temperamentStyle() {
    return this.temperament ? TEMPERAMENTS[this.temperament].prompt : "";
  }

  // Святкове повідомлення про перехід на стадію idx (1 = вилуплення).
  celebrationFor(idx) {
    const st = EVOLUTION_STAGES[idx];
    if (!st) return "";
    const id = this._stageIdentity(idx); // фінальна форма — гілчаста назва/емодзі/опис
    const sname = id.name;
    const semoji = id.emoji;
    const desc = id.desc;
    const prev = new Set(idx > 0 ? STAGE_STATS[idx - 1] : []);
    const unlocked = (STAGE_STATS[idx] || [])
      .filter((s) => !prev.has(s))
      .map((s) => `${STAT_META[s][1]} ${STAT_META[s][0]}`);
    const unlockedTxt = unlocked.length ? `\n🔓 Відкрито: ${unlocked.join(", ")}` : "";
    if (idx === 1) {
      const reveal = this.temperamentReveal();
      const persLine = this.personalityLabel()
        ? `\n🎭 Початковий характер: <b>${this.personalityLabel()}</b>\n<i>(ще формуватиметься від твого догляду!)</i>`
        : "";
      return (
        "💥💥💥 <b>ШКАРАЛУПА ТРІСНУЛА!</b>\n\n" +
        `🎉 <b>${this.name} вилупився!</b>\n` +
        `Тепер це ${semoji} <i>${sname}</i> — ${desc}.${unlockedTxt}` +
        (reveal ? `\n\n${reveal}` : "") +
        persLine
      );
    }
    // Фінальна форма — гілчаста кульмінація: оголошуємо вид і що його сформувало.
    if (idx === FINAL_INDEX) {
      return (
        "🌌✨ <b>ФІНАЛЬНА ЕВОЛЮЦІЯ!</b> ✨🌌\n\n" +
        `${semoji} <b>${this.name}</b> досяг(ла) фінальної форми:\n` +
        `<b>${semoji} ${sname}</b> — <i>${desc}</i>${unlockedTxt}\n\n` +
        `Саме твій догляд привів сюди:\n🧬 ${this.temperamentLabel()}  ·  🎭 ${this.personalityLabel()}\n` +
        "<i>Інші вдача чи характер дали б зовсім іншу форму 😉</i>"
      );
    }
    // На стадії 😈 характер остаточно формується.
    const persLock =
      idx === 3 && this.personalityLabel()
        ? `\n\n🎭 Характер <b>остаточно сформувався</b>: <b>${this.personalityLabel()}</b>!`
        : "";
    return (
      "✨✨ <b>ЕВОЛЮЦІЯ!</b> ✨✨\n\n" +
      `${semoji} <b>${this.name}</b> росте далі → <i>${sname}</i>\n` +
      `<i>${desc}</i>${unlockedTxt}${persLock}`
    );
  }

  isEgg() {
    return this.evolutionInfo().index === 0;
  }

  // Ключ ФІНАЛЬНОЇ форми за вдачею × домінантним характером (натхнення — Digimon).
  // null, якщо характеру ще немає (яйце). Див. FORMS / _stageIdentity / celebrationFor.
  evolutionPath() {
    const p = this.dominantPersona();
    if (!p || !PERSONALITIES[p]) return null;
    const t = this.temperament;
    const light = t === "angelic" || t === "gentle";
    const dark = t === "wild" || t === "feisty";
    switch (p) {
      case "gremlin": return dark ? "demon" : "imp";
      case "rebel": return dark ? "outlaw" : "free";
      case "sunshine": return light ? "angel" : "sun";
      case "philosopher": return light ? "enlightened" : "void";
      case "drama": return "star";
      case "nerd": return "machine";
      case "sleepy": return "dream";
      default: return "cosmic";
    }
  }

  // Ідентичність стадії {name, emoji, desc}: фінальна форма гілкується за evolutionPath;
  // решта — канонічні EVOLUTION_STAGES. Для не-фінальних індексів шлях НЕ обчислюється.
  _stageIdentity(index) {
    const st = EVOLUTION_STAGES[index];
    const base = st
      ? { name: st[1], emoji: st[2], desc: st[3] }
      : { name: "", emoji: "", desc: "" };
    if (index === FINAL_INDEX) {
      const path = this.evolutionPath();
      if (path && FORMS[path]) return { ...FORMS[path] };
    }
    return base;
  }

  // Знак вилуплення залежно від прогресу (0..1) — змінюється протягом доби.
  eggSign() {
    const p = this.evolutionInfo().progress;
    if (p < 0.33) return "🥚 Тихо. Лише рівне тепло...";
    if (p < 0.66) return "👂 Зсередини — ледь чутне булькотіння.";
    if (p < 0.9) return "💢 З'явилась перша тріщинка!";
    return "💥 Воно ось-ось вилупиться!!!";
  }

  // Характеристики, активні на поточній стадії розвитку.
  activeStats() {
    return STAGE_STATS[this.evolutionInfo().index] || STAGE_STATS[0];
  }

  // Дії (ключі), доступні на поточній стадії — по одній на кожну активну хар-ку.
  stageActions() {
    return this.activeStats()
      .map((s) => STAT_ACTION[s])
      .filter(Boolean);
  }

  get ageDays() {
    return (now() - this.born_at) / 86400;
  }

  stage() {
    const id = this._stageIdentity(this.evolutionInfo().index);
    return { name: id.name, emoji: id.emoji };
  }

  avg() {
    const act = this.activeStats();
    return act.reduce((a, s) => a + this[s], 0) / act.length;
  }

  applyDecay() {
    this.applyEmotionDecay(); // емоція згасає незалежно від «живий/мертвий»
    if (!this.alive) return;
    let elapsedH = (now() - this.last_update) / 3600;
    if (elapsedH > 0) {
      elapsedH = Math.min(elapsedH, 72); // понад це все одно вже на нулі
      const wasEgg = this.isEgg();
      const beforeWarmth = this.warmth;
      // Ефективні «години занепаду»: нічні години рахуються повільніше.
      const t0 = now() - elapsedH * 3600;
      const nightH = Math.min(elapsedH, nightHoursIn(t0, now()));
      const dayH = elapsedH - nightH;
      const effH = dayH + NIGHT_FACTOR * nightH;
      // Занепадають лише активні характеристики; швидкість модулюється характером (пасив).
      for (const stat of this.activeStats()) {
        this[stat] = clamp(this[stat] - (DECAY_PER_HOUR[stat] || 0) * effH * this._decayMult(stat));
      }
      // Поки яйце — накопичуємо середньозважене тепло (для майбутньої вдачі).
      if (wasEgg) {
        this.egg_warm_sum += ((beforeWarmth + this.warmth) / 2) * elapsedH;
        this.egg_hours += elapsedH;
      }
      this.last_update = now();
      // Прапорці-моменти для досягнень: «червона зона» і «яйце замерзло».
      const act = this.activeStats();
      for (const stat of act) {
        if (this[stat] <= 0) {
          this.flags.red = true;
          if (stat === "warmth" && wasEgg) this.flags.froze = true;
        }
      }
      // "Смерть" можлива лише коли психіка вже є (стадія підлітка+) і все на нулі.
      if (act.includes("sanity") && this.hunger <= 0 && this.sanity <= 0) {
        this.alive = false;
        this.deaths += 1;
      }
    }
    // Якщо щойно вилупилось — закріпити вдачу й характер.
    this.finalizeOnHatch();
  }

  doAction(action) {
    this.applyDecay();
    const def = ACTIONS[action];
    // Синергія з характером: основний показник дії резонує (×1.4) або бекфайрить (×0.6).
    const synergy = this._actionSynergy(action);
    const primary = def && def.stat;
    for (const [stat, delta] of Object.entries(def ? def.effects : {})) {
      let d = delta;
      if (synergy && stat === primary && d > 0) {
        d *= synergy === "like" ? SYNERGY_LIKE : SYNERGY_DISLIKE;
      }
      this[stat] = clamp(this[stat] + d);
    }
    // Бекфайр ще й трохи псує настрій (якщо активний на стадії).
    if (synergy === "dislike" && this.activeStats().includes("mood")) {
      this.mood = clamp(this.mood - SYNERGY_MOOD_PENALTY);
    }
    this.counts[action] = (this.counts[action] || 0) + 1;
    this.interactions += 1;
    if (STATS.some((s) => this[s] >= 100)) this.flags.maxed = true;
    this.nudgePersona(ACTION_AFFINITY[action]); // дія ліпить характер
    return { synergy };
  }

  // --- Емоційний стан ------------------------------------------------------
  // Згасання поточної емоції (інтенсивність халвиться раз на EMOTION_HALFLIFE_H).
  // Нижче порогу EMOTION_MIN — емоція повертається до спокою (neutral/null).
  applyEmotionDecay() {
    if (!this.emotion || this.emotion === "neutral") return;
    const h = (now() - (this.emotion_at || 0)) / 3600;
    if (h <= 0) return;
    this.emotion_intensity *= Math.pow(0.5, h / EMOTION_HALFLIFE_H);
    this.emotion_at = now();
    if (this.emotion_intensity < EMOTION_MIN) {
      this.emotion = null;
      this.emotion_intensity = 0;
    }
  }

  // Застосовує емоцію (від LLM-тега) до стану. Сила реакції модулюється вдачею;
  // інтенсивні емоції ще й легенько рухають активні показники (з кепом). Дрейф
  // характеру — у формувальний період. No-op для яйця та нейтральної емоції.
  applyEmotion(emotion, intensity) {
    if (!this.alive || this.isEgg()) return; // мертвий/яйце — емоцій не має
    const def = EMOTIONS[emotion];
    if (!def || emotion === "neutral" || !(intensity > 0)) return;
    const inten = Math.max(0, Math.min(10, intensity));
    const t = TEMPERAMENT_REACT[this.temperament] || TEMPERAMENT_REACT.balanced;
    const mult = def.valence >= 0 ? t.pos : t.neg;
    const emoMult = this._traits().emoMult || 1; // характер може підсилювати емоції (🎬 Драма)
    const scaled = (inten / 10) * mult * emoMult;
    // Дельти лише на активні показники стадії (з кепом і clamp 0..100).
    const act = new Set(this.activeStats());
    for (const [stat, base] of Object.entries(def.effects)) {
      if (!act.has(stat)) continue;
      const d = Math.max(-EMOTION_DELTA_CAP, Math.min(EMOTION_DELTA_CAP, base * scaled));
      this[stat] = clamp(this[stat] + d);
    }
    this.emotion = emotion;
    this.emotion_intensity = Math.max(0, Math.min(10, inten * mult * emoMult));
    this.emotion_at = now();
    this.nudgePersona(EMOTION_AFFINITY[emotion]); // емоція ліпить характер
  }

  // Рядок поточної емоції для системного промпту LLM (або "" коли спокій).
  emotionPrompt() {
    if (!this.alive || !this.emotion || this.emotion === "neutral" || this.emotion_intensity < EMOTION_MIN) {
      return "";
    }
    const e = EMOTIONS[this.emotion];
    if (!e) return "";
    const strength =
      this.emotion_intensity >= 6 ? "сильно" : this.emotion_intensity >= 3 ? "помітно" : "трохи";
    return `ТВІЙ ПОТОЧНИЙ ЕМОЦІЙНИЙ СТАН: ти ${strength} відчуваєш «${e.label}» ${e.emoji}. Нехай це звучить у відповіді, поки не мине.`;
  }

  // --- Памʼять -------------------------------------------------------------
  // Додає репліку в короткострокове вікно діалогу. No-op для яйця (воно лише
  // видає звуки — вести діалог нема сенсу). Текст обрізається, вікно — до DIALOG_MAX.
  rememberDialog(role, text) {
    if (this.isEgg()) return;
    const t = String(text ?? "").trim();
    if (!t) return;
    this.dialog = this.dialog || [];
    this.dialog.push({ r: role === "a" ? "a" : "u", t: t.slice(0, DIALOG_ENTRY_MAX) });
    if (this.dialog.length > DIALOG_MAX) {
      this.dialog = this.dialog.slice(this.dialog.length - DIALOG_MAX);
    }
  }

  // Вікно діалогу → формат історії для chat-API ([{role, content}]).
  dialogMessages() {
    return (this.dialog || []).map((m) => ({
      role: m.r === "a" ? "assistant" : "user",
      content: m.t,
    }));
  }

  // Нормалізація факту для дедупу: нижній регістр, згорнуті пробіли,
  // без кінцевої пунктуації.
  _normMem(s) {
    return String(s).toLowerCase().replace(/\s+/g, " ").replace(/[.!?…\s]+$/u, "").trim();
  }

  // Зберігає довгостроковий факт про власника (з тега `[[mem:…]]`). Дедуп:
  // якщо новий факт = наявному або є його підрядком/надрядком — підкріплюємо
  // наявний (свіжість + інформативніший текст), без дубля. Понад MEMORY_MAX —
  // витісняється найстаріший. No-op для яйця/мертвого/порожнього. true = додано новий.
  addMemory(text) {
    if (this.isEgg() || !this.alive) return false;
    let t = String(text ?? "").trim().replace(/\s+/g, " ");
    if (!t) return false;
    t = t.slice(0, MEMORY_ENTRY_MAX);
    const nt = this._normMem(t);
    if (!nt) return false;
    this.memories = this.memories || [];
    for (const m of this.memories) {
      const nm = this._normMem(m.t);
      if (nm === nt || nm.includes(nt) || nt.includes(nm)) {
        if (t.length > m.t.length) m.t = t; // лишаємо інформативніший варіант
        m.at = now(); //                      підкріплення = свіжість
        return false;
      }
    }
    this.memories.push({ t, at: now() });
    if (this.memories.length > MEMORY_MAX) {
      this.memories.sort((a, b) => a.at - b.at); // найстаріші — спереду
      this.memories = this.memories.slice(this.memories.length - MEMORY_MAX);
    }
    return true;
  }

  // Найсвіжіші факти (для промпту/картки), найновіший — першим.
  recentMemories(limit = MEMORY_PROMPT_MAX) {
    return (this.memories || [])
      .slice()
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);
  }

  // Блок «що ти памʼятаєш про власника» для системного промпту (або "").
  memoryPrompt() {
    if (this.isEgg()) return "";
    const items = this.recentMemories();
    if (!items.length) return "";
    const lines = items.map((m) => "• " + m.t).join("\n");
    return (
      `ЩО ТИ ПАМʼЯТАЄШ ПРО ВЛАСНИКА:\n${lines}\n` +
      "Згадуй це доречно й по-теплому, ніби справді памʼятаєш — але не вивалюй списком без приводу."
    );
  }

  // HTML-картка памʼяті (для /memory і кнопки «🧠 Памʼять»). Факти екрануються.
  memoryCard() {
    if (this.isEgg()) {
      return "🥚 Я ще яйце — памʼять зʼявиться після вилуплення.";
    }
    const items = (this.memories || []).slice().sort((a, b) => b.at - a.at);
    if (!items.length) {
      return (
        "🧠 <b>Памʼять</b>\n\n" +
        "Поки що я нічого особливого про тебе не запамʼятав. " +
        "Розкажи мені щось про себе — і я триматиму це в голові 💬"
      );
    }
    const lines = items.map((m) => "• " + escapeHtml(m.t)).join("\n");
    return `🧠 <b>Що я памʼятаю про тебе</b> <i>(${items.length})</i>\n\n${lines}`;
  }

  // --- Проактивність ("режисер" виходів на звʼязок) ------------------------
  // Які типи нагадування доречні зараз. Повертає { priority, flavor }:
  //  priority — без кидка кубика, раз на день (morning/streak);
  //  flavor   — коли вже є привід вийти (потреба/тиша), обирається випадково в tick.
  // Чиста функція — уся випадковість лишається в index.js.
  proactivePlan(dayPart, today) {
    const priority = [];
    const flavor = [];
    if (this.isEgg() || !this.alive) return { priority, flavor };
    const key = dayPart?.key;
    const r = this.rituals || {};
    // Ранкове привітання — лише активним за останні 48 год, раз на день.
    const recentlyEngaged = now() - (this.last_seen || 0) < 2 * 86400;
    if (key === "morning" && recentlyEngaged && r.morning !== today) {
      priority.push("morning");
    }
    // Порятунок серії — була серія, активний учора, не сьогодні, день/вечір, раз на день.
    if (
      (this.streak || 0) >= 2 &&
      this.last_active_day === today - 1 &&
      (key === "day" || key === "evening") &&
      r.streak !== today
    ) {
      priority.push("streak");
    }
    // Флейвор: від найвиразнішого до фолбеку.
    if (this.emotion && this.emotion !== "neutral" && this.emotion_intensity >= 4) {
      flavor.push("emotion");
    }
    if (this.worstNeed() !== null) flavor.push("need");
    if ((this.memories || []).length) flavor.push("memory");
    flavor.push("thought"); // завжди можливий фолбек
    return { priority, flavor };
  }

  // Шаблон порятунку серії (без LLM). Варіант стабільно залежить від числа серії.
  streakRescueLine() {
    const n = this.streak || 0;
    const lines = [
      `🔥 Гей! У нас ${n} дн. поспіль — не дай серії згаснути сьогодні 🥺`,
      `🔥 ${n} дн. поспіль! Зазирни на хвилинку, щоб не обнулити 👀`,
      `😺 Ще трохи — і серія в ${n} дн. урветься... врятуєш?`,
    ];
    return lines[n % lines.length];
  }

  // Застосувати ефекти міні-події (довільний об'єкт stat:delta).
  applyEffects(effects) {
    this.applyDecay();
    for (const [stat, delta] of Object.entries(effects || {})) {
      if (STATS.includes(stat)) this[stat] = clamp(this[stat] + delta);
    }
    this.interactions += 1;
    if (STATS.some((s) => this[s] >= 100)) this.flags.maxed = true;
  }

  revive() {
    this.alive = true;
    for (const s of STATS) this[s] = 60;
    this.last_update = now();
    this.counts.revive = (this.counts.revive || 0) + 1;
  }

  moodWord() {
    if (!this.alive) return "мертвий (тимчасово)";
    const a = this.avg();
    if (a >= 80) return "на піку щастя";
    if (a >= 60) return "у нормі";
    if (a >= 40) return "так собі";
    if (a >= 20) return "страждає";
    return "на межі екзистенційної кризи";
  }

  moodEmoji() {
    if (!this.alive) return "💀";
    const a = this.avg();
    if (a >= 80) return "😄";
    if (a >= 60) return "🙂";
    if (a >= 40) return "😐";
    if (a >= 20) return "😟";
    return "😭";
  }

  // Бульбашка-реакція: улюбленець "промовляє" свій стан (без LLM).
  // ctx.dayPart — об'єкт пори доби (необов'язково).
  reactionBubble(ctx = {}) {
    if (!this.alive) return "💀 «...»";
    // Активна емоція від спілкування «перебиває» звичайну реакцію на потреби.
    if (this.emotion && this.emotion !== "neutral" && this.emotion_intensity >= 4) {
      const e = EMOTIONS[this.emotion];
      if (e?.bubble) return e.bubble;
    }
    // Уночі — сонний, якщо немає чогось критичного.
    if (ctx.dayPart?.key === "night" && !this.worstNeed()) {
      return "😴 «Хр-р-р... я ж сплю...»";
    }
    const hints = {
      warmth: "🥶 «Мені хо-олодно...»",
      hunger: "🍽️ «Я голодний...»",
      energy: "🥱 «Так спати хочу»",
      mood: "😞 «Мені нуу-удно»",
      hygiene: "🛁 «Я бруднуля, помий!»",
      sanity: "🌀 «Реальність якась дивна»",
      social: "🫂 «Поговори зі мною...»",
      purpose: "🌌 «У чому сенс усього цього?»",
    };
    const w = this.worstNeed();
    if (w) return hints[w];
    if (this.avg() >= 80) return "✨ «Все супер, дякую!»";
    return "🙂 «Все ок»";
  }

  // Стиль мовлення для LLM залежно від стадії розвитку.
  speechStyle() {
    const styles = [
      "Ти ще ЯЙЦЕ — говорити майже не вмієш. Лише прості звуки та *дії в зірочках*, максимум одне-два простих слова. Дуже-дуже коротко.",
      "Ти щойно вилупився, ти НЕМОВЛЯ. Говори як малюк: окремі слова, 'агу', плутаєш звуки, дуже прості фрази, мило й безпорадно.",
      "Ти ДИТИНА: цікавий до всього, ставиш багато простих питань, легко захоплюєшся, словник простий, багато емоцій.",
      "Ти ПІДЛІТОК: зухвалий, саркастичний, сленг, закочуєш очі — але в глибині потребуєш уваги.",
      "Ти ДОРОСЛИЙ і мудрий: говориш складно, красномовно, драматично, з відсиланнями до 'давніх спогадів'.",
      "Ти КОСМІЧНА СУТНІСТЬ: говориш загадково, ніби знаєш таємниці всесвіту, змішуючи глибоку мудрість з абсурдом.",
    ];
    return styles[this.evolutionInfo().index] || "";
  }

  _humanLeft(daysLeft) {
    if (daysLeft >= 1) return `~${daysLeft.toFixed(1)} дн`;
    const h = Math.max(1, Math.ceil(daysLeft * 24));
    return `~${h} год`;
  }

  // Інфо про еволюцію: поточна стадія, наступна, прогрес і скільки лишилось.
  evolutionInfo() {
    const a = this.ageDays;
    let i = 0;
    for (let k = 0; k < EVOLUTION_STAGES.length; k++) {
      if (a >= EVOLUTION_STAGES[k][0]) i = k;
    }
    const cur = EVOLUTION_STAGES[i];
    const next = EVOLUTION_STAGES[i + 1] || null;
    let progress = 1;
    let daysLeft = 0;
    if (next) {
      const span = next[0] - cur[0];
      progress = Math.max(0, Math.min(1, (a - cur[0]) / span));
      daysLeft = Math.max(0, next[0] - a);
    }
    return {
      index: i,
      current: this._stageIdentity(i),
      next: next ? this._stageIdentity(i + 1) : null,
      progress,
      daysLeft,
    };
  }

  // Компактний рядок прогресу до наступної стадії (для картки стану).
  growthLine() {
    const e = this.evolutionInfo();
    if (!e.next) return "🌌 <b>Фінальна форма!</b> Далі лише легенди.";
    const n = Math.round(e.progress * 10);
    const bar = "▰".repeat(n) + "▱".repeat(10 - n);
    return (
      `🌱 до ${e.next.emoji} <b>${e.next.name}</b>\n` +
      `<code>${bar}</code> ${Math.round(e.progress * 100)}% · ${this._humanLeft(e.daysLeft)}`
    );
  }

  // Повна мапа розвитку (для окремої картки за кнопкою «🌱 Ріст»).
  growthCard() {
    const a = this.ageDays;
    const info = this.evolutionInfo();
    // Які характеристики ВПЕРШЕ з'являються на стадії idx.
    const newAt = (idx) => {
      const prev = new Set(idx > 0 ? STAGE_STATS[idx - 1] : []);
      return (STAGE_STATS[idx] || [])
        .filter((s) => !prev.has(s))
        .map((s) => STAT_META[s][1]);
    };
    const lines = EVOLUTION_STAGES.map((st, idx) => {
      const days = st[0];
      const id = this._stageIdentity(idx); // фінальна форма гілкується (тизер шляху)
      const sname = id.name;
      const semoji = id.emoji;
      const unlock = newAt(idx);
      const plus = unlock.length ? ` <i>(+${unlock.join("")})</i>` : "";
      if (idx < info.index) return `✅ ${semoji} ${sname}`;
      if (idx === info.index) return `📍 ${semoji} <b>${sname}</b> ← зараз${plus}`;
      return `🔒 ${semoji} ${sname} — через ${this._humanLeft(Math.max(0, days - a))}${plus}`;
    });
    return (
      `🌱 <b>Шлях розвитку — ${this.name}</b>\n` +
      `<i>${info.current.desc}</i>` +
      DIV +
      lines.join("\n") +
      DIV +
      this.growthLine()
    );
  }

  worstNeed() {
    const act = this.activeStats();
    let worst = act[0];
    for (const s of act) if (this[s] < this[worst]) worst = s;
    return this[worst] < 40 ? worst : null;
  }

  statusCard(ctx = {}) {
    const { name, emoji } = this.stage();
    const dot = (v) => (v >= 60 ? "🟢" : v >= 30 ? "🟡" : "🔴");
    const bar = (v) => {
      const n = Math.max(0, Math.min(10, Math.round(v / 10)));
      return "▰".repeat(n) + "▱".repeat(10 - n);
    };
    const streakLine = this.streak >= 2 ? `\n🔥 ${this.streak} дн. поспіль` : "";

    // Особлива картка ЯЙЦЯ — з акцентом на вилупленні.
    if (this.isEgg()) {
      const e = this.evolutionInfo();
      const hatch = bar(e.progress * 100);
      const warm = Math.round(this.warmth);
      return (
        `${emoji} <b>${this.name}</b> · <i>Яйце</i>${streakLine}\n` +
        `🔮 Передчуття: воно буде <b>${eggMystery(this.eggTemperamentTrajectory(), this.name)}</b>` +
        DIV +
        `${this.eggSign()}` +
        DIV +
        `🐣 <b>Вилуплення</b>\n<code>${hatch}</code> ${Math.round(e.progress * 100)}% · ще ${this._humanLeft(e.daysLeft)}` +
        DIV +
        `🔥 <b>Тепло</b> ${dot(warm)} <code>${bar(warm)}</code> <b>${warm}%</b>\n` +
        `<i>Гарно грій — і воно вилупиться щасливим 🥰</i>`
      );
    }
    const rows = this.activeStats().map((s) => {
      const [label, em] = STAT_META[s];
      const v = Math.round(this[s]);
      return `${em} ${label} ${dot(v)}\n<code>${bar(v)}</code> <b>${v}%</b>`;
    });
    const tod = ctx.dayPart ? `  ·  ${ctx.dayPart.emoji}` : "";
    const idParts = [];
    if (this.temperament) idParts.push(`🧬 ${this.temperamentLabel()}`);
    if (this.personalityLabel()) {
      const forming = this.personaForming() ? " <i>(формується…)</i>" : "";
      idParts.push(`🎭 ${this.personalityLabel()}${forming}`);
    }
    const idLine = idParts.length ? `\n${idParts.join("  ·  ")}` : "";
    const header =
      `${emoji} <b>${this.name}</b> · <i>${name}</i>${idLine}\n` +
      `🎂 ${this.ageDays.toFixed(1)} дн.  ·  ${this.moodEmoji()} ${this.moodWord()}${tod}${streakLine}\n` +
      `${this.reactionBubble(ctx)}`;
    if (!this.alive) {
      return header + DIV + rows.join("\n") +
        DIV + "☠️ <b>Тимчасово мертвий.</b> Тисни «⚡ Воскресити».";
    }
    return header + DIV + rows.join("\n") + DIV + this.growthLine();
  }

  toJSON() {
    return {
      name: this.name,
      personality: this.personality,
      persona: this.persona,
      persona_locked: this.persona_locked,
      born_at: this.born_at,
      last_update: this.last_update,
      last_seen: this.last_seen,
      last_nudge: this.last_nudge,
      awaiting_name: this.awaiting_name,
      alive: this.alive,
      warmth: this.warmth,
      social: this.social,
      purpose: this.purpose,
      hunger: this.hunger,
      energy: this.energy,
      mood: this.mood,
      hygiene: this.hygiene,
      sanity: this.sanity,
      counts: this.counts,
      achievements: this.achievements,
      seen_stage: this.seen_stage,
      egg_warm_sum: this.egg_warm_sum,
      egg_hours: this.egg_hours,
      temperament: this.temperament,
      last_event: this.last_event,
      interactions: this.interactions,
      chat_count: this.chat_count,
      deaths: this.deaths,
      streak: this.streak,
      best_streak: this.best_streak,
      last_active_day: this.last_active_day,
      flags: this.flags,
      menu_set: this.menu_set,
      emotion: this.emotion,
      emotion_intensity: this.emotion_intensity,
      emotion_at: this.emotion_at,
      dialog: this.dialog,
      memories: this.memories,
      rituals: this.rituals,
      last_ability: this.last_ability,
    };
  }
}

// Пора доби з урахуванням зсуву часового поясу (TZ_OFFSET_HOURS, типово Київ +3).
export function dayPart(offsetHours = 0) {
  const off = Number.isFinite(offsetHours) ? offsetHours : 0;
  const h = new Date(Date.now() + off * 3600 * 1000).getUTCHours();
  // «Ніч» збігається з проміжком нічного сповільнення занепаду (NIGHT_START..NIGHT_END),
  // тобто 22:00–07:59 — щоб «не турбувати вночі» (cron) відповідало часу сну.
  if (h >= NIGHT_START || h < NIGHT_END)
    return {
      key: "night",
      emoji: "🌙",
      label: "ніч",
      note: "Зараз ніч — ти сонний, позіхаєш, говориш мляво й трохи бурчиш, що тебе потурбували.",
    };
  if (h < 12)
    return {
      key: "morning",
      emoji: "🌅",
      label: "ранок",
      note: "Зараз ранок — ти бадьорий, енергійний та оптимістичний.",
    };
  if (h < 18)
    return {
      key: "day",
      emoji: "☀️",
      label: "день",
      note: "Зараз день — звичайний робочий настрій.",
    };
  return {
    key: "evening",
    emoji: "🌆",
    label: "вечір",
    note: "Зараз вечір — ти розслаблений, трохи філософський, готуєшся до сну.",
  };
}
