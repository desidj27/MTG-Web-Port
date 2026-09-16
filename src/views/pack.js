import { el, escapeHtml, alertDialog } from "../util.js";
import { fetchPack, PACK_SIZE, loadSetCards } from "../services/scryfall.js";
import { collection } from "../services/collection.js";
import { showReveal } from "./reveal.js";
import {
  filterSets,
  findSet,
  getSelectedCode,
  loadSets,
  setSelectedCode,
} from "../services/sets.js";
import { resolvePackArt } from "../services/packArt.js";

function packMarkup(set, art) {
  if (art) {
    return `
      <img class="pack-photo" src="${art}" alt="${escapeHtml(set.name)} booster pack" referrerpolicy="no-referrer" />
      <span data-label>Tap To Open</span>
    `;
  }
  return `
    <div class="pack-face">
      <img class="pack-icon" src="${set.icon}" alt="" />
      <strong>${escapeHtml(set.name)}</strong>
      <em>${escapeHtml(set.code.toUpperCase())}</em>
      <span data-label>Tap To Open</span>
    </div>
  `;
}

function chipMarkup(set, selected) {
  return `
    <button type="button" class="set-chip ${selected ? "selected" : ""}" data-code="${escapeHtml(set.code)}" title="${escapeHtml(set.name)}">
      <img src="${set.icon}" alt="" />
      <span>${escapeHtml(set.name)}</span>
    </button>
  `;
}

export function renderPack() {
  const view = el(`
    <section class="pack-view">
      <h1 class="title-pill">Choose a Pack</h1>
      <input class="set-search" type="search" placeholder="Search sets..." data-search autocomplete="off" />
      <div class="set-scroller" data-scroller></div>
      <p class="set-status" data-status>Loading sets...</p>
      <button type="button" class="pack-button" data-open disabled>
        <div class="pack-face">
          <strong>Loading</strong>
          <span data-label>Tap To Open</span>
        </div>
      </button>
    </section>
  `);

  const scroller = view.querySelector("[data-scroller]");
  const status = view.querySelector("[data-status]");
  const search = view.querySelector("[data-search]");
  const button = view.querySelector("[data-open]");
  const label = () => view.querySelector("[data-label]");

  let sets = [];
  let selectedCode = getSelectedCode();
  let opening = false;
  let query = "";
  let packGen = 0;

  const selectedSet = () => findSet(sets, selectedCode) || sets[0] || null;

  const paintPack = async () => {
    const set = selectedSet();
    if (!set) {
      button.disabled = true;
      return;
    }
    const gen = ++packGen;
    selectedCode = set.code;
    setSelectedCode(selectedCode);
    button.disabled = opening;
    button.innerHTML = packMarkup(set, null);
    loadSetCards(selectedCode).catch(() => {});
    const art = await resolvePackArt(set.code);
    if (gen !== packGen) return;
    button.disabled = opening;
    button.innerHTML = packMarkup(set, art);
  };

  const paintChips = () => {
    const visible = filterSets(sets, query);
    const selected = selectedSet();
    const ordered = selected && visible.some((s) => s.code === selected.code)
      ? [selected, ...visible.filter((s) => s.code !== selected.code)]
      : visible;

    scroller.innerHTML = ordered.slice(0, 80).map((set) => chipMarkup(set, set.code === selectedCode)).join("");
    scroller.querySelectorAll("[data-code]").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedCode = chip.dataset.code;
        setSelectedCode(selectedCode);
        paintChips();
        paintPack();
        status.textContent = `${selectedSet()?.name ?? ""} - ${selectedSet()?.cardCount ?? 0} cards`;
      });
    });

    if (!ordered.length) {
      status.textContent = "No sets match that search.";
    } else {
      const set = selectedSet();
      status.textContent = set ? `${set.name} - ${set.cardCount} cards` : "";
    }
  };

  search.addEventListener("input", () => {
    query = search.value;
    paintChips();
  });

  button.addEventListener("click", async () => {
    if (opening) return;
    const set = selectedSet();
    if (!set) return;
    opening = true;
    button.disabled = true;
    if (label()) label().textContent = "Opening...";
    try {
      const cards = await fetchPack(set.code, PACK_SIZE);
      if (!cards.length) {
        await alertDialog("No cards fetched", "Could not load cards from Scryfall. Check your connection and try again.");
        return;
      }
      collection.append(cards);
      showReveal(cards);
    } catch (error) {
      await alertDialog("Couldn’t open pack", error.message || "Something went wrong.");
    } finally {
      opening = false;
      paintPack();
    }
  });

  loadSets()
    .then((list) => {
      sets = list;
      if (!findSet(sets, selectedCode) && sets[0]) selectedCode = sets[0].code;
      paintChips();
      paintPack();
    })
    .catch(async (error) => {
      status.textContent = error.message || "Could not load sets.";
      await alertDialog("Couldn’t load packs", "Scryfall set list is unavailable. Check your connection and try again.");
    });

  return view;
}
