// achievements.js — 23 досягнення на різні теми. check(pet, ctx) → true, коли здобуте.

export const ACHIEVEMENTS = [
  // ── ☀️ Турбота й любов ──────────────────────────────────────────────────
  { id: "named", emoji: "🐣", title: "Перші кроки", desc: "Дати ім'я улюбленцю",
    check: (p) => p.name && p.name !== "Безіменко" },
  { id: "maxed", emoji: "💯", title: "На максимум", desc: "Підняти будь-яку потребу до 100%",
    check: (p) => !!p.flags?.maxed },
  { id: "perfect", emoji: "🌟", title: "Ідеальний догляд", desc: "Усі активні показники ≥ 90% одночасно",
    check: (p) => p.alive && p.activeStats().every((s) => p[s] >= 90) },
  { id: "week", emoji: "🔥", title: "Тиждень разом", desc: "Прожити 7 днів",
    check: (p) => p.ageDays >= 7 },
  { id: "month", emoji: "🎂", title: "Місяць разом", desc: "Прожити 30 днів",
    check: (p) => p.ageDays >= 30 },
  { id: "inseparable", emoji: "💖", title: "Нерозлучні", desc: "100 взаємодій усього",
    check: (p) => (p.interactions || 0) >= 100 },
  // ── 📅 Відданість (денний стрік) ─────────────────────────────────────────
  { id: "streak3", emoji: "📅", title: "Три дні поспіль", desc: "Заходити 3 дні підряд",
    check: (p) => (p.streak || 0) >= 3 },
  { id: "streak7", emoji: "🗓️", title: "Тиждень дисципліни", desc: "Стрік 7 днів поспіль",
    check: (p) => (p.streak || 0) >= 7 },
  { id: "streak30", emoji: "🏅", title: "Місяць відданості", desc: "Стрік 30 днів поспіль",
    check: (p) => (p.streak || 0) >= 30 },
  // ── 🕐 Час доби ───────────────────────────────────────────────────────────
  { id: "night_owl", emoji: "🌙", title: "Нічна сова", desc: "Зайти вночі (00–06)",
    check: (p, c) => c?.dayPart?.key === "night" },
  { id: "early_bird", emoji: "🌅", title: "Рання пташка", desc: "Зайти зранку (06–12)",
    check: (p, c) => c?.dayPart?.key === "morning" },
  // ── 🥀 Темні / сумні ──────────────────────────────────────────────────────
  { id: "redzone", emoji: "🥀", title: "На межі", desc: "Довести показник до 0%",
    check: (p) => !!p.flags?.red },
  { id: "froze", emoji: "🧊", title: "Дитя холоду", desc: "Дати яйцю замерзнути",
    check: (p) => !!p.flags?.froze },
  { id: "loss", emoji: "⚰️", title: "Втрата", desc: "Допустити «смерть»",
    check: (p) => (p.deaths || 0) >= 1 },
  { id: "prodigal", emoji: "👻", title: "Блудний улюбленець", desc: "Повернутись після 3+ днів відсутності",
    check: (p) => !!p.flags?.prodigal },
  // ── 🤪 Смішні / подієві ───────────────────────────────────────────────────
  { id: "cultist", emoji: "🧦", title: "Шкарпетковий культист", desc: "Приєднатись до культу (подія)",
    check: (p) => !!p.flags?.cult },
  { id: "heartbreak", emoji: "🍞", title: "Розбите серце", desc: "Дізнатись, що тостер неживий (подія)",
    check: (p) => !!p.flags?.heartbreak },
  { id: "social", emoji: "🤡", title: "Душа компанії", desc: "Написати 50 повідомлень у чаті",
    check: (p) => (p.chat_count || 0) >= 50 },
  { id: "explorer", emoji: "🎲", title: "Шукач пригод", desc: "Пережити 10 подій",
    check: (p) => (p.counts?.event || 0) >= 10 },
  // ── 🎭 Доля / лотерея ─────────────────────────────────────────────────────
  { id: "born_wild", emoji: "😈", title: "Народжений у холоді", desc: "Вилупитись Диким",
    check: (p) => p.temperament === "wild" },
  { id: "blessed", emoji: "😇", title: "Благословенне", desc: "Вилупитись Янголом",
    check: (p) => p.temperament === "angelic" },
  { id: "zen", emoji: "🧘", title: "Внутрішній спокій", desc: "10 разів заспокоїти/медитувати",
    check: (p) => ((p.counts?.calm || 0) + (p.counts?.meditate || 0)) >= 10 },
  // ── 🏆 Мета ───────────────────────────────────────────────────────────────
  { id: "master", emoji: "🏆", title: "Майстер турботи", desc: "Відкрити 15 інших досягнень",
    check: (p) => (p.achievements?.length || 0) >= 15 },
];

// Позначає нові досягнення (мутує pet.achievements). Повертає масив щойно здобутих.
export function checkNew(pet, ctx = {}) {
  const earned = new Set(pet.achievements || []);
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!earned.has(a.id) && a.check(pet, ctx)) {
      earned.add(a.id);
      fresh.push(a);
    }
  }
  pet.achievements = [...earned];
  return fresh;
}

export function achievementsCard(pet) {
  const earned = new Set(pet.achievements || []);
  const lines = ACHIEVEMENTS.map((a) =>
    earned.has(a.id)
      ? `${a.emoji} <b>${a.title}</b> ✅\n      <i>${a.desc}</i>`
      : `🔒 <b>${a.title}</b>\n      <i>${a.desc}</i>`
  );
  return (
    `🏆 <b>Досягнення — ${pet.name}</b>  (${earned.size}/${ACHIEVEMENTS.length})\n\n` +
    lines.join("\n")
  );
}
