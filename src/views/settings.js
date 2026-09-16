import { el, confirmDialog, alertDialog } from "../util.js";
import { sound } from "../services/sound.js";
import { collection } from "../services/collection.js";
import { setStage } from "../app.js";
import { showInfoSheet } from "./infoSheet.js";

export function renderSettings() {
  const view = el(`
    <section class="settings-view">
      <h1 class="title-pill">Settings</h1>
      <label class="setting-row">
        <span>Sound Effects</span>
        <input type="checkbox" data-sfx ${sound.sfxEnabled ? "checked" : ""} />
      </label>
      <label class="setting-row">
        <span>Music</span>
        <input type="checkbox" data-music ${sound.musicEnabled ? "checked" : ""} />
      </label>
      <button type="button" class="setting-btn" data-clear>Clear Card Collection</button>
      <button type="button" class="setting-btn" data-about>About Us</button>
      <button type="button" class="setting-btn" data-rarity>Rarity Info</button>
      <button type="button" class="setting-btn" data-rules>MTG Rules &amp; Regulations</button>
      <button type="button" class="setting-btn" data-profile>Open Profile</button>
    </section>
  `);

  view.querySelector("[data-sfx]").addEventListener("change", (event) => {
    sound.setSfxEnabled(event.target.checked);
  });
  view.querySelector("[data-music]").addEventListener("change", (event) => {
    sound.setMusicEnabled(event.target.checked);
  });
  view.querySelector("[data-clear]").addEventListener("click", async () => {
    const ok = await confirmDialog(
      "Are you sure?",
      "This will permanently delete your saved card collection.",
      "Yes, Clear",
      true,
    );
    if (!ok) return;
    collection.clearActive();
    await alertDialog("Card Collection Cleared", "Your card collection has been successfully cleared.");
  });
  view.querySelector("[data-about]").addEventListener("click", () => {
    showInfoSheet("About Us", "/assets/text/AboutMe.txt", [
      "Description",
      "Contact Us",
      "Meet our team!",
      "Acknowledgements",
      "LEGAL INFORMATION",
      "Accessibility",
    ]);
  });
  view.querySelector("[data-rarity]").addEventListener("click", () => {
    showInfoSheet("Rarity Info", "/assets/text/RarityInfo.txt", [
      "Description",
      "Common — Gray",
      "Uncommon — Blue / Silver",
      "Rare — Gold",
      "Mythic Rare — Orange / Red-Orange",
      "Legendary / Special Printings (optional tier) — Purple",
      "Summary",
    ]);
  });
  view.querySelector("[data-rules]").addEventListener("click", () => {
    showInfoSheet("MTG Rules & Regulations", "/assets/text/MTGRulesAndReg.txt", [
      "Magic: The Gathering — The Basics",
      "Core Concepts",
      "Summary",
      "Helpful Resources",
    ]);
  });
  view.querySelector("[data-profile]").addEventListener("click", () => setStage("profiles"));

  return view;
}
