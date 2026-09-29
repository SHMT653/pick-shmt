// Einstiegs-Screens: Home-Bildschirm, "Raum erstellen" und "Raum beitreten".
import { CATEGORIES, MODES } from "../config.js";
import { t } from "../i18n.js";
import { escapeHTML } from "../utils.js";
import { getActiveRound } from "../lobby.js";
import { categoryLabel, modeLabel, renderBrandLockup } from "../ui.js";

// === Home-Bildschirm ===

export function renderIntro(state) {
  return `
    <section class="intro-screen" aria-label="Pickr Logo Animation">
      <video
        class="intro-video"
        data-intro-video
        src="/assets/video/pickr-logo-animation.mp4"
        autoplay
        muted
        playsinline
        preload="auto"
      ></video>
      <button class="intro-skip" type="button" data-action="finish-intro" aria-label="Intro überspringen">
        <i data-lucide="arrow-right"></i>
      </button>
    </section>
  `;
}

export function renderHome(state) {
  const lang = state.settings.language;
  const previewQuestion = lang === "de" ? "Was essen wir heute?" : "What should we eat tonight?";
  const previewIdeas =
    lang === "de"
      ? ["Sushi", "Pizza", "Pasta", "Mexikanisch"]
      : ["Sushi", "Pizza", "Pasta", "Mexican"];

  return `
    <section class="home-grid page-enter">
      <div class="home-copy">
        ${renderBrandLockup("hero-lockup")}
        ${state.lobby ? renderContinueRoom(state.lobby, lang) : ""}
        <h1>Swipe. Pick. Done.</h1>
        <p>${escapeHTML(t(lang, "heroCopy"))}</p>
        <div class="hero-actions">
          <button class="primary-action" type="button" data-action="navigate" data-view="create">
            <i data-lucide="plus"></i>
            <span>${escapeHTML(t(lang, "createRoom"))}</span>
          </button>
          <button class="secondary-action" type="button" data-action="navigate" data-view="join">
            <i data-lucide="log-in"></i>
            <span>${escapeHTML(t(lang, "joinRoom"))}</span>
          </button>
        </div>
        <form class="home-code-join" data-form="home-join">
          <label>
            <span>${escapeHTML(t(lang, "roomCodeQuestion"))}</span>
            <div class="code-join-row">
              <input name="code" maxlength="6" autocapitalize="characters" placeholder="7KFX2P" />
              <button class="secondary-action" type="submit">
                <i data-lucide="arrow-right"></i>
                <span>${escapeHTML(t(lang, "join"))}</span>
              </button>
            </div>
          </label>
        </form>
        <button class="quick-link" type="button" data-action="navigate" data-view="quick">
          <i data-lucide="zap"></i>
          <span>${escapeHTML(t(lang, "quickPickLink"))}</span>
        </button>
      </div>

      <div class="product-preview" aria-label="Pickr room preview">
        <div class="preview-phone">
          <div class="preview-room">
            <span>ROOM 7KFX2P</span>
            <strong>${escapeHTML(previewQuestion)}</strong>
          </div>
          <div class="preview-ideas">
            <span>${escapeHTML(previewIdeas[0])} <small>Anna</small></span>
            <span>${escapeHTML(previewIdeas[1])} <small>Paul</small></span>
            <span>${escapeHTML(previewIdeas[2])} <small>Luca</small></span>
            <span>${escapeHTML(previewIdeas[3])} <small>Marie</small></span>
          </div>
          <div class="preview-stack">
            <div class="preview-card preview-card-back">Pizza</div>
            <div class="preview-card">Sushi</div>
          </div>
          <div class="preview-actions">
            <span><i data-lucide="x"></i></span>
            <span><i data-lucide="heart"></i></span>
          </div>
          <div class="preview-people">
            <span>Max</span>
            <span>Anna</span>
            <span>Paul</span>
            <span>Luca</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderDevDemo(state) {
  const copy = {
    title: "Swipe. Pick. Done.",
    intro: "Raum erstellen, Ideen sammeln und gemeinsam entscheiden.",
    stage: "Raum vorbereiten",
    question: "Was essen wir heute?",
    createTitle: "Raum erstellen",
    joinTitle: "Raum beitreten",
    createCopy: "Der Host waehlt Frage und Spielmodus. Die Ideen kommen von allen Teilnehmern dazu.",
    joinCopy: "Code eingeben, Namen setzen und erste Ideen mitschicken.",
    room: "ROOM 7KFX2P",
    start: "Raum anlegen",
    joinButton: "Beitreten",
    mode: "Swipe",
  };

  return `
    <section class="dev-demo page-enter">
      <div class="dev-app-frame">
        <div class="dev-hero-video">
          <video src="/assets/video/pickr-logo-animation.mp4" autoplay muted playsinline loop></video>
          <div class="dev-video-copy">
            <h1>${escapeHTML(copy.title)}</h1>
            <p>${escapeHTML(copy.intro)}</p>
          </div>
        </div>

        <div class="dev-topline">
          ${renderBrandLockup("dev-lockup")}
          <span>${escapeHTML(copy.stage)}</span>
        </div>

        <div class="dev-start-grid">
          <section class="dev-app-panel dev-work-card">
            <span class="eyebrow">${escapeHTML(copy.createTitle)}</span>
            <h2>${escapeHTML(copy.question)}</h2>
            <p>${escapeHTML(copy.createCopy)}</p>
            <label>
              <span>Frage</span>
              <input value="${escapeHTML(copy.question)}" readonly />
            </label>
            <div class="split-fields">
              <label>
                <span>Modus</span>
                <select disabled><option>${escapeHTML(copy.mode)}</option></select>
              </label>
              <label>
                <span>Kategorie</span>
                <select disabled><option>Essen</option></select>
              </label>
            </div>
            <div class="dev-action-row">
              <button class="primary-action" type="button"><i data-lucide="plus"></i><span>${escapeHTML(copy.start)}</span></button>
              <button class="ghost-action" type="button"><i data-lucide="qr-code"></i><span>QR</span></button>
            </div>
          </section>

          <section class="dev-app-panel dev-work-card">
            <span class="eyebrow">${escapeHTML(copy.joinTitle)}</span>
            <p>${escapeHTML(copy.joinCopy)}</p>
            <label>
              <span>Raumcode</span>
              <input value="7KFX2P" readonly />
            </label>
            <label>
              <span>Name</span>
              <input value="Anna" readonly />
            </label>
            <label>
              <span>Erste Ideen</span>
              <textarea readonly>Sushi&#10;Bowling&#10;Interstellar</textarea>
            </label>
            <button class="primary-action full" type="button">
              <i data-lucide="circle-check"></i>
              <span>${escapeHTML(copy.joinButton)}</span>
            </button>
          </section>

          <aside class="dev-app-panel dev-preview-panel">
            <span class="eyebrow">${escapeHTML(copy.room)}</span>
            <strong>Warteraum</strong>
            <div class="dev-empty-room">
              <i data-lucide="users-round"></i>
              <span>Noch keine Teilnehmer</span>
            </div>
            <div class="dev-room-tags">
              <span>Swipe</span>
              <span>Essen</span>
              <span>QR</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}

function renderContinueRoom(lobby, lang) {
  const round = getActiveRound(lobby);
  const status = round
    ? round.status === "voting"
      ? `${t(lang, "live")}: ${round.title}`
      : `${t(lang, "lastPick")}: ${round.result?.winnerLabel ?? round.title}`
    : t(lang, "peopleJoined", { count: lobby.participants.length });

  return `
    <div class="continue-room-strip">
      <i data-lucide="${round?.status === "voting" ? "radio" : "users-round"}"></i>
      <span>
        <strong>${escapeHTML(t(lang, "room"))} ${escapeHTML(lobby.code)}</strong>
        <small>${escapeHTML(status)}</small>
      </span>
      <button class="secondary-action" type="button" data-action="navigate" data-view="room">
        <i data-lucide="arrow-right"></i>
        <span>${escapeHTML(t(lang, "open"))}</span>
      </button>
    </div>
  `;
}

function getPlannedRound(lobby) {
  const round = getActiveRound(lobby);
  return round?.status === "voting" ? round : lobby?.plannedRound ?? null;
}

function renderJoinRoomPreview(lobby, lang) {
  const plannedRound = getPlannedRound(lobby);

  if (!plannedRound) {
    return "";
  }

  return `
    <div class="join-room-preview">
      <span class="eyebrow">ROOM ${escapeHTML(lobby.code)}</span>
      <strong>${escapeHTML(plannedRound.title)}</strong>
      <small>${escapeHTML(categoryLabel(plannedRound.category, lang))} · ${escapeHTML(modeLabel(plannedRound.mode, lang))}</small>
    </div>
  `;
}

// === Raum erstellen ===

export function renderCreate(state) {
  const lang = state.settings.language;

  return `
    <section class="center-panel page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "createEyebrow"))}</span>
        <h1>${escapeHTML(t(lang, "voteSetup"))}</h1>
        <p>${escapeHTML(t(lang, "voteSetupCopy"))}</p>
      </div>
      <form class="form-panel" data-form="create-room">
        <div class="split-fields">
          <label>
            <span>${escapeHTML(t(lang, "category"))}</span>
            <select name="category" data-composer-field="category">
              ${CATEGORIES.map((category) => `<option value="${escapeHTML(category)}" ${category === state.composer.category ? "selected" : ""}>${escapeHTML(categoryLabel(category, lang))}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>${escapeHTML(t(lang, "gameMode"))}</span>
            <select name="mode" data-composer-field="mode">
              ${MODES.map((mode) => `<option value="${escapeHTML(mode.id)}" ${mode.id === state.composer.mode ? "selected" : ""}>${escapeHTML(modeLabel(mode.id, lang))}</option>`).join("")}
            </select>
          </label>
        </div>
        <label>
          <span>${escapeHTML(t(lang, "question"))}</span>
          <input name="title" maxlength="80" data-composer-field="title" value="${escapeHTML(state.composer.title)}" placeholder="${escapeHTML(lang === "de" ? "Was essen wir heute?" : "What should we eat tonight?")}" required />
        </label>
        <label>
          <span>${escapeHTML(t(lang, "nickname"))}</span>
          <input name="nickname" maxlength="20" autocomplete="nickname" value="${escapeHTML(state.settings.lastNickname)}" placeholder="Max" required />
        </label>
        <label>
          <span>${escapeHTML(t(lang, "hostIdeas"))}</span>
          <textarea name="ideas" maxlength="390" rows="3" placeholder="Sushi&#10;Pizza&#10;Pasta"></textarea>
        </label>
        <button class="primary-action full" type="submit">
          <i data-lucide="sparkles"></i>
          <span>${escapeHTML(t(lang, "createRoom"))}</span>
        </button>
      </form>
      <div class="trust-row">
        <span><i data-lucide="timer-reset"></i>${escapeHTML(t(lang, "temporary"))}</span>
        <span><i data-lucide="mail-x"></i>${escapeHTML(t(lang, "noEmail"))}</span>
        <span><i data-lucide="lock-keyhole"></i>${escapeHTML(t(lang, "noProfile"))}</span>
      </div>
    </section>
  `;
}

// === Raum beitreten ===

export function renderJoin(state) {
  const lang = state.settings.language;
  const plannedRound = getPlannedRound(state.joinPreviewLobby);
  const needsOptions = MODES.find((item) => item.id === plannedRound?.mode)?.needsOptions ?? true;

  return `
    <section class="center-panel page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "joinEyebrow"))}</span>
        <h1>${escapeHTML(t(lang, "joinHeadline"))}</h1>
      </div>
      ${renderJoinRoomPreview(state.joinPreviewLobby, lang)}
      <form class="form-panel" data-form="join-room">
        <label>
          <span>${escapeHTML(t(lang, "lobbyCode"))}</span>
          <input class="code-input" name="code" maxlength="6" autocapitalize="characters" value="${escapeHTML(state.routeCode)}" placeholder="7KFX2P" required />
        </label>
        <label>
          <span>${escapeHTML(t(lang, "nickname"))}</span>
          <input name="nickname" maxlength="20" autocomplete="nickname" value="${escapeHTML(state.settings.lastNickname)}" placeholder="Anna" required />
        </label>
        ${
          needsOptions
            ? `
              <label>
                <span>${escapeHTML(t(lang, "yourIdeas"))}</span>
                <textarea name="ideas" maxlength="390" rows="3" placeholder="Sushi&#10;Bowling&#10;Interstellar" required></textarea>
              </label>
            `
            : `<p class="waiting-copy">${escapeHTML(t(lang, "noIdeasNeededCopy"))}</p>`
        }
        <button class="primary-action full" type="submit">
          <i data-lucide="circle-check"></i>
          <span>${escapeHTML(t(lang, "readyAndJoin"))}</span>
        </button>
      </form>
      ${state.error ? renderInlineError(state.error) : ""}
    </section>
  `;
}

function renderInlineError(message) {
  return `<div class="inline-error"><i data-lucide="circle-alert"></i>${escapeHTML(message)}</div>`;
}
