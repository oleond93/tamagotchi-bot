// db.js — зберігання стану у Cloudflare D1 (безкоштовна SQLite-база).

import { Pet } from "./pet.js";

export async function load(env, chatId) {
  const row = await env.DB.prepare("SELECT data FROM pets WHERE chat_id = ?")
    .bind(chatId)
    .first();
  if (!row) return null;
  return new Pet(JSON.parse(row.data));
}

export async function save(env, chatId, pet) {
  await env.DB.prepare(
    "INSERT INTO pets (chat_id, data) VALUES (?, ?) " +
      "ON CONFLICT(chat_id) DO UPDATE SET data = excluded.data"
  )
    .bind(chatId, JSON.stringify(pet.toJSON()))
    .run();
}

export async function allPets(env) {
  const { results } = await env.DB.prepare(
    "SELECT chat_id, data FROM pets"
  ).all();
  return (results || []).map((r) => ({
    chatId: r.chat_id,
    pet: new Pet(JSON.parse(r.data)),
  }));
}
