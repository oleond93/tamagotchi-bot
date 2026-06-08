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
  const model =
    env.LLM_MODEL ||
    env.OPENROUTER_MODEL ||
    "meta-llama/llama-3.3-70b-instruct:free";
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

function systemPrompt(pet) {
  const p = PERSONALITIES[pet.personality] || PERSONALITIES.gremlin;
  return p.prompt + "\n\nКОНТЕКСТ ТВОГО СТАНУ:\n" + stateContext(pet);
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

export async function reply(env, pet, userText) {
  try {
    const out = await chat(env, systemPrompt(pet), userText);
    return out || pick(FALLBACK);
  } catch {
    return pick(FALLBACK);
  }
}

export async function nudge(env, pet) {
  const prompt =
    "Напиши КОРОТКЕ (1-2 речення) спонтанне повідомлення власнику ПЕРШИМ, " +
    "ніби ти нудьгуєш або тобі щось потрібно. Будь абсурдним і смішним.";
  try {
    const out = await chat(env, systemPrompt(pet), prompt, {
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
