// achievements.js — система досягнень (бейджів).
// Кожне досягнення має check(pet, ctx) → true, коли здобуте.

export const ACHIEVEMENTS = [
  { id: "named", emoji: "🐣", title: "Перші кроки", desc: "Дати ім'я улюбленцю",
    check: (p) => p.name && p.name !== "Безіменко" },
  { id: "chef", emoji: "🍗", title: "Шеф-кухар", desc: "Погодувати 10 разів",
    check: (p) => (p.counts.feed || 0) >= 10 },
  { id: "player", emoji: "🎮", title: "Масовик-затійник", desc: "Пограти 10 разів",
    check: (p) => (p.counts.play || 0) >= 10 },
  { id: "clean_freak", emoji: "🛁", title: "Чистюля", desc: "Помити 5 разів",
    check: (p) => (p.counts.clean || 0) >= 5 },
  { id: "caring", emoji: "🌟", title: "Дбайливий", desc: "Тримати середній стан ≥ 80%",
    check: (p) => p.alive && p.avg() >= 80 },
  { id: "night_owl", emoji: "🌙", title: "Нічна сова", desc: "Зайти вночі (00–06)",
    check: (p, ctx) => ctx?.dayPart?.key === "night" },
  { id: "week", emoji: "🔥", title: "Тиждень разом", desc: "Прожити 7 днів",
    check: (p) => p.ageDays >= 7 },
  { id: "phoenix", emoji: "⚡", title: "Фенікс", desc: "Воскреснути після смерті",
    check: (p) => (p.counts.revive || 0) >= 1 },
  { id: "evolved", emoji: "🧬", title: "Еволюція!", desc: "Дорости до 3-ї стадії",
    check: (p) => p.evolutionInfo().index >= 2 },
  { id: "explorer", emoji: "🎲", title: "Шукач пригод", desc: "Пережити 3 події",
    check: (p) => (p.counts.event || 0) >= 3 },
];

// Перевіряє й позначає нові досягнення. Повертає масив щойно здобутих.
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
