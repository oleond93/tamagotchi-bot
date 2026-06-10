// Тести памʼяті аватара (чисті функції). Запуск: `node test/memory.test.mjs`.
// Без фреймворку — простий асерт + ненульовий код виходу при провалі.

import {
  Pet,
  now,
  MEMORY_MAX,
  MEMORY_ENTRY_MAX,
  DIALOG_MAX,
  DIALOG_ENTRY_MAX,
} from "../src/pet.js";
import { parseReply, parseEmotionTag } from "../src/brain.js";

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
// Не-яйце потрібної стадії (підліток ~8 дн — памʼять активна).
function petAt(days, extra = {}) {
  return new Pet({ born_at: now() - days * DAY, persona: { sunshine: 10 }, ...extra });
}

console.log("parseReply — тег памʼяті:");
{
  const r = parseReply("Привіт!\n[[mem:у власника кіт]]");
  ok(r.memory === "у власника кіт", "читає факт памʼяті");
  ok(r.text === "Привіт!", "вирізає mem-тег, лишає текст");

  const both = parseReply("Окей\n[[mem:любить каву]]\n[[emo:joy:5]]");
  ok(both.memory === "любить каву", "mem поряд з emo: читає факт");
  ok(both.emotion === "joy" && both.intensity === 5, "mem поряд з emo: читає емоцію");
  ok(!/mem:|emo:/i.test(both.text) && both.text === "Окей", "вирізає ОБИДВА теги");

  const noMem = parseReply("просто текст [[emo:joy:2]]");
  ok(noMem.memory === null, "немає mem → null");

  const last = parseReply("[[mem:факт А]] середина [[mem:факт Б]]");
  ok(last.memory === "факт Б", "бере ОСТАННІЙ mem-тег");
  ok(!/mem:/i.test(last.text), "вирізає всі mem-теги");

  const trim = parseReply("йо [[mem:  має пса  ]]");
  ok(trim.memory === "має пса", "обрізає пробіли у факті");

  const sp = parseReply("гей [[ MEM | теза ]]");
  ok(sp.memory === "теза", "стійкий до пробілів/регістру/роздільника");

  const empty = parseReply("");
  ok(empty.memory === null && empty.emotion === "neutral" && empty.text === "", "порожній вхід безпечний");
}

console.log("parseEmotionTag — зворотна сумісність:");
{
  const r = parseEmotionTag("текст [[mem:щось]] [[emo:joy:3]]");
  ok(r.emotion === "joy" && r.intensity === 3, "емоція ще читається");
  ok(!/mem:|emo:/i.test(r.text) && r.text === "текст", "вирізає й протеклий mem-тег");
}

console.log("addMemory — додавання, дедуп, кап:");
{
  const p = petAt(8);
  ok(p.addMemory("любить каву") === true, "додає новий факт");
  ok(p.memories.length === 1 && p.memories[0].t === "любить каву", "факт збережено");

  ok(p.addMemory("любить каву") === false, "точний дубль не додається");
  ok(p.memories.length === 1, "довжина без змін після дубля");

  const q = petAt(8);
  q.addMemory("кіт");
  q.addMemory("у власника є кіт Мурчик");
  ok(q.memories.length === 1, "підрядок → підкріплення, без дубля");
  ok(q.memories[0].t.includes("Мурчик"), "лишається інформативніший (довший) варіант");

  const big = petAt(8);
  big.addMemory("x".repeat(300));
  ok(big.memories[0].t.length <= MEMORY_ENTRY_MAX, "довгий факт обрізано");
}

console.log("addMemory — витіснення найстарішого понад кап:");
{
  const p = petAt(8);
  for (let i = 0; i < MEMORY_MAX; i++) p.addMemory(`подія ${i} завершена`);
  ok(p.memories.length === MEMORY_MAX, "набралось рівно MEMORY_MAX");
  const oldest = p.memories.find((m) => m.t === "подія 0 завершена");
  oldest.at = 1; // явно найстаріший
  p.addMemory("зовсім новий спогад");
  ok(p.memories.length === MEMORY_MAX, "кап тримається");
  ok(!p.memories.some((m) => m.t === "подія 0 завершена"), "витіснено найстаріший");
  ok(p.memories.some((m) => m.t === "зовсім новий спогад"), "новий факт додано");
}

console.log("addMemory — no-op кейси:");
{
  const egg = new Pet({ born_at: now() });
  ok(egg.addMemory("щось") === false, "яйце: факт не запамʼятовується");
  ok((egg.memories || []).length === 0, "яйце: памʼять порожня");

  const dead = petAt(8, { alive: false });
  ok(dead.addMemory("щось") === false, "мертвий: факт не запамʼятовується");

  const p = petAt(8);
  ok(p.addMemory("   ") === false, "порожній/пробільний факт ігнорується");
}

console.log("rememberDialog / dialogMessages:");
{
  const p = petAt(8);
  p.rememberDialog("u", "привіт");
  p.rememberDialog("a", "о, привіт!");
  const m = p.dialogMessages();
  ok(m.length === 2, "дві репліки у вікні");
  ok(m[0].role === "user" && m[0].content === "привіт", "репліка користувача → user");
  ok(m[1].role === "assistant" && m[1].content === "о, привіт!", "репліка аватара → assistant");

  const w = petAt(8);
  for (let i = 0; i < DIALOG_MAX + 5; i++) w.rememberDialog(i % 2 === 0 ? "u" : "a", `репліка ${i}`);
  ok(w.dialog.length === DIALOG_MAX, "вікно діалогу обрізане до DIALOG_MAX");
  ok(w.dialog[w.dialog.length - 1].t === `репліка ${DIALOG_MAX + 4}`, "лишаються найсвіжіші");

  const long = petAt(8);
  long.rememberDialog("u", "y".repeat(400));
  ok(long.dialog[0].t.length <= DIALOG_ENTRY_MAX, "репліку обрізано");

  const egg = new Pet({ born_at: now() });
  egg.rememberDialog("u", "привіт");
  ok((egg.dialog || []).length === 0 && egg.dialogMessages().length === 0, "яйце: діалог не ведеться");
}

console.log("recentMemories — найсвіжіші перші, обмежено:");
{
  const p = petAt(8);
  p.addMemory("перший");
  p.addMemory("другий");
  p.addMemory("третій");
  p.memories.find((m) => m.t === "перший").at = 100;
  p.memories.find((m) => m.t === "другий").at = 200;
  p.memories.find((m) => m.t === "третій").at = 300;
  const r = p.recentMemories(2);
  ok(r.length === 2 && r[0].t === "третій" && r[1].t === "другий", "повертає 2 найсвіжіші");
}

console.log("memoryPrompt:");
{
  const p = petAt(8);
  ok(p.memoryPrompt() === "", "немає фактів → порожньо");
  p.addMemory("власник любить каву");
  const mp = p.memoryPrompt();
  ok(mp.includes("власник любить каву"), "факт присутній у промпті");
  ok(mp.includes("ПАМ"), "є заголовок-памʼять");
  const egg = new Pet({ born_at: now() });
  ok(egg.memoryPrompt() === "", "яйце: порожньо");
}

console.log("memoryCard:");
{
  const empty = petAt(8);
  ok(empty.memoryCard().includes("нічого особливого"), "порожній стан");

  const p = petAt(8);
  p.addMemory("має пса Рекса");
  ok(p.memoryCard().includes("має пса Рекса"), "факт у картці");

  const egg = new Pet({ born_at: now() });
  ok(egg.memoryCard().includes("яйце"), "яйце: спецтекст");

  const h = petAt(8);
  h.addMemory("любить <b> і &");
  const card = h.memoryCard();
  ok(card.includes("любить &lt;b&gt; і &amp;"), "екранує HTML у тексті факту");
  ok(!card.includes("любить <b>"), "сирий тег факту не протікає");
}

console.log("toJSON — round-trip dialog + memories:");
{
  const p = petAt(8);
  p.addMemory("факт для збереження");
  p.rememberDialog("u", "репліка користувача");
  p.rememberDialog("a", "відповідь аватара");
  const p2 = new Pet(p.toJSON());
  ok(p2.memories.length === 1 && p2.memories[0].t === "факт для збереження", "memories серіалізуються");
  ok(p2.dialog.length === 2, "dialog серіалізується");
  const m = p2.dialogMessages();
  ok(m[0].role === "user" && m[1].role === "assistant", "ролі діалогу збережено");
}

console.log(failed === 0 ? "\nALL PASS ✅" : `\n${failed} FAIL ❌`);
process.exit(failed === 0 ? 0 : 1);
