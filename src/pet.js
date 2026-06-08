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

export function now() {
  return Date.now() / 1000;
}

// Часовий пояс для «нічного» сповільнення (встановлює index.js з env).
let TZ_OFFSET = 3;
export function setTzOffset(h) {
  TZ_OFFSET = Number(h) || 0;
}

// Уночі (22:00–08:00 за локальним часом) занепад сповільнюється у 5 разів,
// щоб за ~8 год сну показники падали майже до мінімуму, але не до нуля.
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
    // Характер призначається ВИПАДКОВО при вилупленні (null, поки яйце).
    this.personality = d.personality ?? null;
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
  }

  // Вдача за середнім теплом, яке яйце мало до вилуплення.
  computeTemperament() {
    const avg = this.egg_hours > 0 ? this.egg_warm_sum / this.egg_hours : 70;
    if (avg >= 85) return "angelic";
    if (avg >= 68) return "gentle";
    if (avg >= 50) return "balanced";
    if (avg >= 32) return "feisty";
    return "wild";
  }

  // Щойно перестали бути яйцем — закріпити вдачу (від догляду) і характер (випадково).
  finalizeOnHatch() {
    if (this.isEgg()) return;
    if (!this.temperament) this.temperament = this.computeTemperament();
    if (!this.personality) {
      const keys = Object.keys(PERSONALITIES);
      this.personality = keys[Math.floor(Math.random() * keys.length)];
    }
  }

  temperamentLabel() {
    return this.temperament ? TEMPERAMENTS[this.temperament].label : "";
  }

  personalityLabel() {
    return this.personality && PERSONALITIES[this.personality]
      ? PERSONALITIES[this.personality].label
      : "";
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
    const [, sname, semoji, desc] = st;
    const prev = new Set(idx > 0 ? STAGE_STATS[idx - 1] : []);
    const unlocked = (STAGE_STATS[idx] || [])
      .filter((s) => !prev.has(s))
      .map((s) => `${STAT_META[s][1]} ${STAT_META[s][0]}`);
    const unlockedTxt = unlocked.length ? `\n🔓 Відкрито: ${unlocked.join(", ")}` : "";
    if (idx === 1) {
      const reveal = this.temperamentReveal();
      const persLine = this.personalityLabel()
        ? `\n🎭 Характер: <b>${this.personalityLabel()}</b>`
        : "";
      return (
        "💥💥💥 <b>ШКАРАЛУПА ТРІСНУЛА!</b>\n\n" +
        `🎉 <b>${this.name} вилупився!</b>\n` +
        `Тепер це ${semoji} <i>${sname}</i> — ${desc}.${unlockedTxt}` +
        (reveal ? `\n\n${reveal}` : "") +
        persLine
      );
    }
    return (
      "✨✨ <b>ЕВОЛЮЦІЯ!</b> ✨✨\n\n" +
      `${semoji} <b>${this.name}</b> росте далі → <i>${sname}</i>\n` +
      `<i>${desc}</i>${unlockedTxt}`
    );
  }

  isEgg() {
    return this.evolutionInfo().index === 0;
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
    let result = EVOLUTION_STAGES[0];
    for (const s of EVOLUTION_STAGES) {
      if (this.ageDays >= s[0]) result = s;
    }
    return { name: result[1], emoji: result[2] };
  }

  avg() {
    const act = this.activeStats();
    return act.reduce((a, s) => a + this[s], 0) / act.length;
  }

  applyDecay() {
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
      // Занепадають лише активні на цій стадії характеристики.
      for (const stat of this.activeStats()) {
        this[stat] = clamp(this[stat] - (DECAY_PER_HOUR[stat] || 0) * effH);
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
    for (const [stat, delta] of Object.entries(def ? def.effects : {})) {
      this[stat] = clamp(this[stat] + delta);
    }
    this.counts[action] = (this.counts[action] || 0) + 1;
    this.interactions += 1;
    if (STATS.some((s) => this[s] >= 100)) this.flags.maxed = true;
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
      current: { name: cur[1], emoji: cur[2], desc: cur[3] },
      next: next ? { name: next[1], emoji: next[2], desc: next[3] } : null,
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
      const [days, sname, semoji] = st;
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
        `🔮 Передчуття: воно буде <b>${eggMystery(this.name)}</b>` +
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
    if (this.personalityLabel()) idParts.push(`🎭 ${this.personalityLabel()}`);
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
    };
  }
}

// Пора доби з урахуванням зсуву часового поясу (TZ_OFFSET_HOURS, типово Київ +3).
export function dayPart(offsetHours = 0) {
  const h = new Date(Date.now() + offsetHours * 3600 * 1000).getUTCHours();
  if (h < 6)
    return {
      key: "night",
      emoji: "🌙",
      label: "ніч",
      note: "Зараз глибока ніч — ти сонний, позіхаєш, говориш мляво й трохи бурчиш, що тебе потурбували.",
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
