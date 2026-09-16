import { el, escapeHtml, resizeAvatar, alertDialog, confirmDialog } from "../util.js";
import { profiles } from "../services/profiles.js";
import { setStage, showOverlay, hideOverlay } from "../app.js";

export function renderProfiles({ allowSkip = false } = {}) {
  const list = profiles.loadAll();
  const activeId = profiles.activeId();

  const view = el(`
    <section class="screen profiles">
      <header class="page-header">
        <h1>Select Profile</h1>
        <div class="header-actions">
          <button type="button" class="icon-btn" data-add aria-label="Add profile">+</button>
          ${allowSkip || list.length ? `<button type="button" class="text-btn" data-continue>Continue</button>` : ""}
        </div>
      </header>
      <div class="profile-body"></div>
    </section>
  `);

  const body = view.querySelector(".profile-body");

  const paintList = () => {
    const current = profiles.loadAll();
    const active = profiles.activeId();
    if (!current.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">☺</div>
          <h2>No Profiles Yet</h2>
          <p>Tap + to create your first profile.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = `<ul class="profile-list"></ul>`;
    const ul = body.querySelector("ul");
    for (const profile of current) {
      const row = el(`
        <li class="profile-row ${profile.id === active ? "active" : ""}" data-id="${profile.id}">
          <img class="avatar" src="${profile.avatar || "/assets/favicon.png"}" alt="" />
          <span class="profile-name">${escapeHtml(profile.username)}</span>
          ${profile.id === active ? `<span class="check">✓</span>` : ""}
          <span class="chevron">›</span>
        </li>
      `);
      row.addEventListener("click", () => {
        if (profiles.activeId() !== profile.id) {
          profiles.setActive(profile.id);
          paintList();
        } else {
          openProfileForm(profile);
        }
      });
      row.addEventListener("contextmenu", async (event) => {
        event.preventDefault();
        const ok = await confirmDialog("Delete Profile?", "This will permanently remove the profile.", "Delete", true);
        if (!ok) return;
        profiles.delete(profile.id);
        paintList();
        if (!profiles.loadAll().length) openProfileForm(null, { lockClose: true });
      });
      ul.appendChild(row);
    }
  };

  paintList();

  view.querySelector("[data-add]").addEventListener("click", () => openProfileForm(null));
  const continueBtn = view.querySelector("[data-continue]");
  if (continueBtn) {
    continueBtn.disabled = !profiles.activeId();
    continueBtn.style.opacity = profiles.activeId() ? "1" : "0.4";
    continueBtn.addEventListener("click", () => {
      if (!profiles.activeId()) return;
      setStage("main");
    });
  }

  if (!list.length) {
    queueMicrotask(() => openProfileForm(null, { lockClose: true }));
  } else if (!allowSkip && activeId) {
    // Root flow auto-advances once a profile is already selected.
  }

  return view;
}

export function openProfileForm(existing = null, { lockClose = false } = {}) {
  const isEdit = Boolean(existing);
  const form = el(`
    <div class="sheet-backdrop">
      <form class="sheet profile-form">
        <header class="sheet-header">
          <button type="button" class="text-btn" data-close ${lockClose && !profiles.loadAll().length ? "disabled" : ""}>Close</button>
          <h2>${isEdit ? "Edit Profile" : "Create Profile"}</h2>
        </header>
        <div class="avatar-row">
          <img class="avatar large" data-avatar src="${existing?.avatar || "/assets/favicon.png"}" alt="Avatar" />
          <label class="btn btn-light">
            Upload Profile Picture
            <input type="file" accept="image/*" hidden data-file />
          </label>
        </div>
        <label class="field">
          <span>Email</span>
          <input type="email" name="email" placeholder="you@example.com" value="${escapeHtml(existing?.email || "")}" autocomplete="email" />
        </label>
        <label class="field">
          <span>Username</span>
          <input type="text" name="username" placeholder="Enter a username" value="${escapeHtml(existing?.username || "")}" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-dark" data-cancel>Cancel</button>
          <button type="submit" class="btn btn-dark" data-save>Save</button>
        </div>
        ${isEdit ? `<button type="button" class="btn btn-danger" data-delete>Delete Profile</button>` : ""}
      </form>
    </div>
  `);

  let avatar = existing?.avatar || null;
  form.querySelector("[data-file]").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    avatar = await resizeAvatar(file);
    form.querySelector("[data-avatar]").src = avatar;
  });

  const close = () => {
    if (lockClose && !profiles.loadAll().length) return;
    hideOverlay();
  };

  form.querySelector("[data-close]").addEventListener("click", close);
  form.querySelector("[data-cancel]").addEventListener("click", async () => {
    const ok = await confirmDialog("Discard changes?", "Your changes will not be saved.", "Discard", true);
    if (ok) close();
  });

  form.querySelector(".profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector('[name="email"]').value.trim();
    let username = form.querySelector('[name="username"]').value.trim();
    if (!username) username = email.split("@")[0] || "Player";
    const enterMain = !existing && profiles.loadAll().length === 0;
    profiles.upsert({
      id: existing?.id,
      email,
      username,
      avatar,
    });
    hideOverlay();
    if (enterMain) {
      setTimeout(() => setStage("main"), 0);
      return;
    }
    await alertDialog("Profile Saved", "Your profile has been saved successfully.");
    setStage("profiles");
  });

  form.querySelector("[data-delete]")?.addEventListener("click", async () => {
    const ok = await confirmDialog("Delete Profile?", "This will permanently remove the profile.", "Delete", true);
    if (!ok) return;
    profiles.delete(existing.id);
    await alertDialog("Profile Deleted", "Your profile has been deleted.");
    if (!profiles.loadAll().length) {
      hideOverlay();
      setStage("profiles");
      openProfileForm(null, { lockClose: true });
    } else {
      hideOverlay();
      setStage("profiles");
    }
  });

  showOverlay(form);
}
