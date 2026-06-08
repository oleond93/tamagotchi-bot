// brain.js — "мозок" улюбленця через будь-який OpenAI-сумісний API.
// За замовчуванням OpenRouter (безкоштовні моделі); можна вказати свій ендпоінт.

import { PERSONALITIES } from "./personalities.js";
import { STAT_LABELS } from "./pet.js";

const FALLBACK = [
  "🫠 мій мозок зараз на технічній перерві, але я тебе люблю (мабуть)",
  "👾 *кудкудакає незрозуміло* (AI відпочиває)",
  "🤪 я тимчасово думаю лише вайбами, не словами",
];

function pick(arr) {
  return arr[Math.floor((Date.now() / 1000) % arr.length)];
}

function config(env) {
  const baseUrl = env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const apiKey = env.LLM_API_KEY || env.OPENROUTER_API_KEY;
  // "openrouter/free" — роутер, який сам обирає доступну безкоштовну модель.
  // Надійніше за конкретну назву, бо список free-моделей змінюється.
  const model =
    env.LLM_MODEL || env.OPENROUTER_MODEL || "openrouter/free";
  return { baseUrl, apiKey, model };
}

function stateContext(pet) {
  const lines = Object.keys(STAT_LABELS).map(
    (s) => `${STAT_LABELS[s][0]}: ${Math.round(pet[s])}%`
  );
  const worst = pet.worstNeed();
  let worstTxt = "";
  if (worst) {
    worstTxt = `\nЗАРАЗ ТЕБЕ НАЙБІЛЬШЕ ТУРБУЄ: ${STAT_LABELS[worst][0]} (низько!). Драматично пожалійся на це.`;
  }
  return (
    `Твоє ім'я: ${pet.name}. Стадія: ${pet.stage().name}. ` +
    `Вік: ${pet.ageDays.toFixed(1)} днів. Настрій: ${pet.moodWord()}.\n` +
    `Показники — ${lines.join(", ")}.${worstTxt}`
  );
}

function systemPrompt(pet, dayPart) {
  const p = PERSONALITIES[pet.personality] || PERSONALITIES.gremlin;
  let s = p.prompt;
  s += "\n\nСТИЛЬ МОВЛЕННЯ (залежить від твоєї стадії розвитку — суворо дотримуйся!):\n" + pet.speechStyle();
  if (dayPart) s += "\n\nПОРА ДОБИ: " + dayPart.note;
  s += "\n\nКОНТЕКСТ ТВОГО СТАНУ:\n" + stateContext(pet);
  return s;
}

async function chat(env, system, user, { maxTokens = 200, temperature = 1.0 } = {}) {
  const { baseUrl, apiKey, model } = config(env);
  if (!apiKey) return null;
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// Діагностика: показує, чи є ключ, яку модель використано, і РЕАЛЬНУ
// відповідь провайдера. Ключ не розкривається. Доступно через /diag.
export async function diag(env) {
  const { baseUrl, apiKey, model } = config(env);
  const out = {
    has_telegram_token: !!env.TELEGRAM_TOKEN,
    has_ai_key: !!apiKey,
    base_url: baseUrl,
    model,
  };
  if (!apiKey) {
    out.problem =
      "Немає AI-ключа. Додай секрет OPENROUTER_API_KEY (або LLM_API_KEY).";
    return out;
  }
  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 20,
      }),
    });
    out.http_status = resp.status;
    out.ok = resp.ok;
    const body = await resp.text();
    out.provider_response = body.slice(0, 600);
  } catch (e) {
    out.fetch_error = String(e);
  }
  return out;
}

export async function reply(env, pet, userText, dayPart) {
  try {
    const out = await chat(env, systemPrompt(pet, dayPart), userText);
    return out || pick(FALLBACK);
  } catch {
    return pick(FALLBACK);
  }
}

export async function nudge(env, pet, dayPart) {
  const prompt =
    "Напиши КОРОТКЕ (1-2 речення) спонтанне повідомлення власнику ПЕРШИМ, " +
    "ніби ти нудьгуєш або тобі щось потрібно. Будь абсурдним і смішним.";
  try {
    const out = await chat(env, systemPrompt(pet, dayPart), prompt, {
      maxTokens: 120,
      temperature: 1.1,
    });
    if (out) return out;
  } catch {
    /* fallthrough */
  }
  const worst = pet.worstNeed();
  const label = worst ? STAT_LABELS[worst][0].toLowerCase() : "увагу";
  return `гей… я тут згадав про тебе 🥺 мені бракує ${label}`;
}
