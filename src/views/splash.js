import { el, isOnline } from "../util.js";
import { sound } from "../services/sound.js";
import { setStage } from "../app.js";

export function renderSplash() {
  const online = isOnline();
  const view = el(`
    <section class="screen splash">
      <div class="offline-banner" ${online ? "hidden" : ""}>
        You’re offline. Connect to Wi-Fi to continue.
      </div>
      <img class="logo" src="/assets/logo.png" alt="MTG Pack Opener logo" />
      <div class="cta-pill">
        <span data-cta>${online ? "Tap to continue" : "No internet"}</span>
      </div>
    </section>
  `);

  const cta = view.querySelector("[data-cta]");
  const banner = view.querySelector(".offline-banner");

  const syncOnline = () => {
    const connected = isOnline();
    banner.hidden = connected;
    cta.textContent = connected ? "Tap to continue" : "No internet";
  };

  window.addEventListener("online", syncOnline);
  window.addEventListener("offline", syncOnline);

  view.addEventListener("click", async () => {
    if (!isOnline()) {
      window.alert("Please connect to the internet to continue.");
      return;
    }
    view.classList.add("fade-out");
    await sound.startMusic();
    setTimeout(() => setStage("profiles"), 200);
  });

  return view;
}
