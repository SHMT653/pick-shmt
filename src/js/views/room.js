// Raum-Ansicht: Übersicht für Host und Mitspieler:innen zwischen zwei Runden -
// Einladung teilen, eigene Ideen pflegen, Teilnehmerliste, und (für den Host)
// die nächste Runde konfigurieren und starten.
import { CATEGORIES, MODES, WHO_PAYS_VARIANTS } from "../config.js";
import { t } from "../i18n.js";
import { escapeHTML, getTimeLeftLabel, makeShareUrl } from "../utils.js";
import { collectIdeaOptions } from "../modes.js";
import { getActiveRound, isHost } from "../lobby.js";
import { categoryLabel, modeLabel, renderMissingRoom, resultHeadline, variantLabel } from "../ui.js";

export function renderRoom(state) {
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
            <p>${escapeHTML(t(lang, "peopleJoined", { count: lobby.participants.length }))} · ${escapeHTML(getTimeLeftLabel(lobby, lang))}${lobby.isLocked ? ` · ${escapeHTML(t(lang, "inviteClosedMeta"))}` : ""}</p>
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
  const plannedRound = state.lobby?.plannedRound;

  return `
    <section class="surface room-waiting">
      <span class="eyebrow">${escapeHTML(t(lang, "readySystem"))}</span>
      <h2>${escapeHTML(state.participant.isReady ? t(lang, "youAreReady") : t(lang, "readyWhenYouAre"))}</h2>
      ${
        plannedRound
          ? `
            <div class="room-question-preview">
              <span>${escapeHTML(t(lang, "question"))}</span>
              <strong>${escapeHTML(plannedRound.title)}</strong>
              <small>${escapeHTML(categoryLabel(plannedRound.category, lang))} · ${escapeHTML(modeLabel(plannedRound.mode, lang))}</small>
            </div>
          `
          : ""
      }
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
            : mode.id === "whoPays"
              ? `
              <label>
                <span>${escapeHTML(t(lang, "variant"))}</span>
                <select name="variant" data-composer-field="variant">
                  ${WHO_PAYS_VARIANTS.map((variant) => `<option ${variant === composer.variant ? "selected" : ""}>${escapeHTML(variantLabel(variant, lang))}</option>`).join("")}
                </select>
              </label>
            `
              : ""
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

export function getDefaultComposer() {
  return {
    category: "Food",
    mode: "swipe",
    title: "What should we eat tonight?",
    variant: WHO_PAYS_VARIANTS[0],
  };
}
