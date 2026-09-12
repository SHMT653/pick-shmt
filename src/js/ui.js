import { CATEGORIES, DEFAULT_OPTIONS_BY_CATEGORY, MODES, WHO_PAYS_VARIANTS } from "./config.js";
import { LANGUAGES, t } from "./i18n.js";
import { getSupabaseWarning } from "./supabase.js";
import {
  escapeHTML,
  formatDateLabel,
  getTimeLeftLabel,
  makeShareUrl,
  percent,
} from "./utils.js";
import {
  collectIdeaOptions,
  getBattlePair,
  getNextSwipeOption,
  getParticipantVote,
  getRoundProgress,
} from "./modes.js";
import { getActiveRound, isHost } from "./lobby.js";

export function renderApp(state) {
  return `
    <div class="app-shell ${state.settings.theme === "dark" ? "theme-dark" : "theme-light"}">
      ${renderHeader(state)}
      <main class="view-shell">
        ${renderView(state)}
      </main>
      <div class="shmt-signature" aria-label="SHMT">
        <img src="/assets/logo/shmt-mark.png" alt="SHMT" loading="lazy" decoding="async" />
      </div>
      ${state.view === "decision" ? "" : renderBottomNav(state)}
      ${renderToast(state.toast)}
    </div>
  `;
}

export function renderView(state) {
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

  return renderHome(state);
}

function renderHeader(state) {
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
        ${room}
      </div>
    </header>
  `;
}

function renderBottomNav(state) {
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

function renderHome(state) {
  const lang = state.settings.language;

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

      <div class="product-preview neo-logo-stage" aria-label="NEO by SHMT logo">
        <img src="/assets/hero/neo-logo-complete-v2.png?v=2" alt="NEO by SHMT" loading="eager" decoding="async" />
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

function renderCreate(state) {
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

function renderJoin(state) {
  const lang = state.settings.language;

  return `
    <section class="center-panel page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "joinEyebrow"))}</span>
        <h1>${escapeHTML(t(lang, "joinHeadline"))}</h1>
      </div>
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

function renderRoom(state) {
  const lobby = state.lobby;
  const participant = state.participant;
  const lang = state.settings.language;

  if (!lobby || !participant) {
    return renderMissingRoom(state);
  }

  const activeRound = getActiveRound(lobby);
  const host = isHost(participant);
  const readyCount = lobby.participants.filter((item) => item.isReady).length;

  return `
    <section class="room-layout page-enter">
      <div class="room-main">
        <div class="room-hero surface">
          <div>
            <span class="eyebrow">ROOM ${escapeHTML(lobby.code)}${lobby.isLocked ? ` · ${escapeHTML(t(lang, "locked"))}` : ""}</span>
            <h1>${escapeHTML(readyCount === lobby.participants.length ? t(lang, "everyoneReady") : t(lang, "shareYourRoom"))}</h1>
            <p>${escapeHTML(t(lang, "peopleJoined", { count: lobby.participants.length }))} · ${escapeHTML(getTimeLeftLabel(lobby))}${lobby.isLocked ? ` · ${escapeHTML(t(lang, "inviteClosedMeta"))}` : ""}</p>
          </div>
          <div class="room-actions">
            ${
              host
                ? `<button class="icon-action ${lobby.isLocked ? "is-active" : ""}" type="button" title="${escapeHTML(lobby.isLocked ? t(lang, "unlockRoom") : t(lang, "lockRoom"))}" data-action="toggle-lock"><i data-lucide="${lobby.isLocked ? "lock-keyhole" : "lock-keyhole-open"}"></i></button>`
                : ""
            }
            ${host ? `<button class="icon-action danger" type="button" title="${escapeHTML(t(lang, "closeRoom"))}" data-action="close-room"><i data-lucide="trash-2"></i></button>` : ""}
            <button class="icon-action" type="button" title="${escapeHTML(t(lang, "leaveRoom"))}" data-action="leave-room"><i data-lucide="log-out"></i></button>
          </div>
        </div>

        ${activeRound && activeRound.status === "voting" ? renderActiveRoundCallout(activeRound, lang) : ""}
        ${activeRound && (activeRound.status === "completed" || activeRound.status === "tie") ? renderLastResultCallout(activeRound, lang) : ""}
        ${renderYourIdeasPanel(state)}
        ${host ? renderRoundComposer(state) : renderParticipantWaitingPanel(state)}
      </div>

      <aside class="room-side">
        ${renderSharePanel(lobby, host, lang)}
        ${renderRoomSummary(lobby, lang)}
        ${renderParticipants(lobby, participant, lang)}
      </aside>
    </section>
  `;
}

function renderActiveRoundCallout(round, lang) {
  return `
    <div class="decision-callout">
      <div>
        <span class="eyebrow">${escapeHTML(t(lang, "livePick"))}</span>
        <strong>${escapeHTML(round.title)}</strong>
      </div>
      <button class="secondary-action" type="button" data-action="open-decision">
        <i data-lucide="play"></i>
        <span>${escapeHTML(t(lang, "letsPick"))}</span>
      </button>
    </div>
  `;
}

function renderLastResultCallout(round, lang) {
  return `
    <div class="decision-callout is-result">
      <div>
        <span class="eyebrow">${escapeHTML(resultHeadline(round.result, lang) ?? t(lang, "result"))}</span>
        <strong>${escapeHTML(round.result?.winnerLabel ?? t(lang, "decisionMade"))}</strong>
      </div>
      <button class="secondary-action" type="button" data-action="open-decision">
        <i data-lucide="trophy"></i>
        <span>${escapeHTML(t(lang, "result"))}</span>
      </button>
    </div>
  `;
}

function renderParticipantWaitingPanel(state) {
  const lang = state.settings.language;

  return `
    <section class="surface room-waiting">
      <span class="eyebrow">${escapeHTML(t(lang, "readySystem"))}</span>
      <h2>${escapeHTML(state.participant.isReady ? t(lang, "youAreReady") : t(lang, "readyWhenYouAre"))}</h2>
      <p>${escapeHTML(t(lang, "waitingParticipantCopy"))}</p>
      <button class="${state.participant.isReady ? "secondary-action" : "primary-action"} full" type="button" data-action="toggle-ready">
        <i data-lucide="${state.participant.isReady ? "circle-pause" : "circle-check"}"></i>
        <span>${escapeHTML(state.participant.isReady ? t(lang, "setNotReady") : t(lang, "setReady"))}</span>
      </button>
    </section>
  `;
}

function renderYourIdeasPanel(state) {
  const ideas = state.participant?.ideas ?? [];
  const lang = state.settings.language;

  return `
    <section class="surface own-ideas-panel">
      <div class="section-title">
        <div>
          <span class="eyebrow">${escapeHTML(t(lang, "yourIdeasTitle"))}</span>
          <h2>${ideas.length ? escapeHTML(t(lang, "inPool", { count: ideas.length })) : escapeHTML(t(lang, "addYourPicks"))}</h2>
        </div>
      </div>
      <form data-form="save-ideas">
        <label>
          <span>${escapeHTML(t(lang, "oneIdeaPerLine"))}</span>
          <textarea name="ideas" maxlength="390" rows="3" placeholder="Sushi&#10;Bowling&#10;Interstellar">${escapeHTML(ideas.join("\n"))}</textarea>
        </label>
        <button class="ghost-action full" type="submit">
          <i data-lucide="save"></i>
          <span>${escapeHTML(t(lang, "saveIdeas"))}</span>
        </button>
      </form>
    </section>
  `;
}

function renderSharePanel(lobby, host, lang) {
  const shareUrl = makeShareUrl(lobby.code);

  return `
    <section class="surface share-panel ${lobby.isLocked ? "is-locked" : ""}">
      <div class="section-title">
        <div>
          <span class="eyebrow">${escapeHTML(t(lang, "invite"))}</span>
          <h2>${lobby.isLocked ? escapeHTML(t(lang, "inviteClosed")) : escapeHTML(lobby.code)}</h2>
        </div>
        <button class="icon-action" type="button" title="${escapeHTML(t(lang, "copyCode"))}" data-action="copy-code" data-code="${escapeHTML(lobby.code)}">
          <i data-lucide="copy"></i>
        </button>
      </div>
      ${lobby.isLocked ? `<div class="locked-invite"><i data-lucide="lock-keyhole"></i><span>${escapeHTML(t(lang, "newPeopleCannotJoin"))}</span></div>` : `<canvas id="room-qr" width="180" height="180" aria-label="QR code for ${escapeHTML(shareUrl)}"></canvas>`}
      <div class="share-link">${escapeHTML(shareUrl)}</div>
      <div class="button-row">
        ${
          lobby.isLocked
            ? host
              ? `<button class="secondary-action" type="button" data-action="toggle-lock"><i data-lucide="lock-keyhole-open"></i><span>${escapeHTML(t(lang, "unlockInvite"))}</span></button>`
              : ""
            : `
              <button class="secondary-action" type="button" data-action="share-room" data-link="${escapeHTML(shareUrl)}">
                <i data-lucide="share-2"></i>
                <span>${escapeHTML(t(lang, "shareRoom"))}</span>
              </button>
              <button class="ghost-action" type="button" data-action="copy-link" data-link="${escapeHTML(shareUrl)}">
                <i data-lucide="link"></i>
                <span>${escapeHTML(t(lang, "copyLink"))}</span>
              </button>
            `
        }
        <button class="ghost-action" type="button" data-action="copy-code" data-code="${escapeHTML(lobby.code)}">
          <i data-lucide="copy"></i>
          <span>${escapeHTML(t(lang, "copyCode"))}</span>
        </button>
      </div>
    </section>
  `;
}

function renderRoomSummary(lobby, lang) {
  const readyCount = lobby.participants.filter((participant) => participant.isReady).length;
  const participantCount = lobby.participants.length;
  const ideas = collectIdeaOptions(lobby.participants);
  const lastRound = lobby.rounds.filter((round) => round.status !== "voting").at(-1);

  return `
    <section class="surface room-summary-panel">
      <div class="section-title">
        <div>
          <span class="eyebrow">${escapeHTML(t(lang, "summary"))}</span>
          <h2>${escapeHTML(readyCount === participantCount ? t(lang, "readyToPlay") : t(lang, "readyFraction", { ready: readyCount, total: participantCount }))}</h2>
        </div>
      </div>
      <div class="summary-stats">
        <div>
          <strong>${participantCount}</strong>
          <span>${escapeHTML(t(lang, "people"))}</span>
        </div>
        <div>
          <strong>${readyCount}</strong>
          <span>${escapeHTML(t(lang, "ready"))}</span>
        </div>
        <div>
          <strong>${ideas.length}</strong>
          <span>${escapeHTML(t(lang, "ideas"))}</span>
        </div>
      </div>
      <div class="summary-line">
        <i data-lucide="${lobby.isLocked ? "lock-keyhole" : "lock-keyhole-open"}"></i>
        <span>${escapeHTML(lobby.isLocked ? t(lang, "inviteIsClosed") : t(lang, "inviteIsOpen"))}</span>
      </div>
      ${ideas.length ? renderCompactIdeaList(ideas, lang) : `<div class="empty-mini">${escapeHTML(t(lang, "noIdeasYet"))}</div>`}
      ${lastRound ? `<div class="summary-line"><i data-lucide="trophy"></i><span>${escapeHTML(lastRound.result?.winnerLabel ?? t(lang, "lastRoundEnded"))}</span></div>` : ""}
    </section>
  `;
}

function renderParticipants(lobby, currentParticipant, lang) {
  return `
    <section class="surface participants-panel">
      <div class="section-title">
        <div>
          <span class="eyebrow">${escapeHTML(t(lang, "peopleJoined", { count: lobby.participants.length }))}</span>
          <h2>${escapeHTML(t(lang, "table"))}</h2>
        </div>
        ${isHost(currentParticipant) ? `<button class="icon-action" type="button" title="${escapeHTML(t(lang, "addDemoGroup"))}" data-action="add-demo-group"><i data-lucide="users-round"></i></button>` : ""}
      </div>
      <ul class="participant-list">
        ${lobby.participants
          .map(
            (participant) => `
              <li>
                <span class="avatar">${escapeHTML(participant.nickname.slice(0, 1).toUpperCase())}</span>
                <div>
                  <strong>${escapeHTML(participant.nickname)}</strong>
                  <small>${renderParticipantStatus(participant, lang)}</small>
                </div>
                <span class="ready-dot ${participant.isReady ? "is-ready" : ""}"></span>
                ${
                  isHost(currentParticipant) && !participant.isHost
                    ? `<button class="tiny-icon" type="button" title="${escapeHTML(t(lang, "remove"))}" data-action="remove-participant" data-participant-id="${participant.id}"><i data-lucide="x"></i></button>`
                    : ""
                }
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderParticipantStatus(participant, lang) {
  const role = participant.isHost ? t(lang, "host") : participant.isReady ? t(lang, "readyStatus") : t(lang, "waitingStatus");
  const ideaCount = participant.ideas?.length ?? 0;
  return `${role} · ${ideaCount} ${t(lang, ideaCount === 1 ? "ideaSingular" : "ideaPlural")}`;
}

function renderRoundComposer(state) {
  const composer = state.composer;
  const mode = MODES.find((item) => item.id === composer.mode) ?? MODES[0];
  const needsOptions = mode.needsOptions;
  const ideaPool = collectIdeaOptions(state.lobby.participants);
  const allReady = state.lobby.participants.every((participant) => participant.isReady);
  const hasEnoughIdeas = !needsOptions || ideaPool.length >= 2;
  const canStart = allReady && hasEnoughIdeas;
  const lang = state.settings.language;
  const note = getComposerNote({ allReady, hasEnoughIdeas, ideaCount: ideaPool.length, needsOptions, lang });

  return `
    <section class="surface composer-panel">
      <div class="section-title">
        <div>
          <span class="eyebrow">${escapeHTML(t(lang, "startPick"))}</span>
          <h2>${escapeHTML(t(lang, "questionAndMode"))}</h2>
        </div>
      </div>
      <form data-form="start-round">
        <div class="split-fields">
          <label>
            <span>${escapeHTML(t(lang, "category"))}</span>
            <select name="category" data-composer-field="category">
              ${CATEGORIES.map((category) => `<option value="${escapeHTML(category)}" ${category === composer.category ? "selected" : ""}>${escapeHTML(categoryLabel(category, lang))}</option>`).join("")}
            </select>
          </label>
          <label>
            <div class="field-heading">
              <span>${escapeHTML(t(lang, "question"))}</span>
              <button class="tiny-icon" type="button" title="${escapeHTML(t(lang, "shuffleQuestion"))}" data-action="shuffle-question">
                <i data-lucide="shuffle"></i>
              </button>
            </div>
            <input name="title" maxlength="80" data-composer-field="title" value="${escapeHTML(composer.title)}" placeholder="${escapeHTML(lang === "de" ? "Was essen wir heute?" : "What should we eat tonight?")}" />
          </label>
        </div>

        <div class="mode-grid" role="list" aria-label="${escapeHTML(t(lang, "questionAndMode"))}">
          ${MODES.map(
            (item) => `
              <button class="mode-tile ${item.id === composer.mode ? "is-selected" : ""}" type="button" data-action="select-mode" data-mode="${item.id}">
                <i data-lucide="${item.icon}"></i>
                <span>${escapeHTML(modeLabel(item.id, lang))}</span>
              </button>
            `,
          ).join("")}
        </div>

        ${
          needsOptions
            ? `
              ${renderIdeaPreview(ideaPool)}
            `
            : `
              <label>
                <span>${escapeHTML(t(lang, "variant"))}</span>
                <select name="variant" data-composer-field="variant">
                  ${WHO_PAYS_VARIANTS.map((variant) => `<option ${variant === composer.variant ? "selected" : ""}>${escapeHTML(variantLabel(variant, lang))}</option>`).join("")}
                </select>
              </label>
            `
        }

        <div class="composer-note ${canStart ? "" : "needs-ideas"}">
          <i data-lucide="${canStart ? "list-checks" : "circle-alert"}"></i>
          <span>${escapeHTML(note)}</span>
        </div>

        <button class="primary-action full" type="submit" ${canStart ? "" : "disabled"}>
          <i data-lucide="play"></i>
          <span>${escapeHTML(t(lang, "startPickButton"))}</span>
        </button>
      </form>
    </section>
  `;
}

function renderIdeaPreview(ideas) {
  return `
    <div class="composer-idea-preview">
      ${ideas
        .slice(0, 6)
        .map((idea) => `<span>${escapeHTML(idea.title)}</span>`)
        .join("")}
    </div>
  `;
}

function renderCompactIdeaList(ideas, lang) {
  return `
    <div class="compact-ideas" aria-label="${escapeHTML(t(lang, "ideas"))}">
      ${ideas
        .slice(0, 5)
        .map(
          (idea) => `<span>${escapeHTML(idea.title)}</span>`,
        )
        .join("")}
      ${ideas.length > 5 ? `<small>+${ideas.length - 5}</small>` : ""}
    </div>
  `;
}

function getComposerNote({ allReady, hasEnoughIdeas, ideaCount, needsOptions, lang }) {
  if (!hasEnoughIdeas) {
    return t(lang, "needTwoIdeas");
  }

  if (!allReady) {
    return t(lang, "waitingUntilReady");
  }

  return needsOptions ? t(lang, "ideasWillBeUsed", { count: ideaCount }) : t(lang, "everyoneReady");
}

function renderDecision(state) {
  const lobby = state.lobby;
  const round = getActiveRound(lobby);
  const participant = state.participant;
  const lang = state.settings.language;

  if (!lobby || !round || !participant) {
    return renderMissingRoom(state);
  }

  if ((round.status === "completed" || round.status === "tie") && state.spinning?.roundId !== round.id) {
    return renderResult(state, round);
  }

  const progress = getRoundProgress(round, lobby.participants);

  return `
    <section class="decision-screen page-enter">
      <div class="decision-top">
        <button class="icon-action" type="button" title="${escapeHTML(t(lang, "backToRoom"))}" data-action="back-room">
          <i data-lucide="chevron-left"></i>
        </button>
        <div>
          <span class="eyebrow">ROOM ${escapeHTML(lobby.code)} · ${escapeHTML(categoryLabel(round.category, lang))}</span>
          <h1>${escapeHTML(round.title)}</h1>
        </div>
        <span class="progress-chip">${escapeHTML(progressLabel(progress, lang))}</span>
      </div>
      ${renderModeDecision(state, round)}
    </section>
  `;
}

function renderModeDecision(state, round) {
  if (round.mode === "swipe") {
    return renderSwipeMode(state, round);
  }

  if (round.mode === "blind") {
    return renderBlindVoteMode(state, round);
  }

  if (round.mode === "wheel") {
    return renderWheelMode(state, round);
  }

  if (round.mode === "battle") {
    return renderBattleMode(state, round);
  }

  return renderWhoPaysMode(state, round);
}

function optionSourceLabel(option, lang) {
  return option?.createdByName ? t(lang, "suggestedBy", { name: option.createdByName }) : t(lang, "pickrOption");
}

function renderSwipeMode(state, round) {
  const nextOption = getNextSwipeOption(round, state.participant.id);
  const lang = state.settings.language;

  if (!nextOption) {
    return renderWaitingForGroup(state, round);
  }

  const currentIndex = round.options.findIndex((option) => option.id === nextOption.id) + 1;

  return `
    <div class="swipe-stage">
      <div class="swipe-stack">
        <article class="swipe-card" data-swipe-card data-option-id="${nextOption.id}">
          <span>${currentIndex} / ${round.options.length}</span>
          <h2>${escapeHTML(nextOption.title)}</h2>
          <small>${escapeHTML(optionSourceLabel(nextOption, lang))}</small>
        </article>
      </div>
      <div class="swipe-controls">
        <button class="round-action dislike" type="button" title="${escapeHTML(t(lang, "no"))}" data-action="swipe-vote" data-option-id="${nextOption.id}" data-vote="no">
          <i data-lucide="x"></i>
        </button>
        <button class="round-action like" type="button" title="${escapeHTML(t(lang, "yes"))}" data-action="swipe-vote" data-option-id="${nextOption.id}" data-vote="yes">
          <i data-lucide="heart"></i>
        </button>
      </div>
    </div>
  `;
}

function renderBlindVoteMode(state, round) {
  const vote = getParticipantVote(round, state.participant.id);
  const lang = state.settings.language;

  if (vote) {
    return renderWaitingForGroup(state, round);
  }

  return `
    <div class="choice-grid">
      ${round.options
        .map(
          (option) => `
            <button class="choice-card" type="button" data-action="blind-vote" data-option-id="${option.id}">
              <i data-lucide="check"></i>
              <span>
                <strong>${escapeHTML(option.title)}</strong>
                <small>${escapeHTML(optionSourceLabel(option, lang))}</small>
              </span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderWheelMode(state, round) {
  const spinning = state.spinning?.roundId === round.id;
  const lang = state.settings.language;

  return `
    <div class="wheel-layout">
      <div class="wheel-wrap">
        <div class="wheel-pointer"></div>
        <div class="pickr-wheel ${spinning ? "is-revealing" : ""}" style="${wheelStyle(round.options, round.wheel?.rotation ?? 0)}"></div>
      </div>
      <div class="wheel-list">
        ${round.options.map((option, index) => `<span><b>${index + 1}</b><em>${escapeHTML(option.title)}<small>${escapeHTML(optionSourceLabel(option, lang))}</small></em></span>`).join("")}
      </div>
      ${
        isHost(state.participant)
          ? `<button class="primary-action full" type="button" data-action="spin-wheel" ${spinning ? "disabled" : ""}>
              <i data-lucide="rotate-cw"></i>
              <span>${escapeHTML(spinning ? t(lang, "spinning") : t(lang, "spin"))}</span>
            </button>`
          : `<p class="waiting-copy">${escapeHTML(t(lang, "waitingForHost"))}</p>`
      }
    </div>
  `;
}

function renderBattleMode(state, round) {
  const pair = getBattlePair(round);
  const vote = round.battle.duelVotes.find((item) => item.participantId === state.participant.id);
  const lang = state.settings.language;

  if (vote) {
    return renderWaitingForGroup(state, round);
  }

  return `
    <div class="battle-stage">
      <button class="battle-card" type="button" data-action="battle-vote" data-option-id="${pair[0]?.id}">
        <span>${escapeHTML(t(lang, "champion"))}</span>
        <strong>${escapeHTML(pair[0]?.title ?? "")}</strong>
        <small>${escapeHTML(optionSourceLabel(pair[0], lang))}</small>
      </button>
      <div class="versus">VS</div>
      <button class="battle-card" type="button" data-action="battle-vote" data-option-id="${pair[1]?.id}">
        <span>${escapeHTML(t(lang, "challenger"))}</span>
        <strong>${escapeHTML(pair[1]?.title ?? "")}</strong>
        <small>${escapeHTML(optionSourceLabel(pair[1], lang))}</small>
      </button>
    </div>
  `;
}

function renderWhoPaysMode(state, round) {
  const spinning = state.spinning?.roundId === round.id;
  const lang = state.settings.language;

  return `
    <div class="payer-stage">
      <div class="payer-wheel ${spinning ? "is-revealing" : ""}" style="${payerWheelStyle(state.lobby.participants, round.whoPays?.rotation ?? 0)}">
        ${state.lobby.participants
          .map((participant, index) => `<span style="--label-angle: ${(360 / state.lobby.participants.length) * index}deg">${escapeHTML(participant.nickname.slice(0, 2).toUpperCase())}</span>`)
          .join("")}
      </div>
      ${
        isHost(state.participant)
          ? `
            <label class="variant-select">
              <span>${escapeHTML(t(lang, "variant"))}</span>
              <select data-who-pays-variant>
                ${WHO_PAYS_VARIANTS.map((variant) => `<option value="${escapeHTML(variant)}" ${variant === round.whoPays?.variant ? "selected" : ""}>${escapeHTML(variantLabel(variant, lang))}</option>`).join("")}
              </select>
            </label>
            <button class="primary-action full" type="button" data-action="run-who-pays" ${spinning ? "disabled" : ""}>
              <i data-lucide="wallet-cards"></i>
              <span>${escapeHTML(spinning ? t(lang, "picking") : t(lang, "whoPaysButton"))}</span>
            </button>
          `
          : `<p class="waiting-copy">${escapeHTML(t(lang, "waitingForHost"))}</p>`
      }
    </div>
  `;
}

function renderWaitingForGroup(state, round) {
  const progress = getRoundProgress(round, state.lobby.participants);
  const waiting = getWaitingParticipants(round, state.lobby.participants);
  const width = percent(progress.finished, progress.total);
  const lang = state.settings.language;

  return `
    <div class="waiting-panel">
      <span class="eyebrow">${escapeHTML(t(lang, "waitingState"))}</span>
      <h2>${escapeHTML(progressLabel(progress, lang))}</h2>
      <div class="meter">
        <span style="width: ${width}%"></span>
      </div>
      ${
        waiting.length
          ? `<div class="waiting-people">
              ${waiting
                .map(
                  (participant) => `
                    <span>
                      <b>${escapeHTML(participant.nickname.slice(0, 1).toUpperCase())}</b>
                      ${escapeHTML(participant.nickname)}
                    </span>
                  `,
                )
                .join("")}
            </div>`
          : ""
      }
      ${
        isHost(state.participant) && progress.finished < progress.total
          ? `<button class="ghost-action" type="button" data-action="simulate-votes">
              <i data-lucide="fast-forward"></i>
              <span>${escapeHTML(t(lang, "runTableVotes"))}</span>
            </button>`
          : ""
      }
    </div>
  `;
}

function getWaitingParticipants(round, participants) {
  if (round.mode === "swipe") {
    return participants.filter((participant) =>
      round.options.some((option) =>
        !round.votes.some(
          (vote) => vote.participantId === participant.id && vote.optionId === option.id,
        ),
      ),
    );
  }

  if (round.mode === "blind") {
    const voters = new Set(round.votes.map((vote) => vote.participantId));
    return participants.filter((participant) => !voters.has(participant.id));
  }

  if (round.mode === "battle") {
    const voters = new Set(round.battle?.duelVotes?.map((vote) => vote.participantId) ?? []);
    return participants.filter((participant) => !voters.has(participant.id));
  }

  return [];
}

function renderResult(state, round) {
  const result = round.result;
  const isTie = round.status === "tie";
  const lang = state.settings.language;
  const resultMeta = result.type === "payer"
    ? payerResultCopy(result, lang)
    : result.type === "wheel"
      ? wheelResultCopy(result, lang)
      : `${result.agreed} / ${result.total} ${round.mode === "swipe" ? t(lang, "pickedIt") : t(lang, "agreed")}`;
  const shareText = t(lang, "pickrDecided", { winner: result.winnerLabel, title: round.title });

  return `
    <section class="result-screen page-enter">
      <div class="celebration" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <span class="result-kicker">${escapeHTML(isTie ? t(lang, "tie") : resultHeadline(result, lang))}</span>
      <h1>${escapeHTML(result.winnerLabel)}</h1>
      <p>${escapeHTML(resultMeta)}</p>
      <div class="consensus-block">
        <div>
          <strong>${result.agreementPercent}%</strong>
          <span>${escapeHTML(consensusLabel(result.consensus, lang))}</span>
        </div>
        <div class="meter">
          <span style="width: ${result.agreementPercent}%"></span>
        </div>
      </div>
      ${result.counts ? renderScoreList(result.counts) : ""}
      <div class="result-actions">
        ${
          isHost(state.participant) && isTie
            ? `<button class="primary-action" type="button" data-action="sudden-death"><i data-lucide="swords"></i><span>${escapeHTML(t(lang, "suddenDeath"))}</span></button>`
            : ""
        }
        ${
          isHost(state.participant) && !isTie && ["swipe", "blind", "battle"].includes(round.mode)
            ? `<button class="secondary-action" type="button" data-action="rematch"><i data-lucide="repeat-2"></i><span>${escapeHTML(t(lang, "rematch"))}</span></button>`
            : ""
        }
        ${isHost(state.participant) ? `<button class="primary-action" type="button" data-action="new-pick"><i data-lucide="plus"></i><span>${escapeHTML(t(lang, "newPick"))}</span></button>` : ""}
        <button class="ghost-action" type="button" data-action="copy-result" data-result="${escapeHTML(shareText)}"><i data-lucide="copy"></i><span>${escapeHTML(t(lang, "copyResult"))}</span></button>
        <button class="ghost-action" type="button" data-action="back-room"><i data-lucide="users-round"></i><span>${escapeHTML(t(lang, "room"))}</span></button>
      </div>
    </section>
  `;
}

function renderScoreList(counts) {
  const max = Math.max(...counts.map((item) => item.score), 1);

  return `
    <div class="score-list">
      ${counts
        .map(
          (item) => `
            <div>
              <span>${escapeHTML(item.option.title)}</span>
              <strong>${item.score}</strong>
              <em style="width: ${(item.score / max) * 100}%"></em>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderHistory(state) {
  const lang = state.settings.language;

  return `
    <section class="list-page page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "recentPicks"))}</span>
        <h1>${escapeHTML(t(lang, "localHistory"))}</h1>
      </div>
      ${
        state.history.length
          ? `<div class="history-list">
              ${state.history
                .map(
                  (item) => `
                    <article class="history-item">
                      <span>${escapeHTML(formatDateLabel(item.createdAt))}</span>
                      <strong>${escapeHTML(item.winner)}</strong>
                      <small>${escapeHTML(item.roomCode)} · ${escapeHTML(item.mode)}</small>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : `<div class="empty-state"><i data-lucide="history"></i><strong>${escapeHTML(t(lang, "noPicksYet"))}</strong><span>${escapeHTML(t(lang, "recentStayLocal"))}</span></div>`
      }
      ${state.history.length ? `<button class="ghost-action" type="button" data-action="clear-history"><i data-lucide="trash"></i><span>${escapeHTML(t(lang, "clearHistory"))}</span></button>` : ""}
    </section>
  `;
}

function renderSettings(state) {
  const warning = getSupabaseWarning();
  const lang = state.settings.language;

  return `
    <section class="settings-page page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "settings"))}</span>
        <h1>Swipe. Pick. Done.</h1>
      </div>
      <div class="settings-grid">
        <section class="surface">
          <div class="setting-row">
            <div>
              <strong>${escapeHTML(t(lang, "language"))}</strong>
              <span>${escapeHTML(t(lang, "languageCopy"))}</span>
            </div>
            <div class="language-switch" role="group" aria-label="${escapeHTML(t(lang, "language"))}">
              ${LANGUAGES.map(
                (language) => `
                  <button class="${state.settings.language === language.id ? "is-active" : ""}" type="button" data-action="set-language" data-language="${language.id}">
                    ${escapeHTML(language.shortLabel)}
                  </button>
                `,
              ).join("")}
            </div>
          </div>
          <div class="setting-row">
            <div>
              <strong>${escapeHTML(t(lang, "darkMode"))}</strong>
              <span>${escapeHTML(t(lang, "darkModeCopy"))}</span>
            </div>
            <button class="toggle ${state.settings.theme === "dark" ? "is-on" : ""}" type="button" data-action="toggle-theme" aria-label="${escapeHTML(t(lang, "toggleDarkMode"))}">
              <span></span>
            </button>
          </div>
          <div class="setting-row">
            <div>
              <strong>${escapeHTML(t(lang, "reducedMotion"))}</strong>
              <span>${escapeHTML(t(lang, "reducedMotionCopy"))}</span>
            </div>
            <button class="toggle ${state.settings.reduceMotion ? "is-on" : ""}" type="button" data-action="toggle-motion" aria-label="${escapeHTML(t(lang, "toggleReducedMotion"))}">
              <span></span>
            </button>
          </div>
          <button class="ghost-action full" type="button" data-action="clear-local-data">
            <i data-lucide="eraser"></i>
            <span>${escapeHTML(t(lang, "clearLocalData"))}</span>
          </button>
        </section>

        <section class="surface privacy-panel">
          <span class="eyebrow">${escapeHTML(t(lang, "privacy"))}</span>
          <h2>${escapeHTML(t(lang, "privacyHeadline"))}</h2>
          <ul>
            <li>${escapeHTML(t(lang, "privacyOne"))}</li>
            <li>${escapeHTML(t(lang, "privacyTwo"))}</li>
            <li>${escapeHTML(t(lang, "privacyThree"))}</li>
            <li>${escapeHTML(t(lang, "privacyFour"))}</li>
          </ul>
          ${warning ? `<div class="inline-warning"><i data-lucide="wifi-off"></i>${escapeHTML(warning)}</div>` : ""}
          ${state.supabaseIssue ? `
            <div class="inline-warning cloud-diagnostic">
              <i data-lucide="database-zap"></i>
              <span>
                <strong>${escapeHTML(t(lang, "supabaseIssue"))}</strong>
                ${escapeHTML(t(lang, "supabaseIssueCopy"))}
                <code>${escapeHTML(state.supabaseIssue)}</code>
              </span>
            </div>
          ` : ""}
        </section>
      </div>
    </section>
  `;
}

function renderQuickPick(state) {
  const round = state.quickRound;
  const lang = state.settings.language;

  if (round?.status === "completed") {
    return renderQuickResult(state, round);
  }

  if (round?.mode === "battle") {
    const pair = getBattlePair(round);
    return `
      <section class="decision-screen quick-page page-enter">
        <div class="decision-top">
          <button class="icon-action" type="button" title="${escapeHTML(t(lang, "navHome"))}" data-action="quick-reset"><i data-lucide="chevron-left"></i></button>
          <div>
            <span class="eyebrow">${escapeHTML(t(lang, "quickPick"))}</span>
            <h1>${escapeHTML(round.title)}</h1>
          </div>
        </div>
        <div class="battle-stage">
          <button class="battle-card" type="button" data-action="quick-battle-vote" data-option-id="${pair[0]?.id}">
            <span>${escapeHTML(t(lang, "champion"))}</span>
            <strong>${escapeHTML(pair[0]?.title ?? "")}</strong>
          </button>
          <div class="versus">VS</div>
          <button class="battle-card" type="button" data-action="quick-battle-vote" data-option-id="${pair[1]?.id}">
            <span>${escapeHTML(t(lang, "challenger"))}</span>
            <strong>${escapeHTML(pair[1]?.title ?? "")}</strong>
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section class="quick-page center-panel page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "quickPick"))}</span>
        <h1>${escapeHTML(t(lang, "quickHeadline"))}</h1>
      </div>
      <form class="form-panel" data-form="quick-pick">
        <label>
          <span>${escapeHTML(t(lang, "options"))}</span>
          <textarea name="options" rows="6">${escapeHTML(state.quickOptions)}</textarea>
        </label>
        <div class="button-row">
          <button class="primary-action" type="submit" data-quick-mode="wheel">
            <i data-lucide="disc-3"></i>
            <span>${escapeHTML(t(lang, "wheel"))}</span>
          </button>
          <button class="secondary-action" type="submit" data-quick-mode="battle">
            <i data-lucide="swords"></i>
            <span>${escapeHTML(t(lang, "battle"))}</span>
          </button>
          <button class="ghost-action" type="submit" data-quick-mode="random">
            <i data-lucide="dice-5"></i>
            <span>${escapeHTML(t(lang, "random"))}</span>
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderQuickResult(state, round) {
  const lang = state.settings.language;
  const copy = round.result.copy ?? (round.result.type === "wheel" ? wheelResultCopy(round.result, lang) : "");

  return `
    <section class="result-screen page-enter">
      <span class="result-kicker">${escapeHTML(round.result.headline)}</span>
      <h1>${escapeHTML(round.result.winnerLabel)}</h1>
      <p>${escapeHTML(copy)}</p>
      <div class="result-actions">
        <button class="primary-action" type="button" data-action="quick-reset"><i data-lucide="zap"></i><span>${escapeHTML(t(lang, "quickPick"))}</span></button>
        <button class="ghost-action" type="button" data-action="navigate" data-view="home"><i data-lucide="home"></i><span>${escapeHTML(t(lang, "navHome"))}</span></button>
      </div>
    </section>
  `;
}

function renderMissingRoom(state) {
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

function renderInlineError(message) {
  return `<div class="inline-error"><i data-lucide="circle-alert"></i>${escapeHTML(message)}</div>`;
}

function renderToast(toast) {
  if (!toast) {
    return "";
  }

  return `<div class="toast ${toast.type ?? ""}">${escapeHTML(toast.message)}</div>`;
}

function wheelStyle(options, rotation) {
  const palette = ["#6657F5", "#55E6B5", "#FFBE55", "#FF637D", "#17213A", "#8B7CF6"];
  const step = 100 / Math.max(1, options.length);
  const stops = options
    .map((_, index) => {
      const start = (index * step).toFixed(3);
      const end = ((index + 1) * step).toFixed(3);
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return `--wheel-gradient: conic-gradient(from 0deg, ${stops}); --wheel-rotation: ${rotation}deg;`;
}

function payerWheelStyle(participants, rotation) {
  const palette = ["#6657F5", "#55E6B5", "#FFBE55", "#FF637D", "#8B7CF6"];
  const step = 100 / Math.max(1, participants.length);
  const stops = participants
    .map((_, index) => {
      const start = (index * step).toFixed(3);
      const end = ((index + 1) * step).toFixed(3);
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return `--wheel-gradient: conic-gradient(from 0deg, ${stops}); --wheel-rotation: ${rotation}deg;`;
}

export function getDefaultComposer() {
  return {
    category: "Food",
    mode: "swipe",
    title: "What should we eat tonight?",
    variant: WHO_PAYS_VARIANTS[0],
  };
}

function renderBrandLockup(className = "") {
  return `
    <div class="brand-lockup ${className}">
      ${renderPickrMark("brand-mark-large")}
      <span>Pickr</span>
    </div>
  `;
}

function renderPickrMark(className = "") {
  return `
    <span class="pickr-mark ${className}" aria-hidden="true">
      <span class="mark-card mark-card-back"></span>
      <span class="mark-card mark-card-front"><i data-lucide="check"></i></span>
    </span>
  `;
}

function modeLabel(mode, lang) {
  const labels = {
    en: {
      swipe: "Swipe",
      blind: "Blind Vote",
      wheel: "Random Wheel",
      battle: "Battle",
      whoPays: "Who Pays",
      random: "Random",
    },
    de: {
      swipe: "Swipe",
      blind: "Blind Vote",
      wheel: "Zufallsrad",
      battle: "Battle",
      whoPays: "Wer zahlt?",
      random: "Zufall",
    },
  };

  return labels[lang]?.[mode] ?? labels.en[mode] ?? mode;
}

function progressLabel(progress, lang) {
  if (lang !== "de") {
    return progress.label;
  }

  if (!progress.total) {
    return t(lang, "noOneHere");
  }

  if (progress.finished >= progress.total) {
    return t(lang, "allVoted");
  }

  return `${progress.finished} / ${progress.total} fertig`;
}

function resultHeadline(result, lang) {
  const labels = {
    TIE: "tie",
    MATCH: "match",
    CHAMPION: "champion",
    "BAD LUCK": "badLuck",
    "THE GROUP HAS SPOKEN": "groupHasSpoken",
  };

  return t(lang, labels[result?.headline] ?? "", {}) || result?.headline;
}

function consensusLabel(consensus, lang) {
  const labels = {
    "PERFECT MATCH": "perfectMatch",
    "STRONG MATCH": "strongMatch",
    MIXED: "mixed",
    CONTROVERSIAL: "controversial",
    "Pickr decided": "pickrHasDecided",
    "Sudden Death ready": "suddenDeath",
  };

  return t(lang, labels[consensus] ?? "", {}) || consensus;
}

function payerResultCopy(result, lang) {
  if (lang !== "de") {
    return result.copy;
  }

  return `${result.winnerLabel} ist dran.`;
}

function wheelResultCopy(result, lang) {
  if (lang !== "de") {
    return result.copy;
  }

  return `${result.winnerLabel} wurde vom Rad gewählt.`;
}

function categoryLabel(category, lang) {
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

function variantLabel(variant, lang) {
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

export function getDefaultQuickOptions() {
  return DEFAULT_OPTIONS_BY_CATEGORY.Food.slice(0, 3).join("\n");
}
