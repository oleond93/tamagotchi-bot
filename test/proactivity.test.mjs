// Тести «режисера» проактивності (чисті функції). Запуск: `node test/proactivity.test.mjs`.
// Без фреймворку — простий асерт + ненульовий код виходу при провалі.

import { Pet, now } from "../src/pet.js";

let failed = 0;
function ok(cond, msg) {
  if (cond) {
    console.log("  ✓ " + msg);
  } else {
    failed++;
    console.log("  ✗ FAIL: " + msg);
  }
}

const DAY = 86400;
const T = 20000; // довільний день-індекс «сьогодні» для тестів
// Не-яйце (підліток ~8 дн), бачили щойно — за замовчуванням активний.
function petAt(days, extra = {}) {
  return new Pet({
    born_at: now() - days * DAY,
    persona: { sunshine: 10 },
    last_seen: now(),
    ...extra,
  });
}
const MORNING = { key: "morning" };
const DAYP = { key: "day" };
const EVENING = { key: "evening" };
const NIGHT = { key: "night" };

console.log("proactivePlan — egg/dead:");
{
  const egg = new Pet({ born_at: now() });
  const p = egg.proactivePlan(MORNING, T);
  ok(p.priority.length === 0 && p.flavor.length === 0, "яйце: порожній план");

  const dead = petAt(8, { alive: false });
  const d = dead.proactivePlan(DAYP, T);
  ok(d.priority.length === 0 && d.flavor.length === 0, "мертвий: порожній план");
}

console.log("proactivePlan — ранкове привітання:");
{
  const p = petAt(8);
  ok(p.proactivePlan(MORNING, T).priority.includes("morning"), "ранок + активний → morning у priority");

  const greeted = petAt(8, { rituals: { morning: T } });
  ok(!greeted.proactivePlan(MORNING, T).priority.includes("morning"), "вже вітались сьогодні → ні");

  const lapsed = petAt(8, { last_seen: now() - 3 * DAY });
  ok(!lapsed.proactivePlan(MORNING, T).priority.includes("morning"), "лапснутий (>48год) → без ранкового");

  const p2 = petAt(8);
  ok(!p2.proactivePlan(DAYP, T).priority.includes("morning"), "не ранок → без ранкового");
}

console.log("proactivePlan — порятунок серії:");
{
  const risk = petAt(8, { streak: 3, last_active_day: T - 1 });
  ok(risk.proactivePlan(DAYP, T).priority.includes("streak"), "серія під загрозою (день) → streak");
  ok(risk.proactivePlan(EVENING, T).priority.includes("streak"), "серія під загрозою (вечір) → streak");

  const activeToday = petAt(8, { streak: 3, last_active_day: T });
  ok(!activeToday.proactivePlan(DAYP, T).priority.includes("streak"), "активний сьогодні → без streak");

  const tiny = petAt(8, { streak: 1, last_active_day: T - 1 });
  ok(!tiny.proactivePlan(DAYP, T).priority.includes("streak"), "серія <2 → без streak");

  const pinged = petAt(8, { streak: 3, last_active_day: T - 1, rituals: { streak: T } });
  ok(!pinged.proactivePlan(DAYP, T).priority.includes("streak"), "вже пінгували сьогодні → ні");

  const morningRisk = petAt(8, { streak: 3, last_active_day: T - 1 });
  ok(!morningRisk.proactivePlan(MORNING, T).priority.includes("streak"), "ранок → streak не тут (день/вечір)");
}

console.log("proactivePlan — флейвор:");
{
  const emo = petAt(8, { emotion: "anger", emotion_intensity: 6 });
  ok(emo.proactivePlan(DAYP, T).flavor.includes("emotion"), "сильна емоція → emotion");

  const weak = petAt(8, { emotion: "anger", emotion_intensity: 2 });
  ok(!weak.proactivePlan(DAYP, T).flavor.includes("emotion"), "слабка емоція → без emotion");

  const need = petAt(8, { hunger: 10 }); // worstNeed != null
  ok(need.proactivePlan(DAYP, T).flavor.includes("need"), "гостра потреба → need");

  const mem = petAt(8);
  mem.addMemory("власник любить каву");
  ok(mem.proactivePlan(DAYP, T).flavor.includes("memory"), "є памʼять → memory");

  const plain = petAt(8); // 80/80/... без потреб, без емоції, без памʼяті
  const f = plain.proactivePlan(DAYP, T).flavor;
  ok(f.includes("thought"), "thought завжди можливий");
  ok(f.length === 1 && f[0] === "thought", "без приводів → лише thought");
}

console.log("streakRescueLine:");
{
  const p = petAt(8, { streak: 5 });
  const line = p.streakRescueLine();
  ok(typeof line === "string" && line.length > 0, "повертає непорожній рядок");
  ok(line.includes("5"), "згадує число серії");
}

console.log(failed === 0 ? "\nALL PASS ✅" : `\n${failed} FAIL ❌`);
process.exit(failed === 0 ? 0 : 1);
