// App-Rahmen (Header, Bottom-Nav, Toast, gemeinsame Label-Helfer) und Router
// für die UI: baut die App-Hülle und entscheidet anhand von state.view,
// welcher Screen aus views/ gerendert wird.
import { t } from "./i18n.js";
import { escapeHTML } from "./utils.js";
import { renderHome, renderCreate, renderJoin, renderIntro, renderDevDemo } from "./views/start.js";
import { renderRoom } from "./views/room.js";
import { renderDecision } from "./views/decision.js";
import { renderHistory } from "./views/history.js";
import { renderSettings } from "./views/settings.js";
import { renderQuickPick } from "./views/quick-pick.js";

// === App-Rahmen: Header, Navigation, Toast ===

export function renderHeader(state) {
  if (state.view === "intro" || state.view === "dev") {
    return "";
  }

  const room = state.lobby ? `<span class="room-chip">ROOM ${escapeHTML(state.lobby.code)}</span>` : "";
  const lang = state.settings.language;

  return `
    <header class="topbar">
      <button class="brand-button" type="button" data-action="navigate" data-view="home" aria-label="Pickr home">
        ${renderPickrMark("brand-mark-small")}
        <span>Pickr</span>
      </button>
      <nav class="desktop-nav" aria-label="Main navigation">
        ${navButton("home", t(lang, "navHome"), "home", state.view)}
        ${navButton("room", t(lang, "navRoom"), "users-round", state.view, !state.lobby)}
        ${navButton("history", t(lang, "navHistory"), "history", state.view)}
        ${navButton("settings", t(lang, "navSettings"), "settings", state.view)}
      </nav>
      <div class="top-status">
        <button class="dev-access" type="button" data-action="navigate" data-view="dev" aria-label="Development notes"></button>
        ${room}
        <a class="legal-link" href="/impressum.html">${escapeHTML(t(lang, "imprint"))}</a>
        <a class="legal-link" href="/datenschutz.html">${escapeHTML(t(lang, "privacy"))}</a>
      </div>
    </header>
  `;
}

export function renderBottomNav(state) {
  const lang = state.settings.language;

  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      ${navButton("home", t(lang, "navHome"), "home", state.view)}
      ${navButton("room", t(lang, "navRoom"), "users-round", state.view, !state.lobby)}
      ${navButton("history", t(lang, "navHistory"), "history", state.view)}
      ${navButton("settings", t(lang, "navSettings"), "settings", state.view)}
    </nav>
  `;
}

function navButton(view, label, icon, activeView, disabled = false) {
  return `
    <button
      class="nav-item ${activeView === view ? "is-active" : ""}"
      type="button"
      data-action="navigate"
      data-view="${view}"
      ${disabled ? "disabled" : ""}
    >
      <i data-lucide="${icon}"></i>
      <span>${label}</span>
    </button>
  `;
}

export function renderToast(toast) {
  if (!toast) {
    return "";
  }

  return `<div class="toast ${toast.type ?? ""}">${escapeHTML(toast.message)}</div>`;
}

export function renderBrandLockup(className = "") {
  return `
    <div class="brand-lockup ${className}">
      ${renderPickrMark("brand-mark-large")}
      <span>Pickr</span>
    </div>
  `;
}

export function renderPickrMark(className = "") {
  return `
    <span class="pickr-mark ${className}" aria-hidden="true">
      <span class="mark-card mark-card-back"></span>
      <span class="mark-card mark-card-front"><i data-lucide="check"></i></span>
    </span>
  `;
}

export function renderMissingRoom(state) {
  const lang = state.settings.language;

  return `
    <section class="center-panel page-enter">
      <div class="empty-state">
        <i data-lucide="circle-alert"></i>
        <strong>${escapeHTML(state.error || t(lang, "errorRoomNotFound"))}</strong>
        <span>${escapeHTML(t(lang, "missingRoomCopy"))}</span>
      </div>
      <div class="button-row">
        <button class="primary-action" type="button" data-action="navigate" data-view="create"><i data-lucide="plus"></i><span>${escapeHTML(t(lang, "createRoom"))}</span></button>
        <button class="secondary-action" type="button" data-action="navigate" data-view="join"><i data-lucide="log-in"></i><span>${escapeHTML(t(lang, "joinRoom"))}</span></button>
      </div>
    </section>
  `;
}

export function modeLabel(mode, lang) {
  const labels = {
    en: {
      swipe: "Swipe",
      blind: "Blind Vote",
      wheel: "Random Wheel",
      battle: "Battle",
      whoPays: "Who Pays",
      fingerPick: "Finger Pick",
      tapRace: "Tap Race",
      random: "Random",
    },
    de: {
      swipe: "Swipe",
      blind: "Blind Vote",
      wheel: "Zufallsrad",
      battle: "Battle",
      whoPays: "Wer zahlt?",
      fingerPick: "Fingerwahl",
      tapRace: "Tap-Rennen",
      random: "Zufall",
    },
  };

  return labels[lang]?.[mode] ?? labels.en[mode] ?? mode;
}

export function categoryLabel(category, lang) {
  const labels = {
    de: {
      Food: "Essen",
      Movies: "Filme",
      Activities: "Aktivitäten",
      Travel: "Reisen",
      Games: "Spiele",
      Party: "Party",
      Shopping: "Shopping",
      "Who Pays": "Wer zahlt?",
      Custom: "Eigene Frage",
    },
  };

  return labels[lang]?.[category] ?? category;
}

export function variantLabel(variant, lang) {
  const labels = {
    de: {
      "Pays Everything": "Zahlt alles",
      "Pays Drinks": "Zahlt Getränke",
      "Pays Dessert": "Zahlt Dessert",
      "Lucky One Pays Nothing": "Glücksperson zahlt nichts",
    },
  };

  return labels[lang]?.[variant] ?? variant;
}

export function resultHeadline(result, lang) {
  const labels = {
    TIE: "tie",
    MATCH: "match",
    CHAMPION: "champion",
    "BAD LUCK": "badLuck",
    "THE GROUP HAS SPOKEN": "groupHasSpoken",
  };

  return t(lang, labels[result?.headline] ?? "", {}) || result?.headline;
}

export function wheelResultCopy(result, lang) {
  if (lang !== "de") {
    return result.copy;
  }

  return `${result.winnerLabel} wurde vom Rad gewählt.`;
}

// === UI-Router: App-Hülle und aktueller Screen ===

export function renderApp(state) {
  return `
    <div class="app-shell ${state.settings.theme === "dark" ? "theme-dark" : "theme-light"}">
      ${renderHeader(state)}
      <main class="view-shell">
        ${renderView(state)}
      </main>
      ${["decision", "intro", "dev"].includes(state.view) ? "" : renderBottomNav(state)}
      ${renderToast(state.toast)}
    </div>
  `;
}

export function renderView(state) {
  if (state.view === "intro") {
    return renderIntro(state);
  }

  if (state.view === "create") {
    return renderCreate(state);
  }

  if (state.view === "join") {
    return renderJoin(state);
  }

  if (state.view === "room") {
    return renderRoom(state);
  }

  if (state.view === "decision") {
    return renderDecision(state);
  }

  if (state.view === "history") {
    return renderHistory(state);
  }

  if (state.view === "settings") {
    return renderSettings(state);
  }

  if (state.view === "quick") {
    return renderQuickPick(state);
  }

  if (state.view === "dev") {
    return renderDevDemo(state);
  }

  return renderHome(state);
}
