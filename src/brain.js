// brain.js — "мозок" улюбленця через будь-який OpenAI-сумісний API.
// За замовчуванням OpenRouter (безкоштовні моделі); можна вказати свій ендпоінт.

import { PERSONALITIES } from "./personalities.js";
import { STAT_LABELS, EMOTIONS } from "./pet.js";

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
  const lines = pet.activeStats().map(
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

const UNIVERSAL_RULES =
  "ЗАГАЛЬНІ ПРАВИЛА: Ти — віртуальний улюбленець-тамагочі у Телеграмі. " +
  "Пиши УКРАЇНСЬКОЮ, дуже коротко (1-3 речення), з доречними емодзі. " +
  "Ніколи не виходь з ролі й не згадуй, що ти ШІ. Реагуй на свій стан і будь смішним.";

// Тег емоції в кінці відповіді: [[emo:КЛЮЧ:СИЛА]]. Гнучкий до пробілів/регістру
// й роздільника (':' або '|'); бере ОСТАННЄ входження. Невідома емоція → neutral.
const EMO_RE = /\[\[?\s*emo\s*[:|]\s*([a-z_]+)\s*[:|]\s*(\d{1,2})\s*\]\]?/gi;

// Розбирає відповідь моделі на чистий текст + емоцію. Тег(и) вирізаються з тексту.
// Якщо тега немає чи він зіпсований — emotion=neutral, текст лишається як є.
export function parseEmotionTag(raw) {
  if (!raw) return { text: "", emotion: "neutral", intensity: 0 };
  let emotion = "neutral";
  let intensity = 0;
  let last = null;
  let m;
  EMO_RE.lastIndex = 0;
  while ((m = EMO_RE.exec(raw)) !== null) last = m;
  if (last) {
    const word = last[1].toLowerCase();
    if (EMOTIONS[word]) emotion = word;
    intensity = Math.max(0, Math.min(10, parseInt(last[2], 10) || 0));
  }
  const text = raw.replace(EMO_RE, "").trim();
  return { text, emotion, intensity };
}

// Підказка для LLM: як реагувати в характері + поточна емоція (+ інструкція-тег).
function emotionRules(pet, wantTag) {
  const parts = [];
  const persona = PERSONALITIES[pet.dominantPersona?.()];
  if (wantTag) {
    parts.push(
      "ЕМОЦІЙНА РЕАКЦІЯ: щиро відреагуй на ТОН повідомлення власника (образа, тепло, нудьга, похвала — будь-який нюанс) у своєму характері."
    );
  }
  if (persona?.react) parts.push("Як саме ти реагуєш (твій характер): " + persona.react);
  const cur = pet.emotionPrompt();
  if (cur) parts.push(cur);
  if (wantTag) {
    const keys = Object.keys(EMOTIONS).filter((k) => k !== "neutral").join(", ");
    parts.push(
      `В САМОМУ КІНЦІ відповіді додай окремий рядок-тег рівно у форматі [[emo:КЛЮЧ:СИЛА]], ` +
        `де КЛЮЧ — одне з: ${keys}, neutral (пиши ЛАТИНИЦЕЮ, як тут); СИЛА — ціле 0-10 ` +
        `(наскільки сильно це тебе зачепило). Без пояснень. Нейтральне повідомлення → [[emo:neutral:0]].`
    );
  }
  return parts.join("\n");
}

function systemPrompt(pet, dayPart, { wantTag = false } = {}) {
  let s = "ТВІЙ ХАРАКТЕР: " + pet.personaPrompt();
  s += "\n\n" + UNIVERSAL_RULES;
  const temper = pet.temperamentStyle();
  if (temper) s += "\n\n" + temper;
  s += "\n\nСТИЛЬ МОВЛЕННЯ (залежить від твоєї стадії розвитку — суворо дотримуйся!):\n" + pet.speechStyle();
  if (dayPart) s += "\n\nПОРА ДОБИ: " + dayPart.note;
  s += "\n\nКОНТЕКСТ ТВОГО СТАНУ:\n" + stateContext(pet);
  const emo = emotionRules(pet, wantTag);
  if (emo) s += "\n\n" + emo;
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

// Відповідь на вільний текст. Повертає { text, emotion, intensity } — модель ще й
// тегує, як її зачепило повідомлення (тег вирізається з тексту перед показом).
export async function reply(env, pet, userText, dayPart) {
  try {
    const out = await chat(env, systemPrompt(pet, dayPart, { wantTag: true }), userText);
    if (!out) return { text: pick(FALLBACK), emotion: "neutral", intensity: 0 };
    const parsed = parseEmotionTag(out);
    return {
      text: parsed.text || pick(FALLBACK),
      emotion: parsed.emotion,
      intensity: parsed.intensity,
    };
  } catch {
    return { text: pick(FALLBACK), emotion: "neutral", intensity: 0 };
  }
}

export async function nudge(env, pet, dayPart) {
  const prompt =
    "Напиши КОРОТКЕ (1-2 речення) спонтанне повідомлення власнику ПЕРШИМ, " +
    "ніби ти нудьгуєш або тобі щось потрібно. Будь абсурдним і смішним.";
  try {
    // wantTag:false — нагадування не тегуємо; на випадок, якщо тег усе ж протече,
    // захисно вирізаємо його з тексту.
    const out = await chat(env, systemPrompt(pet, dayPart), prompt, {
      maxTokens: 120,
      temperature: 1.1,
    });
    // Тег тут не очікуємо, але якщо протече — вирізаємо; порожній текст → фолбек нижче.
    if (out) {
      const stripped = parseEmotionTag(out).text;
      if (stripped) return stripped;
    }
  } catch {
    /* fallthrough */
  }
  const worst = pet.worstNeed();
  const label = worst ? STAT_LABELS[worst][0].toLowerCase() : "увагу";
  return `гей… я тут згадав про тебе 🥺 мені бракує ${label}`;
}
