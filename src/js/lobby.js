import { LIMITS, PICKR_CONFIG } from "./config.js";
import {
  clearActiveParticipantId,
  deleteExpiredLobbies,
  deleteLobby,
  getActiveParticipantId,
  listLobbyCodes,
  markLobbyClosed,
  readLobby,
  setActiveParticipantId,
  wasLobbyClosed,
  writeLobby,
} from "./storage.js";
import {
  addHours,
  generateId,
  generateLobbyCode,
  isExpired,
  normalizeCode,
  parseOptionLines,
  sanitizeText,
} from "./utils.js";
import {
  collectIdeaOptions,
  createRematchRound,
  createRoundFromInput,
  createSuddenDeathRound,
  finishRoundIfReady,
  recordBattleVote,
  recordBlindVote,
  recordSwipeVote,
  runWhoPaysResult,
  simulateMissingVotes,
  spinWheelResult,
} from "./modes.js";

const channel = "BroadcastChannel" in window ? new BroadcastChannel("pickr-local-rooms") : null;

export function subscribeToLobby(code, onUpdate) {
  const safeCode = normalizeCode(code);

  const handleMessage = (event) => {
    if (event.data?.code === safeCode) {
      onUpdate(readLobby(safeCode), event.data.type);
    }
  };

  const handleStorage = (event) => {
    if (event.key?.endsWith(safeCode)) {
      onUpdate(readLobby(safeCode), "storage");
    }
  };

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.removeEventListener("message", handleMessage);
    window.removeEventListener("storage", handleStorage);
  };
}

export function createLobby(nicknameInput, ideasInput = "") {
  deleteExpiredLobbies();

  const nickname = validateNickname(nicknameInput);
  const ideas = parseIdeas(ideasInput, false);
  const code = generateLobbyCode(new Set(listLobbyCodes()));
  const host = createParticipant(nickname, true, ideas);
  const now = new Date();
  const lobby = {
    id: generateId("lobby"),
    code,
    status: "open",
    createdAt: now.toISOString(),
    expiresAt: addHours(now, PICKR_CONFIG.lobbyLifetimeHours).toISOString(),
    activeRoundId: "",
    isLocked: false,
    participants: [host],
    rounds: [],
  };

  persistLobby(lobby, "room:create");
  setActiveParticipantId(code, host.id);
  return { lobby, participant: host };
}

export function joinLobby(codeInput, nicknameInput, ideasInput = "") {
  deleteExpiredLobbies();

  const code = normalizeCode(codeInput);
  const nickname = validateNickname(nicknameInput);
  const ideas = parseIdeas(ideasInput, true);

  if (code.length !== LIMITS.code) {
    throw createLobbyError("invalid-code", "Invalid code.");
  }

  const lobby = readLobby(code);

  if (!lobby) {
    throw createLobbyError(wasLobbyClosed(code) ? "room-closed" : "room-not-found", wasLobbyClosed(code) ? "Room closed." : "Room not found.");
  }

  assertLobbyOpen(lobby);

  if (lobby.isLocked) {
    throw createLobbyError("room-locked", "Room is locked.");
  }

  if (lobby.participants.length >= LIMITS.maxParticipants) {
    throw createLobbyError("room-full", "Room full.");
  }

  if (lobby.participants.some((participant) => participant.nickname.toLowerCase() === nickname.toLowerCase())) {
    throw createLobbyError("nickname-used", "Nickname already used.");
  }

  const participant = createParticipant(nickname, false, ideas);
  lobby.participants.push(participant);
  persistLobby(lobby, "participant:join");
  setActiveParticipantId(code, participant.id);

  return { lobby, participant };
}

export function restoreParticipant(code) {
  const lobby = readLobby(code);
  const participantId = getActiveParticipantId(code);
  return lobby?.participants.find((participant) => participant.id === participantId) ?? null;
}

export function setReady(code, participantId, isReady) {
  return updateLobby(code, "participant:ready", (lobby) => {
    const participant = getParticipant(lobby, participantId);
    if (isReady && !participant.isHost && !participant.ideas?.length) {
      throw createLobbyError("missing-ideas", "Add at least one idea.");
    }

    participant.isReady = Boolean(isReady);
  });
}

export function updateParticipantIdeas(code, participantId, ideasInput) {
  return updateLobby(code, "participant:ideas", (lobby) => {
    const participant = getParticipant(lobby, participantId);
    participant.ideas = parseIdeas(ideasInput, false);

    if (!participant.ideas.length) {
      participant.isReady = false;
    }
  });
}

export function toggleLobbyLock(code, participantId) {
  return updateLobby(code, "room:lock", (lobby) => {
    assertHost(lobby, participantId);
    lobby.isLocked = !lobby.isLocked;
  });
}

export function addDemoGroup(code) {
  return updateLobby(code, "participant:demo", (lobby) => {
    const demoPeople = [
      { name: "Anna", ideas: ["Sushi", "Thai"] },
      { name: "Paul", ideas: ["Pizza", "Burger"] },
      { name: "Luca", ideas: ["Pasta"] },
      { name: "Marie", ideas: ["Mexican"] },
    ];
    const existing = new Set(lobby.participants.map((participant) => participant.nickname.toLowerCase()));

    demoPeople.forEach((person) => {
      if (lobby.participants.length < LIMITS.maxParticipants && !existing.has(person.name.toLowerCase())) {
        lobby.participants.push({
          ...createParticipant(person.name, false, person.ideas),
          isReady: true,
          isDemo: true,
        });
      }
    });
  });
}

export function removeParticipant(code, participantId) {
  return updateLobby(code, "participant:remove", (lobby) => {
    const removed = lobby.participants.find((participant) => participant.id === participantId);
    lobby.participants = lobby.participants.filter((participant) => participant.id !== participantId);

    // Host transfer rule: if the host leaves, the oldest remaining participant becomes host.
    if (removed?.isHost && lobby.participants.length) {
      lobby.participants[0].isHost = true;
    }
  });
}

export function leaveLobby(code, participantId) {
  const lobby = removeParticipant(code, participantId);
  clearActiveParticipantId(code);

  if (!lobby.participants.length) {
    deleteLobby(code);
    announce(code, "room:empty");
  }

  return lobby;
}

export function closeLobby(code) {
  const safeCode = normalizeCode(code);
  const lobby = readLobby(safeCode);

  if (lobby) {
    lobby.status = "closed";
    persistLobby(lobby, "room:closing");
  }

  // Cleanup: temporary data is removed; only a short closed marker remains for friendly UI copy.
  deleteLobby(safeCode);
  markLobbyClosed(safeCode);
  announce(safeCode, "room:closed");
}

export function startRound(code, participantId, roundInput) {
  return updateLobby(code, "round:start", (lobby) => {
    assertHost(lobby, participantId);

    if (lobby.rounds.length >= LIMITS.maxRounds) {
      throw createLobbyError("round-limit", "This room has reached the round limit.");
    }

    if (!lobby.participants.every((participant) => participant.isReady)) {
      throw createLobbyError("not-ready", "Everyone needs to be ready.");
    }

    const options = collectIdeaOptions(lobby.participants);
    const round = createRoundFromInput(
      {
        ...roundInput,
        options,
      },
      participantId,
      lobby.participants,
    );
    lobby.rounds.push(round);
    lobby.activeRoundId = round.id;
  });
}

export function submitVote(code, participantId, roundId, payload) {
  return updateLobby(code, "vote:submit", (lobby) => {
    const round = getRound(lobby, roundId);
    assertParticipant(lobby, participantId);
    assertRoundVoting(round);

    if (round.mode === "swipe") {
      recordSwipeVote(round, participantId, payload.optionId, payload.vote);
    } else if (round.mode === "blind") {
      recordBlindVote(round, participantId, payload.optionId);
    } else if (round.mode === "battle") {
      recordBattleVote(round, participantId, payload.optionId, lobby.participants);
    }

    finishRoundIfReady(round, lobby.participants);
  });
}

export function completeWheelRound(code, participantId, roundId) {
  return updateLobby(code, "round:wheel", (lobby) => {
    assertHost(lobby, participantId);
    const round = getRound(lobby, roundId);
    assertRoundVoting(round);
    spinWheelResult(round);
  });
}

export function completeWhoPaysRound(code, participantId, roundId, variant) {
  return updateLobby(code, "round:who-pays", (lobby) => {
    assertHost(lobby, participantId);
    const round = getRound(lobby, roundId);
    assertRoundVoting(round);
    runWhoPaysResult(round, lobby.participants, variant);
  });
}

export function simulateRoomVotes(code, participantId, roundId) {
  return updateLobby(code, "vote:simulate", (lobby) => {
    assertHost(lobby, participantId);
    const round = getRound(lobby, roundId);
    simulateMissingVotes(round, lobby.participants);
  });
}

export function createSuddenDeath(code, participantId, roundId) {
  return updateLobby(code, "round:sudden-death", (lobby) => {
    assertHost(lobby, participantId);
    const sourceRound = getRound(lobby, roundId);
    const nextRound = createSuddenDeathRound(sourceRound, participantId, lobby.participants);
    nextRound.createdAt = new Date().toISOString();
    nextRound.startedAt = new Date().toISOString();
    lobby.rounds.push(nextRound);
    lobby.activeRoundId = nextRound.id;
  });
}

export function createRematch(code, participantId, roundId) {
  return updateLobby(code, "round:rematch", (lobby) => {
    assertHost(lobby, participantId);
    const sourceRound = getRound(lobby, roundId);
    const nextRound = createRematchRound(sourceRound, participantId, lobby.participants);
    nextRound.createdAt = new Date().toISOString();
    nextRound.startedAt = new Date().toISOString();
    lobby.rounds.push(nextRound);
    lobby.activeRoundId = nextRound.id;
  });
}

export function getActiveRound(lobby) {
  return lobby?.rounds.find((round) => round.id === lobby.activeRoundId) ?? lobby?.rounds.at(-1) ?? null;
}

export function isHost(participant) {
  return Boolean(participant?.isHost);
}

function updateLobby(code, eventName, updater) {
  const lobby = readLobby(code);

  if (!lobby) {
    throw createLobbyError(wasLobbyClosed(code) ? "room-closed" : "room-not-found", wasLobbyClosed(code) ? "Room closed." : "Room not found.");
  }

  assertLobbyOpen(lobby);
  updater(lobby);
  persistLobby(lobby, eventName);
  return lobby;
}

function persistLobby(lobby, eventName) {
  lobby.updatedAt = new Date().toISOString();
  writeLobby(lobby);
  announce(lobby.code, eventName);
}

function announce(code, type) {
  channel?.postMessage({
    code: normalizeCode(code),
    type,
    at: Date.now(),
  });
}

function createParticipant(nickname, host, ideas = []) {
  return {
    id: generateId("person"),
    nickname,
    ideas,
    isHost: host,
    isReady: host,
    joinedAt: new Date().toISOString(),
  };
}

function validateNickname(value) {
  const nickname = sanitizeText(value, LIMITS.nickname);

  if (!nickname) {
    throw createLobbyError("missing-nickname", "Add a nickname.");
  }

  return nickname;
}

function parseIdeas(value, required) {
  const ideas = parseOptionLines(value).slice(0, LIMITS.maxIdeasPerParticipant);

  if (required && !ideas.length) {
    throw createLobbyError("missing-ideas", "Add at least one idea.");
  }

  return ideas;
}

function assertLobbyOpen(lobby) {
  if (lobby.status === "closed") {
    throw createLobbyError("room-closed", "Room closed.");
  }

  if (isExpired(lobby)) {
    deleteLobby(lobby.code);
    throw createLobbyError("room-expired", "Room expired.");
  }
}

function assertHost(lobby, participantId) {
  const participant = getParticipant(lobby, participantId);

  if (!participant.isHost) {
    throw createLobbyError("not-host", "Only the host can do that.");
  }
}

function assertParticipant(lobby, participantId) {
  getParticipant(lobby, participantId);
}

function getParticipant(lobby, participantId) {
  const participant = lobby.participants.find((item) => item.id === participantId);

  if (!participant) {
    throw createLobbyError("participant-missing", "Participant not found.");
  }

  return participant;
}

function getRound(lobby, roundId) {
  const round = lobby.rounds.find((item) => item.id === roundId);

  if (!round) {
    throw createLobbyError("round-missing", "Round not found.");
  }

  return round;
}

function assertRoundVoting(round) {
  if (round.status !== "voting") {
    throw createLobbyError("already-voted", "Already voted.");
  }
}

function createLobbyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
