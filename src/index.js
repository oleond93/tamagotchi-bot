// index.js — Cloudflare Worker: webhook Телеграму (fetch) + нагадування (scheduled/cron).
//
// Один воркер обслуговує ВСІХ юзерів. Кожен чат отримує власного тамагочі (стан у D1).
// Юзери нічого не встановлюють — просто пишуть боту.

import * as brain from "./brain.js";
import * as db from "./db.js";
import { PERSONALITIES } from "./personalities.js";
import { Pet, now, dayPart, ACTIONS, STAT_META, setTzOffset } from "./pet.js";
import { checkNew, achievementsCard } from "./achievements.js";
import { randomEvent, findEvent } from "./events.js";
import { EGG_LISTEN, EGG_WIGGLE, EGG_TEASERS, randomLine } from "./egg.js";
import { GUIDE_PAGES } from "./guide.js";

// Безпечно читає зсув часового поясу з env. Відсутнє, порожнє чи нечислове
// значення → дефолт +3 (Київ). Без цього нечисловий рядок давав би NaN, що
// ламало б і визначення пори доби (нічну паузу), і денний стрік.
function tzOffset(env) {
  const raw = env.TZ_OFFSET_HOURS;
  if (raw == null || String(raw).trim() === "") return 3;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 3;
}

// Пора доби з урахуванням TZ (типово Київ, +3). Кожен deployer може змінити
// змінною TZ_OFFSET_HOURS у дашборді.
function dpart(env) {
  return dayPart(tzOffset(env));
}

// Кулдаун між подіями (год). Після події кнопка «Подія» тимчасово «відпочиває».
const EVENT_COOLDOWN_H = 2;

// Оновлює денний стрік і ловить «повернення» після тривалої відсутності.
// Викликати на кожну активність користувача (не з cron!).
function registerActivity(pet, env) {
  const tz = tzOffset(env);
  const today = Math.floor((Date.now() / 1000 + tz * 3600) / 86400);
  if (!pet.last_active_day) {
    pet.streak = 1;
  } else if (today === pet.last_active_day) {
    // та сама доба — нічого не міняємо
  } else if (today === pet.last_active_day + 1) {
    pet.streak = (pet.streak || 0) + 1;
  } else {
    if (today - pet.last_active_day >= 3) pet.flags.prodigal = true;
    pet.streak = 1;
  }
  pet.last_active_day = today;
  pet.best_streak = Math.max(pet.best_streak || 0, pet.streak || 0);
}

// Сповіщає про перехід на нову стадію (включно з вилупленням). Безпечно
// викликати скрізь — святкує лише те, про що ще не сповіщали.
async function celebrateEvolutions(env, chatId, pet) {
  const idx = pet.evolutionInfo().index;
  let celebrated = false;
  while (pet.seen_stage < idx) {
    pet.seen_stage += 1;
    await send(env, chatId, pet.celebrationFor(pet.seen_stage));
    celebrated = true;
  }
  if (celebrated) await db.save(env, chatId, pet);
  return celebrated;
}

// Позначає нові досягнення (мутує pet) і повертає короткий текст-нотатку, або "".
// Викликач сам зберігає pet і вирішує, де показати: у модалці чи дописати до повідомлення.
function achievementNote(pet, ctx) {
  const fresh = checkNew(pet, ctx);
  if (!fresh.length) return "";
  if (fresh.length === 1) {
    return `🏆 Нове досягнення: ${fresh[0].emoji} ${fresh[0].title}!`;
  }
  return "🏆 Нові досягнення:\n" + fresh.map((a) => `${a.emoji} ${a.title}`).join("\n");
}

// Створює таблицю, якщо її ще немає (щоб творцю не запускати міграції вручну).
async function ensureSchema(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS pets (chat_id INTEGER PRIMARY KEY, data TEXT NOT NULL)"
  ).run();
}

// --- Telegram API helpers ----------------------------------------------------
async function tg(env, method, payload) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return resp.json();
}

function send(env, chatId, text, replyMarkup) {
  return tg(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

function editCard(env, chatId, messageId, text, replyMarkup) {
  return tg(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

function answerCb(env, callbackId, text, showAlert = false) {
  return tg(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    text: text || "",
    show_alert: showAlert,
  });
}

// --- Inline-клавіатури -------------------------------------------------------
function mainKeyboard(pet) {
  if (!pet.alive) {
    return { inline_keyboard: [[{ text: "⚡ Воскресити", callback_data: "revive" }]] };
  }
  // Кнопки-дії генеруються під поточну стадію (по 2 у рядок).
  // У яйця — додаткові дрібні взаємодії для залученості.
  const actionButtons = pet.isEgg()
    ? [
        { text: "🔥 Гріти", callback_data: "warm" },
        { text: "👂 Послухати", callback_data: "listen" },
        { text: "🤲 Поколихати", callback_data: "wiggle" },
      ]
    : pet.stageActions().map((a) => ({
        text: ACTIONS[a].label,
        callback_data: a,
      }));
  const rows = [];
  for (let i = 0; i < actionButtons.length; i += 2) {
    rows.push(actionButtons.slice(i, i + 2));
  }
  rows.push([
    { text: "🎲 Подія", callback_data: "evt" },
    { text: "🌱 Ріст", callback_data: "grow" },
  ]);
  const infoRow = [
    { text: "🏆 Досягнення", callback_data: "ach" },
    { text: "📖 Гайд", callback_data: "guide" },
  ];
  if (!pet.isEgg()) infoRow.push({ text: "🧠 Памʼять", callback_data: "mem" });
  rows.push(infoRow);
  rows.push([{ text: "🔄 Оновити", callback_data: "status" }]);
  return { inline_keyboard: rows };
}

function guideKeyboard(page) {
  const last = GUIDE_PAGES.length - 1;
  const nav = [];
  if (page > 0) nav.push({ text: "◀ Назад", callback_data: `guide:${page - 1}` });
  if (page < last) nav.push({ text: "Далі ▶", callback_data: `guide:${page + 1}` });
  const rows = [];
  if (nav.length) rows.push(nav);
  rows.push([{ text: "✖️ Закрити", callback_data: "status" }]);
  return { inline_keyboard: rows };
}

function guideText(page) {
  const g = GUIDE_PAGES[page];
  return `${g.title}  <i>(${page + 1}/${GUIDE_PAGES.length})</i>\n\n${g.body}`;
}

function backKeyboard() {
  return { inline_keyboard: [[{ text: "⬅️ Назад", callback_data: "status" }]] };
}

// Постійна клавіатура біля поля вводу — щоб картку (з inline-кнопками догляду)
// можна було повернути одним тапом будь-коли, навіть коли вона поїхала вгору
// під час листування. Кнопки шлють звичайний текст, який ми мапимо на команди.
function petMenu() {
  return {
    keyboard: [[{ text: "📊 Картка" }, { text: "📖 Гайд" }]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

// Постійну клавіатуру Telegram показує лише разом із повідомленням, що її несе.
// Картка/inline-кнопки несуть власну (inline) клавіатуру, тож тут одноразово
// надсилаємо окреме повідомлення з reply-клавіатурою — щоб вона з'явилась навіть
// тим, хто лише тисне кнопки й ніколи не пише в чат.
async function ensureMenu(env, chatId, pet) {
  if (!pet || pet.menu_set) return;
  await send(
    env,
    chatId,
    "⌨️ Готово! Кнопки <b>«📊 Картка»</b> і <b>«📖 Гайд»</b> тепер завжди біля поля вводу 👇",
    petMenu()
  );
  pet.menu_set = true;
  await db.save(env, chatId, pet);
}

function eventKeyboard(ev) {
  return {
    inline_keyboard: ev.options.map((o, i) => [
      { text: o.text, callback_data: `evc:${ev.id}:${i}` },
    ]),
  };
}

// --- Стан із застосуванням занепаду ------------------------------------------
async function getPet(env, chatId) {
  const pet = await db.load(env, chatId);
  if (pet) {
    pet.applyDecay();
    pet.last_seen = now();
    registerActivity(pet, env);
    await db.save(env, chatId, pet);
    await celebrateEvolutions(env, chatId, pet);
    await ensureMenu(env, chatId, pet);
  }
  return pet;
}

// --- Тексти ------------------------------------------------------------------
const HELP =
  "🐣 <b>Я твій тамагочі.</b> Доглядай за мною, бо мені стає сумно з часом.\n\n" +
  "🧬 Мої потреби й дії <b>змінюються з ростом</b>: яйце треба лише гріти 🔥, " +
  "а дорослий уже хоче їсти, гратися, спілкуватися тощо.\n\n" +
  "📊 /status — моя картка з кнопками догляду\n" +
  "📖 /guide — лор і як усе працює (раджу почати з нього!)\n" +
  "🌱 кнопка «Ріст» — що відкриється далі\n" +
  "🏆 кнопка «Досягнення» · 🎲 «Подія»\n" +
  "🎭 /personality — мій характер (призначається випадково при вилупленні)\n" +
  "🧠 /memory — що я про тебе запам'ятав (я слухаю, коли ти пишеш!)\n" +
  "✏️ /name &lt;ім'я&gt; · 💀 /revive\n\n" +
  "💡 Найзручніше — кнопками під карткою (/status). Якщо вона поїхала вгору під час балачки — " +
  "поверни її кнопкою <b>«📊 Картка»</b> біля поля вводу (вона завжди там).\n" +
  "А ще просто пиши мені, я люблю балакати 💬";

// --- Обробка одного оновлення від Телеграму ----------------------------------
async function handleUpdate(env, update) {
  const msg = update.message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  let text = msg.text.trim();
  // Кнопки постійної клавіатури приходять як звичайний текст — переводимо в команди.
  if (text === "📊 Картка") text = "/status";
  else if (text === "📖 Гайд") text = "/guide";
  const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  const arg = text.slice(cmd.length).trim();

  // /start — народження + онбординг
  if (cmd === "/start") {
    let pet = await db.load(env, chatId);
    if (!pet) {
      pet = new Pet({ awaiting_name: true });
      await db.save(env, chatId, pet);
      await send(
        env,
        chatId,
        "🥚 <b>Щось ворушиться...</b>\n\n" +
          "Тобі дісталось таємниче яйце. Усередині хтось є — тихенько пульсує теплом і чогось чекає.\n\n" +
          "Гарно грій його 🔥 — і колись воно вилупиться. А <b>яким</b> воно стане, залежить від твого догляду 😉\n\n" +
          "<b>Як ти його назвеш?</b> (просто напиши ім'я)"
      );
    } else {
      pet.applyDecay();
      pet.last_seen = now();
      registerActivity(pet, env);
      await db.save(env, chatId, pet);
      await celebrateEvolutions(env, chatId, pet);
      await ensureMenu(env, chatId, pet);
      await send(env, chatId, pet.statusCard({ dayPart: dpart(env) }), mainKeyboard(pet));
    }
    return;
  }

  if (cmd === "/help") return void (await send(env, chatId, HELP, petMenu()));

  if (cmd === "/guide") {
    return void (await send(env, chatId, guideText(0), guideKeyboard(0)));
  }

  if (cmd === "/status") {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    const dp = dpart(env);
    const note = achievementNote(pet, { dayPart: dp });
    await db.save(env, chatId, pet);
    const card = pet.statusCard({ dayPart: dp }) + (note ? `\n\n${note}` : "");
    await send(env, chatId, card, mainKeyboard(pet));
    return;
  }

  if (cmd === "/name") {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    if (!arg)
      return void (await send(env, chatId, "Напиши так: <code>/name Барсік</code>"));
    pet.name = arg.slice(0, 30);
    await db.save(env, chatId, pet);
    return void (await send(env, chatId, `Тепер я <b>${pet.name}</b> 😼`));
  }

  if (cmd === "/personality") {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    if (!pet.personalityLabel()) {
      return void (await send(
        env,
        chatId,
        "🎭 Характер з'явиться, коли яйце вилупиться — спершу <b>випадковий</b> 😉"
      ));
    }
    const status = pet.persona_locked
      ? "Він уже <b>остаточно сформувався</b> й не зміниться."
      : "Зараз він <b>формується</b> 🌀 — твій догляд ще може його змінити (аж до стадії 😈).";
    return void (await send(
      env,
      chatId,
      `🎭 Мій характер: <b>${pet.personalityLabel()}</b>\n\n${status}`
    ));
  }

  if (cmd === "/memory") {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    return void (await send(env, chatId, pet.memoryCard(), mainKeyboard(pet)));
  }

  if (cmd === "/revive") {
    const pet = await db.load(env, chatId);
    if (!pet) return void (await send(env, chatId, "Нема кого воскрешати. /start 🥚"));
    pet.revive();
    await db.save(env, chatId, pet);
    return void (await send(env, chatId, "⚡ <b>ВОНО ЖИВЕ!</b> Дякую 🫠"));
  }

  // Дії догляду (слеш-команда = ключ дії без "/")
  const action = cmd.startsWith("/") && ACTIONS[cmd.slice(1)] ? cmd.slice(1) : null;
  if (action) {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    if (!pet.alive)
      return void (await send(env, chatId, "☠️ Я тимчасово мертвий. Спробуй /revive"));
    if (!pet.stageActions().includes(action)) {
      return void (await send(env, chatId, "🤔 Зараз ця дія мені ще недоступна — підрости 🌱"));
    }
    pet.doAction(action);
    const dp = dpart(env);
    const note = achievementNote(pet, { dayPart: dp });
    await db.save(env, chatId, pet);
    const body =
      `${ACTIONS[action].toast}\n\n${pet.statusCard({ dayPart: dp })}` +
      (note ? `\n\n${note}` : "");
    await send(env, chatId, body, mainKeyboard(pet));
    return;
  }

  // --- Вільний текст ---------------------------------------------------------
  let pet = await db.load(env, chatId);

  // Очікуємо ім'я після /start?
  if (pet && pet.awaiting_name) {
    pet.awaiting_name = false;
    pet.name = text.slice(0, 30);
    const dp = dpart(env);
    const note = achievementNote(pet, { dayPart: dp });
    await db.save(env, chatId, pet);
    await send(
      env,
      chatId,
      `🎉 <b>${pet.name}</b> — ідеальне ім'я!\n\n` +
        "Яйце ніби почуло — і вдоволено пульснуло теплом 🥚💛 Тепер воно твоя відповідальність. Грій його кнопкою «🔥 Гріти», а як стане нудно — пиши мені 💬\n\n" +
        "📖 <b>Новачок?</b> Тисни «Гайд» — там усе про те, що тут відбувається.\n\n" +
        "💡 Кнопки <b>«📊 Картка» та «📖 Гайд»</b> біля поля вводу — завжди під рукою." +
        (note ? `\n\n${note}` : ""),
      petMenu()
    );
    pet.menu_set = true; // клавіатуру вже надіслали
    await db.save(env, chatId, pet);
    await send(env, chatId, pet.statusCard({ dayPart: dp }), mainKeyboard(pet));
    return;
  }

  if (!pet) return void (await send(env, chatId, "Привіт! Я ще не народився. Напиши /start 🥚"));

  const dp = dpart(env);
  pet.applyDecay();
  pet.last_seen = now();
  pet.interactions += 1;
  pet.chat_count += 1;
  pet.nudgePersona({ drama: 1 }); // балакучість ліпить «драму»
  registerActivity(pet, env);
  await db.save(env, chatId, pet);
  await celebrateEvolutions(env, chatId, pet);
  await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" });
  const { text: answer, emotion, intensity, memory } = await brain.reply(env, pet, text, dp);
  pet.applyEmotion(emotion, intensity); // повідомлення емоційно «влучає» в аватара
  if (memory) pet.addMemory(memory); // новий факт про власника → довгострокова памʼять
  pet.rememberDialog("u", text); //     репліки у вікно діалогу — контекст наступних відповідей
  pet.rememberDialog("a", answer);
  const note = achievementNote(pet, { dayPart: dp });
  // Постійна клавіатура — щоб картку було легко повернути після листування.
  await send(env, chatId, answer + (note ? `\n\n${note}` : ""), petMenu());
  pet.menu_set = true; // клавіатуру вже надіслали — ensureMenu більше не потрібен
  await db.save(env, chatId, pet);
}

// --- Обробка натискань inline-кнопок -----------------------------------------
async function handleCallback(env, cq) {
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const data = cq.data || "";
  if (!chatId) return;

  let pet = await db.load(env, chatId);
  if (!pet) {
    await answerCb(env, cq.id, "Напиши /start 🥚");
    return;
  }
  const dp = dpart(env);
  const ctx = { dayPart: dp };
  pet.applyDecay();
  pet.last_seen = now();
  registerActivity(pet, env);
  await celebrateEvolutions(env, chatId, pet);
  await ensureMenu(env, chatId, pet);

  // Гайд / лор (гортається сторінками).
  if (data === "guide" || data.startsWith("guide:")) {
    const page = data.includes(":")
      ? Math.max(0, Math.min(GUIDE_PAGES.length - 1, Number(data.split(":")[1]) || 0))
      : 0;
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "");
    await editCard(env, chatId, messageId, guideText(page), guideKeyboard(page));
    return;
  }

  // Памʼять про власника.
  if (data === "mem") {
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "");
    await editCard(env, chatId, messageId, pet.memoryCard(), backKeyboard());
    return;
  }

  // Мапа розвитку.
  if (data === "grow") {
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "");
    await editCard(env, chatId, messageId, pet.growthCard(), backKeyboard());
    return;
  }

  // Досягнення.
  if (data === "ach") {
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "");
    await editCard(env, chatId, messageId, achievementsCard(pet), backKeyboard());
    return;
  }

  // Егг-взаємодії: послухати / поколихати — варіативні смішні реакції.
  if (data === "listen" || data === "wiggle") {
    const line = data === "listen" ? randomLine(EGG_LISTEN) : randomLine(EGG_WIGGLE);
    if (data === "wiggle") pet.warmth = Math.min(100, pet.warmth + 3); // дрібний відгук
    pet.interactions += 1;
    await db.save(env, chatId, pet);
    // Реакція — у модалці (помітно), картка позаду тихо оновлюється.
    await answerCb(env, cq.id, line, true);
    try {
      await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
    } catch (e) {
      /* "message is not modified" — ігноруємо */
    }
    return;
  }

  // Випадкова міні-подія (з кулдауном і прив'язкою до стадії).
  if (data === "evt") {
    const since = now() - (pet.last_event || 0);
    const cd = EVENT_COOLDOWN_H * 3600;
    if (since < cd) {
      await answerCb(
        env,
        cq.id,
        "🎲 Зараз нічого цікавого не сталося... Можливо, пригода чекає трохи згодом 👀",
        true
      );
      return;
    }
    pet.last_event = now();
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "🎲");
    const ev = randomEvent(pet.evolutionInfo().index);
    await editCard(env, chatId, messageId, `🎲 <b>Подія!</b>\n\n${ev.text}`, eventKeyboard(ev));
    return;
  }
  // Вибір у міні-події: evc:<id>:<index>
  if (data.startsWith("evc:")) {
    const [, evId, idxStr] = data.split(":");
    const ev = findEvent(evId);
    const opt = ev?.options[Number(idxStr)];
    let alertText = "...";
    if (opt) {
      // Знімок до — щоб показати РЕАЛЬНУ зміну (з урахуванням меж 0..100).
      const before = {};
      for (const s of Object.keys(opt.effects)) before[s] = pet[s];
      pet.applyEffects(opt.effects);
      pet.counts.event = (pet.counts.event || 0) + 1;
      // Прапорці для смішних досягнень.
      if (evId === "e4_cult" && Number(idxStr) === 0) pet.flags.cult = true;
      if (evId === "e3_crush" && Number(idxStr) === 1) pet.flags.heartbreak = true;
      pet.nudgePersona({ gremlin: 1 }); // пригоди ліплять «ґремліна»

      const parts = [];
      for (const s of Object.keys(opt.effects)) {
        const d = Math.round(pet[s] - before[s]);
        if (d !== 0) {
          const [label, em] = STAT_META[s];
          parts.push(`${em} ${label} ${d > 0 ? "+" : ""}${d}`);
        }
      }
      const effLine = parts.length ? `\n\n📊 ${parts.join(" · ")}` : "";
      alertText = `${opt.result}${effLine}`;
    }
    const note = achievementNote(pet, ctx); // нове досягнення — у ту ж модалку
    if (note) alertText += `\n\n${note}`;
    await db.save(env, chatId, pet);
    // Результат, ефект і досягнення — у модальному вікні (помітно й однозначно).
    await answerCb(env, cq.id, alertText, true);
    // Картка позаду тихо оновлюється до нового стану.
    await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
    return;
  }

  if (data === "revive") {
    pet.revive();
    const note = achievementNote(pet, ctx);
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, note ? `⚡ Воскрес!\n\n${note}` : "⚡ Воскрес!", true);
    await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
    return;
  }

  let toast = "";
  if (ACTIONS[data]) {
    if (!pet.alive) {
      await answerCb(env, cq.id, "Я мертвий 💀 спершу воскреси");
    } else if (!pet.stageActions().includes(data)) {
      await answerCb(env, cq.id, "Ще не доступно 🌱");
    } else {
      pet.doAction(data);
      toast = ACTIONS[data].toast || "";
    }
  }
  // data === "status" — просто оновлюємо картку.

  // Реакцію на дію (тост) і нове досягнення показуємо в модалці.
  const note = achievementNote(pet, ctx);
  await db.save(env, chatId, pet);
  const alertText = note ? (toast ? `${toast}\n\n${note}` : note) : toast;
  await answerCb(env, cq.id, alertText, alertText.length > 0);
  // Telegram кидає помилку, якщо текст не змінився — глушимо її.
  try {
    await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
  } catch (e) {
    /* "message is not modified" — ігноруємо */
  }
}

// --- Налаштування вебхука (зайти один раз у браузері) ------------------------
async function setupWebhook(env, origin) {
  const hookUrl = `${origin}/tg/${env.TELEGRAM_TOKEN}`;
  const res = await tg(env, "setWebhook", {
    url: hookUrl,
    allowed_updates: ["message", "callback_query"],
  });
  return res;
}

// --- Точки входу воркера ------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    setTzOffset(tzOffset(env));
    if (env.DB) await ensureSchema(env);

    // Обробка оновлення від Телеграму (шлях містить токен — це й є секрет).
    if (request.method === "POST" && url.pathname === `/tg/${env.TELEGRAM_TOKEN}`) {
      try {
        const update = await request.json();
        if (update.callback_query) {
          ctx.waitUntil(handleCallback(env, update.callback_query));
        } else {
          ctx.waitUntil(handleUpdate(env, update));
        }
      } catch (e) {
        // мовчки ігноруємо некоректні запити
      }
      return new Response("ok");
    }

    // Діагностика AI-провайдера: відкрий /diag у браузері, щоб побачити причину.
    if (url.pathname === "/diag") {
      const info = await brain.diag(env);
      return new Response(JSON.stringify(info, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Одноразове налаштування вебхука.
    if (url.pathname === "/init") {
      if (!env.TELEGRAM_TOKEN) {
        return new Response("❌ Не задано секрет TELEGRAM_TOKEN.", { status: 400 });
      }
      const res = await setupWebhook(env, url.origin);
      return new Response(
        res.ok
          ? "✅ Вебхук налаштовано! Тепер напиши боту /start у Телеграмі 🐣"
          : "⚠️ Помилка: " + JSON.stringify(res),
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    return new Response(
      "🐣 Tamagotchi bot is alive. Відкрий /init щоб увімкнути бота.",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },

  // Cron: раз на годину — занепад + проактивні нагадування.
  async scheduled(event, env, ctx) {
    setTzOffset(tzOffset(env));
    ctx.waitUntil(tick(env));
  },
};

const NUDGE_COOLDOWN_H = 2;
const SILENT_HOURS_H = 4;
const NUDGE_CHANCE = 0.5;

async function tick(env) {
  await ensureSchema(env);
  const dp = dpart(env);
  // Уночі не турбуємо — люди сплять.
  if (dp.key === "night") return;
  const tz = tzOffset(env);
  const today = Math.floor((Date.now() / 1000 + tz * 3600) / 86400); // день-індекс (як у registerActivity)
  const pets = await db.allPets(env);
  for (const { chatId, pet } of pets) {
    pet.applyDecay();
    await db.save(env, chatId, pet);
    // Проактивно святкуємо вилуплення/еволюцію (часто стається, поки людини нема).
    await celebrateEvolutions(env, chatId, pet);
    if (!pet.alive) continue;
    if (now() - pet.last_nudge < NUDGE_COOLDOWN_H * 3600) continue;

    // Яйце — окремий простіший шлях: тизери без LLM, нагадує частіше.
    if (pet.isEgg()) {
      const needsAttention = pet.worstNeed() !== null;
      const longSilence = now() - pet.last_seen > 4 * 3600;
      if (!(needsAttention || longSilence)) continue;
      if (Math.random() > 0.85) continue;
      try {
        await send(env, chatId, randomLine(EGG_TEASERS));
        pet.last_nudge = now();
        await db.save(env, chatId, pet);
      } catch (e) {
        /* ignore */
      }
      continue;
    }

    // «Режисер» проактивності для тих, хто вже вилупився: обираємо ТИП виходу на звʼязок.
    // priority (morning/streak) — раз на день, без кидка кубика; flavor — лише коли є привід.
    const plan = pet.proactivePlan(dp, today);
    let kind = null;
    if (plan.priority.length) {
      kind = plan.priority[0];
    } else {
      const needsAttention = pet.worstNeed() !== null;
      const longSilence = now() - pet.last_seen > SILENT_HOURS_H * 3600;
      if (!(needsAttention || longSilence)) continue;
      if (Math.random() > NUDGE_CHANCE) continue;
      kind = plan.flavor[Math.floor(Math.random() * plan.flavor.length)];
    }

    try {
      const txt =
        kind === "streak" ? pet.streakRescueLine() : await brain.nudge(env, pet, dp, kind);
      if (txt) {
        await send(env, chatId, txt);
        pet.last_nudge = now();
        if (kind === "morning" || kind === "streak") {
          pet.rituals = pet.rituals || {};
          pet.rituals[kind] = today;
        }
        await db.save(env, chatId, pet);
      }
    } catch (e) {
      /* ignore individual send failures */
    }
  }
}
