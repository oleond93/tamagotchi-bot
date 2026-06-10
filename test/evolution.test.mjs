// Тести гілчастої еволюції (чисті функції). Запуск: `node test/evolution.test.mjs`.
// Без фреймворку — простий асерт + ненульовий код виходу при провалі.

import { Pet, now } from "../src/pet.js";

let failed = 0;
function ok(cond, msg) {
  if (cond) console.log("  ✓ " + msg);
  else { failed++; console.log("  ✗ FAIL: " + msg); }
}

const DAY = 86400;
// Пет заданих віку/характеру/вдачі.
function pet(days, arch, temper, extra = {}) {
  return new Pet({
    born_at: now() - days * DAY,
    persona: { [arch]: 10 },
    personality: arch,
    persona_locked: true,
    temperament: temper,
    ...extra,
  });
}
const FINAL = 31; // днів — index 5 (фінальна форма)

console.log("evolutionPath — вдача × характер:");
{
  ok(pet(FINAL, "gremlin", "wild").evolutionPath() === "demon", "Ґремлін × Дике → demon");
  ok(pet(FINAL, "gremlin", "gentle").evolutionPath() === "imp", "Ґремлін × Лагідне → imp");
  ok(pet(FINAL, "sunshine", "angelic").evolutionPath() === "angel", "Сонечко × Янгол → angel");
  ok(pet(FINAL, "sunshine", "balanced").evolutionPath() === "sun", "Сонечко × Врівноважене → sun");
  ok(pet(FINAL, "philosopher", "angelic").evolutionPath() === "enlightened", "Філософ × Янгол → enlightened");
  ok(pet(FINAL, "philosopher", "wild").evolutionPath() === "void", "Філософ × Дике → void");
  ok(pet(FINAL, "rebel", "wild").evolutionPath() === "outlaw", "Бунтар × Дике → outlaw");
  ok(pet(FINAL, "rebel", "gentle").evolutionPath() === "free", "Бунтар × Лагідне → free");
  ok(pet(FINAL, "drama", "balanced").evolutionPath() === "star", "Драма → star (будь-яка вдача)");
  ok(pet(FINAL, "nerd", "wild").evolutionPath() === "machine", "Ботанік → machine");
  ok(pet(FINAL, "sleepy", "angelic").evolutionPath() === "dream", "Сонько → dream");

  const egg = new Pet({ born_at: now() });
  ok(egg.evolutionPath() === null, "яйце (без persona) → null");
}

console.log("_stageIdentity:");
{
  const demon = pet(FINAL, "gremlin", "wild");
  const id = demon._stageIdentity(5);
  ok(id.name === "Хаос-Демон" && id.emoji === "👹", "фінал gremlin×wild → Хаос-Демон 👹");

  const mid = demon._stageIdentity(2);
  ok(mid.name === "Дивне Створіння", "проміжна стадія (index2) → канон");

  const nopersona = new Pet({ born_at: now() - FINAL * DAY, temperament: "balanced" });
  ok(nopersona._stageIdentity(5).name === "Космічна Сутність", "фінал без persona → дефолт Космічна Сутність");
}

console.log("stage() — гілчаста назва на фінальній стадії:");
{
  const p = pet(FINAL, "gremlin", "wild");
  ok(p.stage().name === "Хаос-Демон" && p.stage().emoji === "👹", "31 дн gremlin×wild → Хаос-Демон");

  const young = pet(4, "gremlin", "wild");
  ok(young.stage().name === "Дивне Створіння", "молодий gremlin → канонічна стадія");
}

console.log("evolutionInfo().next — тизер фінальної форми:");
{
  const p = pet(15, "drama", "balanced"); // index 4 (Стародавнє Зло), наступна = фінал
  ok(p.evolutionInfo().index === 4, "15 дн → index 4");
  ok(p.evolutionInfo().next && p.evolutionInfo().next.name === "Наднова-Зірка", "next тизерить «Наднова-Зірка»");
}

console.log("celebrationFor — фінальна еволюція:");
{
  const p = pet(FINAL, "sunshine", "angelic");
  const msg = p.celebrationFor(5);
  ok(/Світлий Янгол/.test(msg), "святкування називає форму");
  ok(/ФІНАЛЬНА|фінальн/i.test(msg), "позначене як фінальна еволюція");
  ok(/характер|вдач/i.test(msg), "згадує вдачу/характер як причину");
  ok(msg.includes(p.temperamentLabel()), "показує мітку вдачі");
}

console.log(failed === 0 ? "\nALL PASS ✅" : `\n${failed} FAIL ❌`);
process.exit(failed === 0 ? 0 : 1);
