import { COPY_LINES, LIMITS, MODES, WHO_PAYS_VARIANTS } from "./config.js";
import { generateId, percent, randomInt, sample, sanitizeText } from "./utils.js";

export function modeNeedsOptions(mode) {
  return MODES.find((item) => item.id === mode)?.needsOptions ?? true;
}

export function collectIdeaOptions(participants) {
  const seen = new Set();
  const options = [];

  participants.forEach((participant) => {
    (participant.ideas ?? []).forEach((idea) => {
      const title = sanitizeText(idea, LIMITS.option);
      const key = title.toLowerCase();

      if (title && !seen.has(key) && options.length < LIMITS.maxOptions) {
        seen.add(key);
        options.push({
          title,
          createdBy: participant.id,
          createdByName: participant.nickname,
        });
      }
    });
  });

  return options;
}

export function createRoundFromInput(input, createdBy, participants) {
  const mode = MODES.some((item) => item.id === input.mode) ? input.mode : "swipe";
  const needsOptions = modeNeedsOptions(mode);
  const title = sanitizeText(input.title, LIMITS.title) || defaultTitleForMode(mode);
  const optionInputs = needsOptions ? input.options : [];

  if (needsOptions && optionInputs.length < 2) {
    throw createModeError("missing-options", "Add at least two options.");
  }

  if (mode === "battle" && optionInputs.length < 2) {
    throw createModeError("missing-options", "Battle needs at least two options.");
  }

  if (mode === "whoPays" && participants.length < 2) {
    throw createModeError("not-enough-people", "Who Pays needs at least two people.");
  }

  const options = optionInputs.slice(0, LIMITS.maxOptions).map((optionInput) => {
    const isObject = typeof optionInput === "object" && optionInput !== null;
    const titleValue = isObject ? optionInput.title : optionInput;

    return {
      id: generateId("option"),
      title: sanitizeText(titleValue, LIMITS.option),
      createdBy: isObject ? optionInput.createdBy ?? createdBy : createdBy,
      createdByName: isObject ? optionInput.createdByName ?? "" : "",
      createdAt: new Date().toISOString(),
    };
  });

  const round = {
    id: generateId("round"),
    title,
    category: sanitizeText(input.category, 24) || "Custom",
    mode,
    status: "voting",
    createdBy,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: "",
    options,
    votes: [],
    result: null,
  };

  if (mode === "battle") {
    round.battle = {
      championOptionId: options[0].id,
      challengerIndex: 1,
      duelVotes: [],
      log: [],
    };
  }

  if (mode === "wheel") {
    round.wheel = {
      rotation: 0,
      winnerOptionId: "",
    };
  }

  if (mode === "whoPays") {
    round.whoPays = {
      variant: WHO_PAYS_VARIANTS.includes(input.variant) ? input.variant : WHO_PAYS_VARIANTS[0],
      winnerParticipantId: "",
      rotation: 0,
    };
  }

  return round;
}

export function recordSwipeVote(round, participantId, optionId, vote) {
  const safeVote = vote === "yes" ? "yes" : "no";
  round.votes = round.votes.filter(
    (item) => !(item.participantId === participantId && item.optionId === optionId),
  );
  round.votes.push({
    id: generateId("vote"),
    participantId,
    optionId,
    vote: safeVote,
    createdAt: new Date().toISOString(),
  });
}

export function recordBlindVote(round, participantId, optionId) {
  if (round.votes.some((item) => item.participantId === participantId)) {
    throw createModeError("already-voted", "Already voted.");
  }

  round.votes.push({
    id: generateId("vote"),
    participantId,
    optionId,
    vote: "pick",
    createdAt: new Date().toISOString(),
  });
}

export function recordBattleVote(round, participantId, optionId, participants) {
  const pair = getBattlePair(round);

  if (!pair.some((option) => option.id === optionId)) {
    throw createModeError("invalid-option", "Choose one of the current battle options.");
  }

  round.battle.duelVotes = round.battle.duelVotes.filter((item) => item.participantId !== participantId);
  round.battle.duelVotes.push({
    id: generateId("vote"),
    participantId,
    optionId,
    vote: "pick",
    createdAt: new Date().toISOString(),
  });

  if (round.battle.duelVotes.length >= participants.length) {
    finishBattleDuel(round);
  }
}

export function finishRoundIfReady(round, participants) {
  if (round.status !== "voting") {
    return round;
  }

  const progress = getRoundProgress(round, participants);

  if (progress.finished < progress.total) {
    return round;
  }

  if (round.mode === "swipe") {
    applyOptionResult(round, participants, "swipe");
  }

  if (round.mode === "blind") {
    applyOptionResult(round, participants, "blind");
  }

  return round;
}

export function getRoundProgress(round, participants) {
  const total = participants.length;

  if (!total) {
    return { finished: 0, total: 0, label: "Nobody is here yet." };
  }

  if (round.mode === "swipe") {
    const finished = participants.filter((participant) =>
      round.options.every((option) =>
        round.votes.some(
          (vote) => vote.participantId === participant.id && vote.optionId === option.id,
        ),
      ),
    ).length;
    return { finished, total, label: `${finished} / ${total} finished` };
  }

  if (round.mode === "blind") {
    const finished = new Set(round.votes.map((vote) => vote.participantId)).size;
    const waiting = Math.max(0, total - finished);
    return {
      finished,
      total,
      label: waiting ? `Waiting for ${waiting} ${waiting === 1 ? "person" : "people"}...` : "Everyone voted.",
    };
  }

  if (round.mode === "battle") {
    const finished = round.battle?.duelVotes?.length ?? 0;
    return { finished, total, label: `${finished} / ${total} picked this battle` };
  }

  return {
    finished: round.status === "completed" ? total : 0,
    total,
    label: round.status === "completed" ? "Decision made." : "Waiting for the host.",
  };
}

export function getNextSwipeOption(round, participantId) {
  return round.options.find(
    (option) =>
      !round.votes.some(
        (vote) => vote.participantId === participantId && vote.optionId === option.id,
      ),
  );
}

export function getParticipantVote(round, participantId) {
  return round.votes.find((vote) => vote.participantId === participantId) ?? null;
}

export function getBattlePair(round) {
  if (!round.battle) {
    return [];
  }

  const champion = round.options.find((option) => option.id === round.battle.championOptionId);
  const challenger = round.options[round.battle.challengerIndex];
  return [champion, challenger].filter(Boolean);
}

export function getOptionCounts(round) {
  return round.options
    .map((option) => {
      const score = round.votes.filter((vote) => {
        if (round.mode === "swipe") {
          return vote.optionId === option.id && vote.vote === "yes";
        }

        return vote.optionId === option.id;
      }).length;

      return { option, score };
    })
    .sort((first, second) => second.score - first.score || first.option.title.localeCompare(second.option.title));
}

export function spinWheelResult(round) {
  const winnerIndex = randomInt(round.options.length);
  const winner = round.options[winnerIndex];
  const segmentAngle = 360 / round.options.length;
  const winnerCenter = winnerIndex * segmentAngle + segmentAngle / 2;
  const rotation = 360 * 6 + (360 - winnerCenter);

  round.wheel = {
    rotation,
    winnerOptionId: winner.id,
  };
  round.result = createWinningResult({
    type: "wheel",
    headline: "THE GROUP HAS SPOKEN",
    winnerLabel: winner.title,
    agreed: 1,
    total: 1,
    counts: getOptionCounts(round),
    copy: sample(COPY_LINES),
  });
  round.status = "completed";
  round.completedAt = new Date().toISOString();
}

export function runWhoPaysResult(round, participants, variant) {
  const safeVariant = WHO_PAYS_VARIANTS.includes(variant) ? variant : round.whoPays?.variant ?? WHO_PAYS_VARIANTS[0];
  const winnerIndex = randomInt(participants.length);
  const winner = participants[winnerIndex];
  const segmentAngle = 360 / participants.length;
  const winnerCenter = winnerIndex * segmentAngle + segmentAngle / 2;

  round.whoPays = {
    variant: safeVariant,
    winnerParticipantId: winner.id,
    rotation: 360 * 7 + (360 - winnerCenter),
  };
  round.result = {
    type: "payer",
    headline: "BAD LUCK",
    winnerLabel: `${winner.nickname} is paying`,
    agreed: 1,
    total: 1,
    agreementPercent: 100,
    consensus: "Pickr decided",
    copy: safeVariant,
    participants: participants.map((participant) => ({
      id: participant.id,
      nickname: participant.nickname,
    })),
  };
  round.status = "completed";
  round.completedAt = new Date().toISOString();
}

export function simulateMissingVotes(round, participants) {
  if (round.status !== "voting") {
    return;
  }

  if (round.mode === "swipe") {
    simulateSwipeVotes(round, participants);
    finishRoundIfReady(round, participants);
  }

  if (round.mode === "blind") {
    simulateBlindVotes(round, participants);
    finishRoundIfReady(round, participants);
  }

  if (round.mode === "battle") {
    let guard = 0;

    while (round.status === "voting" && guard < LIMITS.maxOptions) {
      simulateBattleDuel(round, participants);
      guard += 1;
    }
  }
}

export function createSuddenDeathRound(sourceRound, createdBy, participants) {
  const tiedOptions = sourceRound.result?.tieOptions ?? getOptionCounts(sourceRound).slice(0, 2).map((item) => item.option);

  return createRoundFromInput(
    {
      title: `${sourceRound.title} - Sudden Death`,
      category: sourceRound.category,
      mode: "battle",
      options: tiedOptions.slice(0, 2).map((option) => option.title),
    },
    createdBy,
    participants,
  );
}

export function createRematchRound(sourceRound, createdBy, participants) {
  const options = getOptionCounts(sourceRound)
    .slice(0, 3)
    .map((item) => item.option.title);

  return createRoundFromInput(
    {
      title: `${sourceRound.title} - Rematch`,
      category: sourceRound.category,
      mode: sourceRound.mode === "blind" ? "blind" : "swipe",
      options,
    },
    createdBy,
    participants,
  );
}

function defaultTitleForMode(mode) {
  if (mode === "whoPays") {
    return "Who pays tonight?";
  }

  if (mode === "battle") {
    return "What wins?";
  }

  return "What should we pick?";
}

function applyOptionResult(round, participants, type) {
  const counts = getOptionCounts(round);
  const topScore = counts[0]?.score ?? 0;
  const topOptions = counts.filter((item) => item.score === topScore);

  if (topOptions.length > 1) {
    round.status = "tie";
    round.result = {
      type: "tie",
      headline: "TIE",
      winnerLabel: "One more round",
      agreed: topScore,
      total: participants.length,
      agreementPercent: percent(topScore, participants.length),
      consensus: "Sudden Death ready",
      copy: "Nobody could decide. Pickr did.",
      counts,
      tieOptions: topOptions.slice(0, 2).map((item) => item.option),
    };
    round.completedAt = new Date().toISOString();
    return;
  }

  round.result = createWinningResult({
    type,
    headline: type === "swipe" ? "MATCH" : "THE GROUP HAS SPOKEN",
    winnerLabel: topOptions[0].option.title,
    agreed: topScore,
    total: participants.length,
    counts,
    copy: sample(COPY_LINES),
  });
  round.status = "completed";
  round.completedAt = new Date().toISOString();
}

function createWinningResult({ type, headline, winnerLabel, agreed, total, counts, copy }) {
  return {
    type,
    headline,
    winnerLabel,
    agreed,
    total,
    agreementPercent: percent(agreed, total),
    consensus: getConsensusLabel(agreed, total),
    counts,
    copy,
  };
}

export function getConsensusLabel(agreed, total) {
  const ratio = total ? agreed / total : 0;

  if (ratio >= 1) {
    return "PERFECT MATCH";
  }

  if (ratio >= 0.75) {
    return "STRONG MATCH";
  }

  if (ratio >= 0.5) {
    return "MIXED";
  }

  return "CONTROVERSIAL";
}

function finishBattleDuel(round) {
  const pair = getBattlePair(round);
  const [left, right] = pair;
  const leftVotes = round.battle.duelVotes.filter((vote) => vote.optionId === left.id).length;
  const rightVotes = round.battle.duelVotes.filter((vote) => vote.optionId === right.id).length;
  const winner = leftVotes === rightVotes ? pair[randomInt(pair.length)] : leftVotes > rightVotes ? left : right;

  round.battle.log.push({
    left: left.title,
    right: right.title,
    winner: winner.title,
    createdAt: new Date().toISOString(),
  });

  if (round.battle.challengerIndex >= round.options.length - 1) {
    round.result = createWinningResult({
      type: "battle",
      headline: "CHAMPION",
      winnerLabel: winner.title,
      agreed: Math.max(leftVotes, rightVotes),
      total: round.battle.duelVotes.length,
      counts: getOptionCounts(round),
      copy: sample(COPY_LINES),
    });
    round.status = "completed";
    round.completedAt = new Date().toISOString();
    return;
  }

  round.battle.championOptionId = winner.id;
  round.battle.challengerIndex += 1;
  round.battle.duelVotes = [];
}

function simulateSwipeVotes(round, participants) {
  const target = chooseDemoTarget(round.options);
  const targetGoal = Math.min(participants.length, Math.max(1, Math.round(participants.length * 0.8)));
  let currentTargetYes = round.votes.filter((vote) => vote.optionId === target.id && vote.vote === "yes").length;
  const yesCounts = new Map(
    round.options.map((option) => [
      option.id,
      round.votes.filter((vote) => vote.optionId === option.id && vote.vote === "yes").length,
    ]),
  );

  participants
    .filter((participant) =>
      round.options.some(
        (option) =>
          !round.votes.some(
            (vote) => vote.participantId === participant.id && vote.optionId === option.id,
          ),
      ),
    )
    .forEach((participant, participantIndex) => {
      round.options.forEach((option, optionIndex) => {
        if (
          round.votes.some(
            (vote) => vote.participantId === participant.id && vote.optionId === option.id,
          )
        ) {
          return;
        }

        let vote = "no";
        if (option.id === target.id && currentTargetYes < targetGoal) {
          vote = "yes";
          currentTargetYes += 1;
          yesCounts.set(option.id, (yesCounts.get(option.id) ?? 0) + 1);
        } else if (option.id !== target.id) {
          const otherGoal = Math.max(1, Math.min(targetGoal - 2, Math.floor(participants.length * 0.45)));
          const currentScore = yesCounts.get(option.id) ?? 0;
          const shouldAddYes = currentScore < otherGoal && (participantIndex + optionIndex) % 2 === 0;
          if (shouldAddYes) {
            vote = "yes";
            yesCounts.set(option.id, currentScore + 1);
          }
        }

        recordSwipeVote(round, participant.id, option.id, vote);
      });
    });
}

function simulateBlindVotes(round, participants) {
  const target = chooseDemoTarget(round.options);
  const targetGoal = Math.min(participants.length, Math.max(1, Math.ceil(participants.length * 0.65)));
  let currentTargetVotes = round.votes.filter((vote) => vote.optionId === target.id).length;
  const otherOptions = round.options.filter((option) => option.id !== target.id);

  participants
    .filter((participant) => !round.votes.some((vote) => vote.participantId === participant.id))
    .forEach((participant, index) => {
      const shouldPickTarget = currentTargetVotes < targetGoal;
      const fallback = otherOptions[index % Math.max(1, otherOptions.length)] ?? target;
      recordBlindVote(round, participant.id, shouldPickTarget ? target.id : fallback.id);
      if (shouldPickTarget) {
        currentTargetVotes += 1;
      }
    });
}

function simulateBattleDuel(round, participants) {
  const pair = getBattlePair(round);
  const preferred = chooseDemoTarget(pair);

  participants
    .filter((participant) => !round.battle.duelVotes.some((vote) => vote.participantId === participant.id))
    .forEach((participant) => {
      recordBattleVote(round, participant.id, preferred.id, participants);
    });
}

function chooseDemoTarget(options) {
  return (
    options.find((option) => /sushi/i.test(option.title)) ??
    options.find((option) => /pizza|bowling|interstellar|max/i.test(option.title)) ??
    options[Math.min(1, options.length - 1)] ??
    options[0]
  );
}

function createModeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
