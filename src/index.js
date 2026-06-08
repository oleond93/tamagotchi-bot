// index.js — Cloudflare Worker: webhook Телеграму (fetch) + нагадування (scheduled/cron).
//
// Один воркер обслуговує ВСІХ юзерів. Кожен чат отримує власного тамагочі (стан у D1).
// Юзери нічого не встановлюють — просто пишуть боту.

import * as brain from "./brain.js";
import * as db from "./db.js";
import { PERSONALITIES } from "./personalities.js";
import { Pet, now } from "./pet.js";

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

function answerCb(env, callbackId, text) {
  return tg(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    text: text || "",
  });
}

// --- Inline-клавіатури -------------------------------------------------------
function mainKeyboard(pet) {
  if (!pet.alive) {
    return { inline_keyboard: [[{ text: "⚡ Воскресити", callback_data: "revive" }]] };
  }
  return {
    inline_keyboard: [
      [
        { text: "🍗 Годувати", callback_data: "feed" },
        { text: "🎮 Гратися", callback_data: "play" },
      ],
      [
        { text: "😴 Спати", callback_data: "sleep" },
        { text: "🛁 Мити", callback_data: "clean" },
      ],
      [
        { text: "🎭 Характер", callback_data: "pers" },
        { text: "🔄 Оновити", callback_data: "status" },
      ],
    ],
  };
}

function personalityKeyboard() {
  const rows = Object.entries(PERSONALITIES).map(([k, v]) => [
    { text: v.label, callback_data: "pers:" + k },
  ]);
  rows.push([{ text: "⬅️ Назад", callback_data: "status" }]);
  return { inline_keyboard: rows };
}

// Маленькі «тости» при натисканні кнопок.
const ACTION_TOAST = {
  feed: "🍗 Ням-ням!",
  play: "🎮 Віііі!",
  sleep: "😴 Хр-р-р...",
  clean: "🛁 Чистенький!",
};

// --- Стан із застосуванням занепаду ------------------------------------------
async function getPet(env, chatId) {
  const pet = await db.load(env, chatId);
  if (pet) {
    pet.applyDecay();
    pet.last_seen = now();
    await db.save(env, chatId, pet);
  }
  return pet;
}

// --- Тексти ------------------------------------------------------------------
const HELP =
  "🐣 <b>Я твій тамагочі.</b> Доглядай за мною, бо мені стає сумно з часом.\n\n" +
  "🍗 /feed — погодувати\n" +
  "🎮 /play — пограти\n" +
  "😴 /sleep — вкласти спати\n" +
  "🛁 /clean — помити\n" +
  "📊 /status — мій стан\n" +
  "✏️ /name &lt;ім'я&gt; — перейменувати\n" +
  "🎭 /personality — змінити характер\n" +
  "💀 /revive — воскресити\n\n" +
  "💡 Найзручніше — кнопками під карткою стану (/status).\n" +
  "А ще просто пиши мені, я люблю балакати 💬";

const ACTION_FLAVOUR = {
  feed: "🍗 <i>ням-ням</i>... дякую, я вже не з'їм твій роутер сьогодні",
  play: "🎮 ВІІІ! найкращий день мого життя (поки що)",
  sleep: "😴 *хропе абсурдно гучно для свого розміру*",
  clean: "🛁 блищу як нова копійка ✨",
};

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
      await send(env, chatId, pet.statusCard(), mainKeyboard(pet));
    }
    return;
  }

  if (cmd === "/help") return void (await send(env, chatId, HELP));

  if (cmd === "/status") {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    return void (await send(env, chatId, pet.statusCard(), mainKeyboard(pet)));
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

  // Дії догляду
  const action = { "/feed": "feed", "/play": "play", "/sleep": "sleep", "/clean": "clean" }[cmd];
  if (action) {
    const pet = await getPet(env, chatId);
    if (!pet) return void (await send(env, chatId, "Спершу /start 🥚"));
    if (!pet.alive)
      return void (await send(env, chatId, "☠️ Я тимчасово мертвий. Спробуй /revive"));
    pet.doAction(action);
    await db.save(env, chatId, pet);
    return void (await send(
      env,
      chatId,
      `${ACTION_FLAVOUR[action]}\n\n${pet.statusCard()}`,
      mainKeyboard(pet)
    ));
  }

  // --- Вільний текст ---------------------------------------------------------
  let pet = await db.load(env, chatId);

  // Очікуємо ім'я після /start?
  if (pet && pet.awaiting_name) {
    pet.awaiting_name = false;
    pet.name = text.slice(0, 30);
    await db.save(env, chatId, pet);
    await send(
      env,
      chatId,
      `🎉 <b>${pet.name}</b> — ідеальне ім'я!\n\n` +
        "Тепер я твоя відповідальність 😈 Користуйся кнопками нижче, або просто пиши мені 💬"
    );
    return void (await send(env, chatId, pet.statusCard(), mainKeyboard(pet)));
  }

  if (!pet) return void (await send(env, chatId, "Привіт! Я ще не народився. Напиши /start 🥚"));

  pet.applyDecay();
  pet.last_seen = now();
  await db.save(env, chatId, pet);
  await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" });
  const answer = await brain.reply(env, pet, text);
  await send(env, chatId, answer);
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
  pet.applyDecay();
  pet.last_seen = now();

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
    await editCard(env, chatId, messageId, pet.statusCard(), mainKeyboard(pet));
    return;
  }

  if (data === "revive") {
    pet.revive();
    await db.save(env, chatId, pet);
    await answerCb(env, cq.id, "⚡ Воскрес!");
    await editCard(env, chatId, messageId, pet.statusCard(), mainKeyboard(pet));
    return;
  }

  let toast = "";
  if (["feed", "play", "sleep", "clean"].includes(data)) {
    if (!pet.alive) {
      await answerCb(env, cq.id, "Я мертвий 💀 спершу воскреси");
    } else {
      pet.doAction(data);
      toast = ACTION_TOAST[data] || "";
    }
  }
  // data === "status" — просто оновлюємо картку.

  await db.save(env, chatId, pet);
  await answerCb(env, cq.id, toast);
  // Telegram кидає помилку, якщо текст не змінився — глушимо її.
  try {
    await editCard(env, chatId, messageId, pet.statusCard(), mainKeyboard(pet));
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
  const pets = await db.allPets(env);
  for (const { chatId, pet } of pets) {
    pet.applyDecay();
    await db.save(env, chatId, pet);
    if (!pet.alive) continue;
    if (now() - pet.last_nudge < NUDGE_COOLDOWN_H * 3600) continue;

    const needsAttention = pet.worstNeed() !== null;
    const longSilence = now() - pet.last_seen > SILENT_HOURS_H * 3600;
    if (!(needsAttention || longSilence)) continue;
    if (Math.random() > NUDGE_CHANCE) continue;

    try {
      const txt = await brain.nudge(env, pet);
      await send(env, chatId, txt);
      pet.last_nudge = now();
      await db.save(env, chatId, pet);
    } catch (e) {
      /* ignore individual send failures */
    }
  }
}
