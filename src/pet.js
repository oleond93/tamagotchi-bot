// pet.js — вся логіка тамагочі: стан, занепад (decay), дії, еволюція.
// Чиста логіка, без залежностей від Телеграму чи LLM.

export const STATS = ["hunger", "energy", "mood", "hygiene", "sanity"];

export const STAT_LABELS = {
  hunger: ["Ситість", "🍗"],
  energy: ["Енергія", "⚡"],
  mood: ["Настрій", "🎉"],
  hygiene: ["Чистота", "🛁"],
  sanity: ["Психіка", "🤪"],
};

// Скільки одиниць показник втрачає за ГОДИНУ реального часу.
const DECAY_PER_HOUR = {
  hunger: 8.0,
  energy: 5.0,
  mood: 6.0,
  hygiene: 4.0,
  sanity: 3.0,
};

const ACTION_EFFECTS = {
  feed: { hunger: +40, mood: +5, hygiene: -5, sanity: +2 },
  play: { mood: +35, energy: -15, hunger: -10, sanity: +10 },
  sleep: { energy: +50, mood: +5, hunger: -5 },
  clean: { hygiene: +50, mood: +8 },
};

// Стадії еволюції за віком (у днях).
const EVOLUTION_STAGES = [
  [0, "Яйце", "🥚"],
  [1, "Слизька Грудка", "🫠"],
  [3, "Дивне Створіння", "👾"],
  [7, "Хаотичний Монстр", "😈"],
  [14, "Стародавнє Зло", "🐉"],
  [30, "Космічна Сутність", "🌌"],
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
    this.hunger = d.hunger ?? 80;
    this.energy = d.energy ?? 80;
    this.mood = d.mood ?? 80;
    this.hygiene = d.hygiene ?? 80;
    this.sanity = d.sanity ?? 70;
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
    return STATS.reduce((a, s) => a + this[s], 0) / STATS.length;
  }

  applyDecay() {
    if (!this.alive) return;
    const elapsedH = (now() - this.last_update) / 3600;
    if (elapsedH <= 0) return;
    for (const [stat, rate] of Object.entries(DECAY_PER_HOUR)) {
      this[stat] = clamp(this[stat] - rate * elapsedH);
    }
    this.last_update = now();
    if (this.hunger <= 0 && this.sanity <= 0) this.alive = false;
  }

  doAction(action) {
    this.applyDecay();
    for (const [stat, delta] of Object.entries(ACTION_EFFECTS[action] || {})) {
      this[stat] = clamp(this[stat] + delta);
    }
  }

  revive() {
    this.alive = true;
    for (const s of STATS) this[s] = 60;
    this.last_update = now();
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

  worstNeed() {
    let worst = STATS[0];
    for (const s of STATS) if (this[s] < this[worst]) worst = s;
    return this[worst] < 40 ? worst : null;
  }

  statusCard() {
    const { name, emoji } = this.stage();
    const bars = STATS.map((s) => {
      const [label, em] = STAT_LABELS[s];
      const val = Math.round(this[s]);
      const filled = "█".repeat(Math.floor(val / 10));
      const empty = "░".repeat(10 - Math.floor(val / 10));
      return `${em} ${label}: ${filled}${empty} ${val}%`;
    });
    const dead = this.alive
      ? ""
      : "\n☠️ <b>Стан: тимчасово мертвий</b> (/revive щоб воскресити)";
    return (
      `${emoji} <b>${this.name}</b> — ${name}\n` +
      `Вік: ${this.ageDays.toFixed(1)} дн. · Настрій: ${this.moodWord()}\n\n` +
      bars.join("\n") +
      dead
    );
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
      hunger: this.hunger,
      energy: this.energy,
      mood: this.mood,
      hygiene: this.hygiene,
      sanity: this.sanity,
    };
  }
}
