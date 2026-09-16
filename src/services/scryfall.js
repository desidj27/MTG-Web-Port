import { slimCard, slimImageUris } from "../util.js";
import {
  idbGetSetCache,
  idbSetSetCache,
  migrateLegacySetCaches,
  SET_CACHE_PREFIX,
} from "./storage.js";

const CACHE_MS = 24 * 60 * 60 * 1000;
const PACK_SIZE = 14;
const memory = new Map();
const inflight = new Map();

function rarityOrder(rarity) {
  switch (String(rarity).toLowerCase()) {
    case "mythic":
      return 0;
    case "rare":
      return 1;
    case "uncommon":
      return 2;
    case "common":
      return 3;
    default:
      return 4;
  }
}

function normalizeCard(raw) {
  const faces = Array.isArray(raw.card_faces)
    ? raw.card_faces.map((face) => ({
        name: face.name,
        image_uris: slimImageUris(face.image_uris),
      }))
    : null;

  return slimCard({
    id: raw.id,
    name: raw.name,
    rarity: raw.rarity,
    rarityOrder: rarityOrder(raw.rarity),
    set: raw.set ?? null,
    image_uris: slimImageUris(raw.image_uris),
    faces,
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(code) {
  return `${SET_CACHE_PREFIX}${String(code).toLowerCase()}`;
}

function freshCards(cached) {
  if (!cached?.at || Date.now() - cached.at >= CACHE_MS) return null;
  if (!Array.isArray(cached.cards) || !cached.cards.length) return null;
  return cached.cards.map(slimCard);
}

async function fetchPages(code) {
  const cards = [];
  const query = `e:${code}`;
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Scryfall request failed (${response.status})`);
    }
    const data = await response.json();
    cards.push(...(data.data ?? []));
    url = data.has_more ? data.next_page : null;
    if (url) await delay(120);
  }

  return cards.map(normalizeCard).filter((card) => card.image_uris || card.faces?.some((f) => f.image_uris));
}

async function loadUncached(key, code) {
  await migrateLegacySetCaches();

  const fromIdb = freshCards(await idbGetSetCache(key));
  if (fromIdb) {
    memory.set(key, fromIdb);
    return fromIdb;
  }

  try {
    const fromLocal = freshCards(JSON.parse(localStorage.getItem(key) || "null"));
    if (fromLocal) {
      memory.set(key, fromLocal);
      await idbSetSetCache(key, { at: Date.now(), cards: fromLocal });
      return fromLocal;
    }
  } catch {
    /* ignore bad cache */
  }

  const cards = await fetchPages(code);
  memory.set(key, cards);
  await idbSetSetCache(key, { at: Date.now(), cards });
  return cards;
}

export async function loadSetCards(code) {
  const key = cacheKey(code);
  if (memory.has(key)) return memory.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const pending = loadUncached(key, code).finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export async function fetchPack(code, size = PACK_SIZE) {
  const pool = await loadSetCards(code);
  if (!pool.length) return [];
  const pack = [];
  for (let i = 0; i < size; i += 1) {
    pack.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return pack;
}

export { PACK_SIZE };
