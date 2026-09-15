// Entscheidungs-Bildschirm: zeigt je nach Spielmodus (Swipe, Blind Vote, Rad,
// Battle, Wer zahlt) die passende Abstimmungs-UI, den Warte-Zustand bis alle
// fertig sind, und am Ende den Ergebnis-Screen.
import { WHO_PAYS_VARIANTS } from "../config.js";
import { t } from "../i18n.js";
import { escapeHTML, percent } from "../utils.js";
import {
  getBattlePair,
  getNextSwipeOption,
  getParticipantVote,
  getRoundProgress,
} from "../modes.js";
import { getActiveRound, isHost } from "../lobby.js";
import { categoryLabel, renderMissingRoom, resultHeadline, variantLabel, wheelResultCopy } from "../ui.js";

export function renderDecision(state) {
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
