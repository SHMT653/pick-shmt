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
  const lang = state.settings.language;
  const copy =
    lang === "de"
      ? {
          title: "Swipe. Pick. Done.",
          intro: "Der neue Start und der Raum-Flow werden gerade zusammengesetzt.",
          back: "zur echten App",
          stage: "laufender Aufbau",
          question: "Was essen wir heute?",
          host: "Host Setup wird verbunden",
          join: "Raum beitreten",
          sync: "Supabase Sync verbindet",
          deploy: "Vercel Build aktiv",
          room: "ROOM 7KFX2P",
          rough: "Preview und Production werden gerade abgeglichen.",
          broken: "Start-Button und QR-Box muessen noch ins finale Layout.",
          missing: "QR-Link, Realtime-Status und Fehlertexte sind noch offen.",
        }
      : {
          title: "Swipe. Pick. Done.",
          intro: "The new start and room flow are being assembled.",
          back: "back to the real app",
          stage: "work in progress",
          question: "What should we eat tonight?",
          host: "Host setup is being connected",
          join: "Join room",
          sync: "Supabase sync connecting",
          deploy: "Vercel build active",
          room: "ROOM 7KFX2P",
          rough: "Preview and Production are being aligned.",
          broken: "Start button and QR box still need their final layout.",
          missing: "QR link, realtime status, and error texts are still open.",
        };

  return `
    <section class="dev-demo page-enter">
      <button class="ghost-action dev-back" type="button" data-action="navigate" data-view="home">
        <i data-lucide="arrow-left"></i>
        <span>${escapeHTML(copy.back)}</span>
      </button>

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

        <div class="dev-builder-grid">
          <section class="dev-app-panel dev-main-panel">
            <div class="dev-panel-head">
              <span>${escapeHTML(copy.room)}</span>
              <strong>${escapeHTML(copy.question)}</strong>
            </div>
            <div class="dev-idea-pool">
              <span>Sushi <small>Anna</small></span>
              <span>Pizza <small>Paul</small></span>
              <span class="is-empty">...</span>
              <span>Bowling <small>Luca</small></span>
              <span class="is-dragged">Interstellar <small>Marie</small></span>
            </div>
            <div class="dev-action-row">
              <button class="primary-action" type="button"><i data-lucide="play"></i><span>Start Pick</span></button>
              <button class="secondary-action" type="button"><i data-lucide="qr-code"></i><span>QR Link</span></button>
            </div>
            <p class="dev-glitch-note">${escapeHTML(copy.broken)}</p>
          </section>

          <aside class="dev-app-panel dev-side-panel">
            <span class="eyebrow">Vercel</span>
            <strong>${escapeHTML(copy.deploy)}</strong>
            <div class="dev-progress"><span style="width: 72%"></span></div>
            <p>${escapeHTML(copy.rough)}</p>
          </aside>

          <aside class="dev-app-panel dev-side-panel is-offset">
            <span class="eyebrow">Supabase</span>
            <strong>${escapeHTML(copy.sync)}</strong>
            <div class="dev-progress warning"><span style="width: 44%"></span></div>
            <p>${escapeHTML(copy.missing)}</p>
          </aside>
        </div>

        <div class="dev-lower-row">
          <div class="dev-mini-phone">
            <span>${escapeHTML(copy.join)}</span>
            <input value="7KFX2P" readonly />
            <textarea readonly>Sushi&#10;Bowling&#10;...</textarea>
            <button class="primary-action" type="button">${escapeHTML(lang === "de" ? "Bereit & beitreten" : "Ready & join")}</button>
          </div>
          <div class="dev-floating-bug">
            <i data-lucide="wrench"></i>
            <span>${escapeHTML(copy.host)}</span>
          </div>
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

function renderJoinRoomPreview(lobby, lang) {
  const round = getActiveRound(lobby);
  const plannedRound = round?.status === "voting" ? round : lobby?.plannedRound;

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
        <label>
          <span>${escapeHTML(t(lang, "yourIdeas"))}</span>
          <textarea name="ideas" maxlength="390" rows="3" placeholder="Sushi&#10;Bowling&#10;Interstellar" required></textarea>
        </label>
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
