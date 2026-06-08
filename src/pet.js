// pet.js — вся логіка тамагочі: стан, занепад (decay), дії, еволюція.
// Чиста логіка, без залежностей від Телеграму чи LLM.

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
const DECAY_PER_HOUR = {
  warmth: 6.0,
  hunger: 8.0,
  hygiene: 4.0,
  energy: 5.0,
  mood: 6.0,
  sanity: 3.0,
  social: 4.0,
  purpose: 2.5,
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

const clamp = (v) => Math.max(0, Math.min(100, v));

export class Pet {
  constructor(d = {}) {
    const t = now();
    this.name = d.name ?? "Безіменко";
    this.personality = d.personality ?? "gremlin";
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
    const elapsedH = (now() - this.last_update) / 3600;
    if (elapsedH <= 0) return;
    // Занепадають лише активні на цій стадії характеристики.
    for (const stat of this.activeStats()) {
      this[stat] = clamp(this[stat] - (DECAY_PER_HOUR[stat] || 0) * elapsedH);
    }
    this.last_update = now();
    // "Смерть" можлива лише коли психіка вже є (стадія підлітка+) і все на нулі.
    const act = this.activeStats();
    if (act.includes("sanity") && this.hunger <= 0 && this.sanity <= 0) {
      this.alive = false;
    }
  }

  doAction(action) {
    this.applyDecay();
    const def = ACTIONS[action];
    for (const [stat, delta] of Object.entries(def ? def.effects : {})) {
      this[stat] = clamp(this[stat] + delta);
    }
    this.counts[action] = (this.counts[action] || 0) + 1;
  }

  // Застосувати ефекти міні-події (довільний об'єкт stat:delta).
  applyEffects(effects) {
    this.applyDecay();
    for (const [stat, delta] of Object.entries(effects || {})) {
      if (STATS.includes(stat)) this[stat] = clamp(this[stat] + delta);
    }
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
      `<i>${info.current.desc}</i>\n\n` +
      lines.join("\n") +
      "\n\n" +
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
    const rows = this.activeStats().map((s) => {
      const [label, em] = STAT_META[s];
      const v = Math.round(this[s]);
      return `${em} ${label} ${dot(v)}\n<code>${bar(v)}</code> <b>${v}%</b>`;
    });
    const tod = ctx.dayPart ? `  ·  ${ctx.dayPart.emoji}` : "";
    const header =
      `${emoji} <b>${this.name}</b> · <i>${name}</i>\n` +
      `🎂 ${this.ageDays.toFixed(1)} дн.  ·  ${this.moodEmoji()} ${this.moodWord()}${tod}\n` +
      `${this.reactionBubble(ctx)}`;
    if (!this.alive) {
      return header + "\n\n" + rows.join("\n") +
        "\n\n☠️ <b>Тимчасово мертвий.</b> Тисни «⚡ Воскресити».";
    }
    return header + "\n\n" + rows.join("\n") + "\n\n" + this.growthLine();
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
