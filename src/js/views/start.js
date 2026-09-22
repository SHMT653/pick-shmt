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
  const demoCopy =
    lang === "de"
      ? {
          badge: "Demo-Zwischenstand",
          eyebrow: "Vercel + Supabase Integration",
          headline: "Pickr wird gerade als Live-Prototyp aufgebaut.",
          copy:
            "Der aktuelle Stand zeigt den geplanten Ablauf und die technische Basis. Wir testen im Moment besonders Deployment, Datenbank-Sync und den Mehrpersonen-Flow.",
          create: "Demo-Raum anlegen",
          join: "Join-Flow testen",
          quick: "Lokalen Quick Pick testen",
          codeLabel: "Test mit vorhandenem Raumcode",
          boardTitle: "Aktueller Fokus",
          boardSubtitle: "Kein finales Produkt, sondern ein laufender Entwicklungsstand.",
          statusTitle: "Build-Status",
          statusText: "Vercel Preview/Production wird genutzt, um Änderungen schnell online zu prüfen.",
          dataTitle: "Datenbank",
          dataText: "Supabase speichert Räume, Teilnehmer und Ideen. Live-Sync und Fehlerfälle werden gerade optimiert.",
          flowTitle: "Lobby-Flow",
          flowText: "Host legt Thema und Modus fest, Gäste bringen eigene Vorschläge ein und warten auf den Start.",
          nextTitle: "Nächste Schritte",
          nextItems: ["Realtime stabilisieren", "Mobile Join-Flow glätten", "Datenmodell final prüfen"],
        }
      : {
          badge: "Demo checkpoint",
          eyebrow: "Vercel + Supabase integration",
          headline: "Pickr is being shaped as a live prototype.",
          copy:
            "This build shows the intended flow and the technical foundation. Right now we are testing deployment, database sync, and the multi-user room flow.",
          create: "Create demo room",
          join: "Test join flow",
          quick: "Try local quick pick",
          codeLabel: "Test with an existing room code",
          boardTitle: "Current focus",
          boardSubtitle: "Not a final product yet, but an active development checkpoint.",
          statusTitle: "Build status",
          statusText: "Vercel Preview/Production is used to validate changes online quickly.",
          dataTitle: "Database",
          dataText: "Supabase stores rooms, participants, and ideas. Live sync and edge cases are being refined.",
          flowTitle: "Lobby flow",
          flowText: "The host defines topic and mode, guests contribute ideas, then wait for the start.",
          nextTitle: "Next steps",
          nextItems: ["Stabilize realtime sync", "Polish mobile join flow", "Review final data model"],
        };

  return `
    <section class="home-grid page-enter">
      <div class="home-copy">
        ${renderBrandLockup("hero-lockup")}
        ${state.lobby ? renderContinueRoom(state.lobby, lang) : ""}
        <span class="demo-badge"><i data-lucide="flask-conical"></i>${escapeHTML(demoCopy.badge)}</span>
        <div class="prototype-headline">
          <span class="eyebrow">${escapeHTML(demoCopy.eyebrow)}</span>
          <h1>${escapeHTML(demoCopy.headline)}</h1>
          <p>${escapeHTML(demoCopy.copy)}</p>
        </div>
        <div class="hero-actions">
          <button class="primary-action" type="button" data-action="navigate" data-view="create">
            <i data-lucide="plus"></i>
            <span>${escapeHTML(demoCopy.create)}</span>
          </button>
          <button class="secondary-action" type="button" data-action="navigate" data-view="join">
            <i data-lucide="log-in"></i>
            <span>${escapeHTML(demoCopy.join)}</span>
          </button>
        </div>
        <form class="home-code-join" data-form="home-join">
          <label>
            <span>${escapeHTML(demoCopy.codeLabel)}</span>
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
          <span>${escapeHTML(demoCopy.quick)}</span>
        </button>
      </div>

      <div class="product-preview prototype-board" aria-label="Pickr prototype status">
        <div class="prototype-board-head">
          <span class="eyebrow">${escapeHTML(demoCopy.boardTitle)}</span>
          <p>${escapeHTML(demoCopy.boardSubtitle)}</p>
        </div>
        <div class="prototype-card is-live">
          <span><i data-lucide="triangle"></i> Vercel</span>
          <strong>${escapeHTML(demoCopy.statusTitle)}</strong>
          <p>${escapeHTML(demoCopy.statusText)}</p>
        </div>
        <div class="prototype-card">
          <span><i data-lucide="database"></i> Supabase</span>
          <strong>${escapeHTML(demoCopy.dataTitle)}</strong>
          <p>${escapeHTML(demoCopy.dataText)}</p>
        </div>
        <div class="prototype-card">
          <span><i data-lucide="users-round"></i> Multiplayer</span>
          <strong>${escapeHTML(demoCopy.flowTitle)}</strong>
          <p>${escapeHTML(demoCopy.flowText)}</p>
        </div>
        <div class="prototype-next">
          <strong>${escapeHTML(demoCopy.nextTitle)}</strong>
          <ul>
            ${demoCopy.nextItems.map((item) => `<li><i data-lucide="loader-circle"></i>${escapeHTML(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="prototype-footer">
          <span>pickr-shmt.vercel.app</span>
          <span>Supabase schema in review</span>
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
