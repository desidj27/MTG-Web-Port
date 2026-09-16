const CACHE_MS = 24 * 60 * 60 * 1000;
const PACK_SIZE = 14;

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
        image_uris: face.image_uris ?? null,
      }))
    : null;

  return {
    id: raw.id,
    name: raw.name,
    rarity: raw.rarity,
    rarityOrder: rarityOrder(raw.rarity),
    set: raw.set ?? null,
    image_uris: raw.image_uris ?? null,
    faces,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(code) {
  return `set.cards.v1.${String(code).toLowerCase()}`;
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

export async function loadSetCards(code) {
  const key = cacheKey(code);
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.at && Date.now() - cached.at < CACHE_MS && Array.isArray(cached.cards) && cached.cards.length) {
      return cached.cards;
    }
  } catch {
    /* ignore bad cache */
  }

  const cards = await fetchPages(code);
  localStorage.setItem(key, JSON.stringify({ at: Date.now(), cards }));
  return cards;
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
