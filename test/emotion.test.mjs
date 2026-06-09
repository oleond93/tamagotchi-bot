// Тести емоційних реакцій (чисті функції). Запуск: `node test/emotion.test.mjs`.
// Без фреймворку — простий асерт + ненульовий код виходу при провалі.

import { Pet, EMOTIONS, now } from "../src/pet.js";
import { parseEmotionTag } from "../src/brain.js";

let failed = 0;
function ok(cond, msg) {
  if (cond) {
    console.log("  ✓ " + msg);
  } else {
    failed++;
    console.log("  ✗ FAIL: " + msg);
  }
}
function near(a, b, eps, msg) {
  ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ~${b})`);
}

const DAY = 86400;
// Пет потрібної стадії: born_at у минулому. index2 (~4дн): є mood, нема sanity;
// index3 (~8дн): є і mood, і sanity.
function petAt(days, extra = {}) {
  return new Pet({ born_at: now() - days * DAY, persona: { sunshine: 10 }, ...extra });
}

console.log("parseEmotionTag:");
{
  const r = parseEmotionTag("Привіт!\n[[emo:anger:7]]");
  ok(r.text === "Привіт!", "вирізає тег, лишає текст");
  ok(r.emotion === "anger" && r.intensity === 7, "читає емоцію й силу");

  const sp = parseEmotionTag("Йо [[ EMO : Anger : 3 ]]");
  ok(sp.emotion === "anger" && sp.intensity === 3, "стійкий до пробілів/регістру");

  const unk = parseEmotionTag("текст [[emo:confused:5]]");
  ok(unk.emotion === "neutral", "невідома емоція → neutral");

  const none = parseEmotionTag("просто балачка без тега");
  ok(none.emotion === "neutral" && none.intensity === 0 && none.text === "просто балачка без тега",
    "немає тега → neutral, текст недоторканий");

  const multi = parseEmotionTag("[[emo:joy:2]] середина [[emo:anger:9]]");
  ok(multi.emotion === "anger" && multi.intensity === 9, "бере ОСТАННІЙ тег");
  ok(!/emo:/i.test(multi.text), "вирізає ВСІ теги");

  const clamp = parseEmotionTag("ого [[emo:joy:99]]");
  ok(clamp.intensity === 10, "clamp сили до 10");

  const only = parseEmotionTag("[[emo:joy:5]]");
  ok(only.text === "" && only.emotion === "joy", "лише тег → порожній текст + емоція");

  ok(parseEmotionTag("").emotion === "neutral", "порожній вхід безпечний");
}

console.log("applyEmotion — модуляція вдачею + кеп:");
{
  const wild = petAt(8, { temperament: "wild", mood: 50, sanity: 50 });
  const angel = petAt(8, { temperament: "angelic", mood: 50, sanity: 50 });
  wild.applyEmotion("anger", 10);
  angel.applyEmotion("anger", 10);
  const wildDrop = 50 - wild.mood;
  const angelDrop = 50 - angel.mood;
  ok(wildDrop > angelDrop, `дике реагує сильніше за янгола (${wildDrop} > ${angelDrop})`);
  near(wildDrop, 8, 0.01, "дике: дельта capнута на 8 (−6×1.4=−8.4 → −8)");
  near(angelDrop, 3.6, 0.01, "янгол: −6×0.6 = −3.6");
  ok(wild.emotion === "anger" && wild.emotion_intensity > 0, "емоція записана");
}

console.log("applyEmotion — дельти лише на активні показники:");
{
  const p = petAt(4, { temperament: "balanced", mood: 50, sanity: 50 }); // index2: нема sanity
  p.applyEmotion("anger", 10); // anger чіпає mood + sanity
  ok(p.mood < 50, "mood (активний) змінився");
  ok(p.sanity === 50, "sanity (неактивний на стадії) не змінився");
}

console.log("applyEmotion — no-op кейси:");
{
  const egg = new Pet({ born_at: now(), mood: 50 }); // яйце
  egg.mood = 50;
  egg.applyEmotion("anger", 10);
  ok(egg.emotion === null, "яйце: емоція не вмикається");

  const dead = petAt(8, { temperament: "wild", mood: 50, alive: false });
  dead.applyEmotion("anger", 10);
  ok(dead.emotion === null && dead.mood === 50, "мертвий: емоція не застосовується");
  dead.emotion = "anger";
  dead.emotion_intensity = 8;
  ok(dead.emotionPrompt() === "", "мертвий: emotionPrompt мовчить");

  const p = petAt(4, { temperament: "balanced", mood: 50 });
  p.applyEmotion("neutral", 8);
  ok(p.emotion === null && p.mood === 50, "neutral = no-op");
  p.applyEmotion("joy", 0);
  ok(p.emotion === null, "нульова інтенсивність = no-op");
  p.applyEmotion("bogus", 5);
  ok(p.emotion === null, "невідома емоція = no-op");
}

console.log("applyEmotion — дрейф характеру (формувальний період):");
{
  const p = petAt(4, { temperament: "balanced", persona: { sunshine: 10 } }); // index2, не locked
  p.applyEmotion("anger", 5);
  ok((p.persona.rebel || 0) >= 1 && (p.persona.gremlin || 0) >= 1, "anger штовхає rebel+gremlin");

  const locked = petAt(4, { temperament: "balanced", persona: { sunshine: 10 }, persona_locked: true });
  locked.applyEmotion("anger", 5);
  ok(!locked.persona.rebel, "застиглий характер не дрейфує");
}

console.log("applyEmotionDecay — згасання:");
{
  const HALF = 0.42; // дзеркалить EMOTION_HALFLIFE_H у pet.js
  const p = petAt(8, { temperament: "balanced" });
  p.emotion = "anger";
  p.emotion_intensity = 8;
  p.emotion_at = now() - HALF * 3600; // один період напіврозпаду тому
  p.applyEmotionDecay();
  near(p.emotion_intensity, 4, 0.3, "за один напіврозпад інтенсивність ~вдвічі менша");
  ok(p.emotion === "anger", "емоція ще тримається");

  const q = petAt(8, { temperament: "balanced" });
  q.emotion = "hurt";
  q.emotion_intensity = 1.2;
  q.emotion_at = now() - 3 * HALF * 3600; // давно
  q.applyEmotionDecay();
  ok(q.emotion === null && q.emotion_intensity === 0, "нижче порогу → згасає до спокою");
}

console.log(failed === 0 ? "\nALL PASS ✅" : `\n${failed} FAIL ❌`);
process.exit(failed === 0 ? 0 : 1);
