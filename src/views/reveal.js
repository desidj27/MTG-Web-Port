import { el, preferredImage, rarityClass, visibleName } from "../util.js";
import { formatDropChance } from "../services/scryfall.js";
import { sound } from "../services/sound.js";
import { hideOverlay, showOverlay } from "../app.js";

export function showReveal(cards) {
  let index = 0;
  let face = 0;
  let animating = false;

  const overlay = el(`
    <div class="reveal-backdrop">
      <article class="reveal-card rarity-common">
        <h2 data-name></h2>
        <p class="rarity-label" data-rarity></p>
        <hr />
        <img class="card-art" data-art alt="" />
        <div class="reveal-actions">
          <button type="button" class="btn btn-dark" data-flip>Flip</button>
          <button type="button" class="btn btn-muted" data-skip>Skip</button>
        </div>
        <p class="hint">Tap the card to reveal the next one</p>
      </article>
    </div>
  `);

  const cardEl = overlay.querySelector(".reveal-card");
  const nameEl = overlay.querySelector("[data-name]");
  const rarityEl = overlay.querySelector("[data-rarity]");
  const artEl = overlay.querySelector("[data-art]");
  const flipBtn = overlay.querySelector("[data-flip]");

  const paint = (playSound = false) => {
    if (index >= cards.length) {
      overlay.innerHTML = `<div class="pack-complete">Pack Complete</div>`;
      setTimeout(hideOverlay, 1500);
      return;
    }
    const card = cards[index];
    const canFlip = (card.faces?.length ?? 0) > 1;
    nameEl.textContent = visibleName(card, face);
    const chance = formatDropChance(card.dropChance);
    rarityEl.textContent = chance ? `${card.rarity} · ${chance}` : card.rarity;
    artEl.src = preferredImage(card, face);
    artEl.alt = visibleName(card, face);
    cardEl.className = `reveal-card rarity-${rarityClass(card.rarity)}`;
    flipBtn.disabled = !canFlip;
    flipBtn.style.opacity = canFlip ? "1" : "0.5";
    if (playSound) sound.playReveal(card);
  };

  const fadeTo = (next) => {
    if (animating) return;
    animating = true;
    artEl.classList.add("fade");
    setTimeout(() => {
      next();
      artEl.classList.remove("fade");
      setTimeout(() => {
        animating = false;
      }, 220);
    }, 220);
  };

  overlay.querySelector("[data-skip]").addEventListener("click", (event) => {
    event.stopPropagation();
    hideOverlay();
  });

  flipBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const card = cards[index];
    if ((card.faces?.length ?? 0) <= 1) return;
    fadeTo(() => {
      face = (face + 1) % card.faces.length;
      paint(false);
      sound.playFlip();
    });
  });

  cardEl.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    const card = cards[index];
    fadeTo(() => {
      if (card.faces?.length > 1 && face < card.faces.length - 1) {
        face += 1;
      } else {
        face = 0;
        index += 1;
      }
      paint(true);
    });
  });

  showOverlay(overlay);
  requestAnimationFrame(() => paint(true));
}
