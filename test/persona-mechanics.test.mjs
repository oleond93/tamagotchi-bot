// Тести «класових» механік характеру (чисті функції). Запуск: `node test/persona-mechanics.test.mjs`.
// Без фреймворку — простий асерт + ненульовий код виходу при провалі.

import { Pet, now } from "../src/pet.js";

let failed = 0;
function ok(cond, msg) {
  if (cond) console.log("  ✓ " + msg);
  else { failed++; console.log("  ✗ FAIL: " + msg); }
}
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ~${b})`); }

const DAY = 86400;
// Пет заданого архетипу/стадії; last_update=now() → applyDecay усередині дій = no-op,
// тож дельти показників детерміновані.
function petPersona(arch, days, extra = {}) {
  return new Pet({
    born_at: now() - days * DAY,
    persona: { [arch]: 10 },
    personality: arch,
    temperament: "balanced",
    last_update: now(),
    ...extra,
  });
}

console.log("_decayMult — пасиви занепаду:");
{
  ok(petPersona("sunshine", 4)._decayMult("mood") === 0.6, "🌞 настрій ×0.6");
  ok(petPersona("sleepy", 4)._decayMult("energy") === 0.65, "😴 енергія ×0.65");
  ok(petPersona("gremlin", 4)._decayMult("hygiene") === 1.3, "😈 чистота ×1.3");
  ok(petPersona("philosopher", 8)._decayMult("sanity") === 0.7, "🌌 психіка ×0.7");
  ok(petPersona("nerd", 4)._decayMult("energy") === 1, "невизначений показник → дефолт 1.0");
  const egg = new Pet({ born_at: now() });
  ok(egg._decayMult("warmth") === 1, "яйце (без persona) → 1.0");
}

console.log("doAction — синергія дій:");
{
  // 🌞 Сонечко любить play (основний показник play = mood, +35 → ×1.4).
  const sun = petPersona("sunshine", 4, { mood: 10, energy: 80, hunger: 80 });
  const r1 = sun.doAction("play");
  ok(r1.synergy === "like", "🌞 + play → synergy=like");
  near(sun.mood, 59, 0.5, "like: mood +35×1.4 = +49 (10→59)");

  // 😴 Сонько не любить play → ×0.6 + штраф −5 настрою.
  const slp = petPersona("sleepy", 4, { mood: 50, energy: 80, hunger: 80 });
  const r2 = slp.doAction("play");
  ok(r2.synergy === "dislike", "😴 + play → synergy=dislike");
  near(slp.mood, 66, 0.5, "dislike: mood +35×0.6 −5 = +16 (50→66)");

  // Нейтрально: 😈 Ґремлін + feed (основний hunger, без синергії).
  const gr = petPersona("gremlin", 4, { hunger: 10 });
  const r3 = gr.doAction("feed");
  ok(r3.synergy === null, "нейтральна дія → synergy=null");
  near(gr.hunger, 50, 0.5, "feed: hunger +40 без множника (10→50)");
}

console.log("applyEmotion — підсилення емоцій характером (🎬):");
{
  const drama = petPersona("drama", 4, { mood: 50 });
  const nerd = petPersona("nerd", 4, { mood: 50 });
  drama.applyEmotion("joy", 10); // joy: mood +6 при силі 10
  nerd.applyEmotion("joy", 10);
  ok(drama.mood > nerd.mood, `🎬 Драма приростає сильніше за 🤓 Ботаніка (${drama.mood} > ${nerd.mood})`);
  near(drama.mood - 50, 7.8, 0.2, "🎬: 6×1.0×1.3 = 7.8");
  near(nerd.mood - 50, 6, 0.2, "🤓: 6×1.0×1.0 = 6");
}

console.log("Фірмова здібність:");
{
  const sun = petPersona("sunshine", 4, { mood: 10, energy: 80, hunger: 80 });
  const info = sun.abilityInfo();
  ok(info && /Промінчик/.test(info.label), "🌞 має фірмову здібність");
  ok(sun.abilityReadyIn() === 0, "свіжий пет: здібність готова");

  const res = sun.useAbility();
  ok(res.ok === true, "useAbility спрацював");
  near(sun.mood, 50, 0.5, "ефект: mood +40 (10→50)");
  ok(sun.abilityReadyIn() > 0, "після використання — кулдаун");
  ok(sun.useAbility().ok === false, "повторно під час кулдауну → ok:false");

  // social неактивний на стадії index2 → ефект на нього ігнорується.
  const sun2 = petPersona("sunshine", 4, { social: 50 });
  sun2.useAbility();
  ok(sun2.social === 50, "ефект лише на активні показники (social не чіпається)");

  const egg = new Pet({ born_at: now() });
  ok(egg.abilityInfo() === null, "яйце: здібності немає");
  ok(egg.useAbility().ok === false, "яйце: useAbility → ok:false");

  const dead = petPersona("sunshine", 4, { alive: false });
  ok(dead.useAbility().ok === false, "мертвий: useAbility → ok:false");
}

console.log("toJSON — round-trip last_ability:");
{
  const p = petPersona("nerd", 4);
  p.useAbility();
  const p2 = new Pet(p.toJSON());
  ok(p2.last_ability === p.last_ability && p2.last_ability > 0, "last_ability серіалізується");
}

console.log(failed === 0 ? "\nALL PASS ✅" : `\n${failed} FAIL ❌`);
process.exit(failed === 0 ? 0 : 1);
