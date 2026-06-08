// index.js — Cloudflare Worker: webhook Телеграму (fetch) + нагадування (scheduled/cron).
//
// Один воркер обслуговує ВСІХ юзерів. Кожен чат отримує власного тамагочі (стан у D1).
// Юзери нічого не встановлюють — просто пишуть боту.

import * as brain from "./brain.js";
import * as db from "./db.js";
import { PERSONALITIES } from "./personalities.js";
import { Pet, now, dayPart, ACTIONS } from "./pet.js";
import { checkNew, achievementsCard } from "./achievements.js";
import { randomEvent, findEvent } from "./events.js";
import { EGG_LISTEN, EGG_WIGGLE, EGG_TEASERS, randomLine } from "./egg.js";
import { GUIDE_PAGES } from "./guide.js";

// Пора доби з урахуванням TZ (типово Київ, +3). Кожен deployer може змінити
// змінною TZ_OFFSET_HOURS у дашборді.
function dpart(env) {
  return dayPart(Number(env.TZ_OFFSET_HOURS ?? 3));
}

// Кулдаун між подіями (год). Після події кнопка «Подія» тимчасово «відпочиває».
const EVENT_COOLDOWN_H = 2;

function humanDur(sec) {
  const m = Math.ceil(sec / 60);
  if (m < 60) return `${m} хв`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} год ${mm} хв` : `${h} год`;
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

// Перевіряє нові досягнення й надсилає привітання за кожне.
async function announceAchievements(env, chatId, pet, ctx) {
  const fresh = checkNew(pet, ctx);
  for (const a of fresh) {
    await send(env, chatId, `🏆 <b>Нове досягнення!</b>\n${a.emoji} <b>${a.title}</b>\n<i>${a.desc}</i>`);
  }
  return fresh.length > 0;
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
  rows.push([
    { text: "🏆 Досягнення", callback_data: "ach" },
    { text: "🎭 Характер", callback_data: "pers" },
  ]);
  rows.push([
    { text: "📖 Гайд", callback_data: "guide" },
    { text: "🔄 Оновити", callback_data: "status" },
  ]);
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

function personalityKeyboard() {
  const rows = Object.entries(PERSONALITIES).map(([k, v]) => [
    { text: v.label, callback_data: "pers:" + k },
  ]);
  rows.push([{ text: "⬅️ Назад", callback_data: "status" }]);
  return { inline_keyboard: rows };
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
    await db.save(env, chatId, pet);
    await celebrateEvolutions(env, chatId, pet);
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
  "✏️ /name &lt;ім'я&gt; · 🎭 /personality · 💀 /revive\n\n" +
  "💡 Найзручніше — кнопками під карткою (/status). " +
  "А ще просто пиши мені, я люблю балакати 💬";

// --- Обробка одного оновлення від Телеграму ----------------------------------
async function handleUpdate(env, update) {
  const msg = update.message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
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
          "З яйця щойно вилупилось маленьке хаотичне створіння. Воно дивиться на тебе.\n\n" +
          "<b>Як ти його назвеш?</b> (просто напиши ім'я)"
      );
    } else {
      pet.applyDecay();
      pet.last_seen = now();
      await db.save(env, chatId, pet);
      await celebrateEvolutions(env, chatId, pet);
      await send(env, chatId, pet.statusCard({ dayPart: dpart(env) }), mainKeyboard(pet));
    }
    return;
  }

  if (cmd === "/help") return void (await send(env, chatId, HELP));

  if (cmd === "/guide") {
    return void (await send(env, chatId, guideText(0), guideKeyboard(0)));
  }

  if (cmd === "/status") {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    const dp = dpart(env);
    await send(env, chatId, pet.statusCard({ dayPart: dp }), mainKeyboard(pet));
    await announceAchievements(env, chatId, pet, { dayPart: dp });
    await db.save(env, chatId, pet);
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
    const key = arg.toLowerCase();
    if (!PERSONALITIES[key]) {
      const opts = Object.entries(PERSONALITIES)
        .map(([k, v]) => `• <code>${k}</code> — ${v.label}`)
        .join("\n");
      return void (await send(
        env,
        chatId,
        `Обери характер:\n${opts}\n\nНапр.: <code>/personality philosopher</code>`
      ));
    }
    pet.personality = key;
    await db.save(env, chatId, pet);
    return void (await send(env, chatId, `Окей, мій характер: ${PERSONALITIES[key].label}`));
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
    await db.save(env, chatId, pet);
    await send(
      env,
      chatId,
      `${ACTIONS[action].toast}\n\n${pet.statusCard({ dayPart: dp })}`,
      mainKeyboard(pet)
    );
    await announceAchievements(env, chatId, pet, { dayPart: dp });
    await db.save(env, chatId, pet);
    return;
  }

  // --- Вільний текст ---------------------------------------------------------
  let pet = await db.load(env, chatId);

  // Очікуємо ім'я після /start?
  if (pet && pet.awaiting_name) {
    pet.awaiting_name = false;
    pet.name = text.slice(0, 30);
    const dp = dpart(env);
    await db.save(env, chatId, pet);
    await send(
      env,
      chatId,
      `🎉 <b>${pet.name}</b> — ідеальне ім'я!\n\n` +
        "Тепер я твоя відповідальність 😈 Користуйся кнопками нижче, або просто пиши мені 💬\n\n" +
        "📖 <b>Новачок?</b> Тисни «Гайд» під карткою — там усе про те, що тут відбувається."
    );
    await send(env, chatId, pet.statusCard({ dayPart: dp }), mainKeyboard(pet));
    await announceAchievements(env, chatId, pet, { dayPart: dp });
    await db.save(env, chatId, pet);
    return;
  }

  if (!pet) return void (await send(env, chatId, "Привіт! Я ще не народився. Напиши /start 🥚"));

  const dp = dpart(env);
  pet.applyDecay();
  pet.last_seen = now();
  await db.save(env, chatId, pet);
  await celebrateEvolutions(env, chatId, pet);
  await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" });
  const answer = await brain.reply(env, pet, text, dp);
  await send(env, chatId, answer);
  await announceAchievements(env, chatId, pet, { dayPart: dp });
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
  await celebrateEvolutions(env, chatId, pet);

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
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, data === "listen" ? "👂" : "🤲");
    await editCard(env, chatId, messageId, `${line}\n\n${pet.statusCard(ctx)}`, mainKeyboard(pet));
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
        `🎲 Наступна пригода буде за ${humanDur(cd - since)}. Дай трохи перепочити!`,
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
    if (opt) {
      pet.applyEffects(opt.effects);
      pet.counts.event = (pet.counts.event || 0) + 1;
    }
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "🎲");
    await editCard(
      env,
      chatId,
      messageId,
      `${opt ? opt.result : "..."}\n\n${pet.statusCard(ctx)}`,
      mainKeyboard(pet)
    );
    await announceAchievements(env, chatId, pet, ctx);
    await db.save(env, chatId, pet);
    return;
  }

  // Підменю вибору характеру.
  if (data === "pers") {
    await answerCb(env, cq.id, "");
    await db.save(env, chatId, pet);
    await editCard(env, chatId, messageId, "🎭 <b>Обери мій характер:</b>", personalityKeyboard());
    return;
  }
  if (data.startsWith("pers:")) {
    const key = data.slice(5);
    if (PERSONALITIES[key]) pet.personality = key;
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, PERSONALITIES[key] ? PERSONALITIES[key].label : "");
    await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
    return;
  }

  if (data === "revive") {
    pet.revive();
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "⚡ Воскрес!");
    await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
    await announceAchievements(env, chatId, pet, ctx);
    await db.save(env, chatId, pet);
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

  await db.save(env, chatId, pet);
  await answerCb(env, cq.id, toast);
  // Telegram кидає помилку, якщо текст не змінився — глушимо її.
  try {
    await editCard(env, chatId, messageId, pet.statusCard(ctx), mainKeyboard(pet));
  } catch (e) {
    /* "message is not modified" — ігноруємо */
  }
  await announceAchievements(env, chatId, pet, ctx);
  await db.save(env, chatId, pet);
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
    ctx.waitUntil(tick(env));
  },
};

const NUDGE_COOLDOWN_H = 6;
const SILENT_HOURS_H = 10;
const NUDGE_CHANCE = 0.5;

async function tick(env) {
  await ensureSchema(env);
  const dp = dpart(env);
  // Уночі не турбуємо — люди сплять.
  if (dp.key === "night") return;
  const pets = await db.allPets(env);
  for (const { chatId, pet } of pets) {
    pet.applyDecay();
    await db.save(env, chatId, pet);
    // Проактивно святкуємо вилуплення/еволюцію (часто стається, поки людини нема).
    await celebrateEvolutions(env, chatId, pet);
    if (!pet.alive) continue;
    if (now() - pet.last_nudge < NUDGE_COOLDOWN_H * 3600) continue;

    // Яйце нагадує про себе частіше — щоб людина повернулась за добу очікування.
    const silenceH = pet.isEgg() ? 4 : SILENT_HOURS_H;
    const chance = pet.isEgg() ? 0.85 : NUDGE_CHANCE;
    const needsAttention = pet.worstNeed() !== null;
    const longSilence = now() - pet.last_seen > silenceH * 3600;
    if (!(needsAttention || longSilence)) continue;
    if (Math.random() > chance) continue;

    try {
      const txt = pet.isEgg() ? randomLine(EGG_TEASERS) : await brain.nudge(env, pet, dp);
      await send(env, chatId, txt);
      pet.last_nudge = now();
      await db.save(env, chatId, pet);
    } catch (e) {
      /* ignore individual send failures */
    }
  }
}
