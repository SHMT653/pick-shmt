import { LIMITS, MODES, PICKR_CONFIG, WHO_PAYS_VARIANTS } from "./config.js";
import {
  clearActiveParticipantId,
  deleteExpiredLobbies,
  deleteLobby,
  closeCloudLobby,
  getActiveParticipantId,
  listLobbyCodes,
  markLobbyClosed,
  readCloudLobby,
  readLobby,
  setActiveParticipantId,
  wasLobbyClosed,
  writeCloudLobby,
} from "./storage.js";
import { subscribeToLobbyRealtime } from "./supabase.js";
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
const ROOM_SYNC_INTERVAL_MS = 1500;

export function subscribeToLobby(code, onUpdate) {
  const safeCode = normalizeCode(code);
  let lastSnapshot = getLobbySnapshot(readLobby(safeCode));
  let isDisposed = false;
  let isSyncing = false;

  const emitLatest = async (eventType) => {
    if (isDisposed || isSyncing) {
      return;
    }

    isSyncing = true;

    try {
      emitIfChanged(await readCloudLobby(safeCode), eventType);
    } catch {
      emitIfChanged(readLobby(safeCode), eventType);
    } finally {
      isSyncing = false;
    }
  };

  const emitIfChanged = (lobby, eventType) => {
    if (isDisposed) {
      return;
    }

    const nextSnapshot = getLobbySnapshot(lobby);
    if (nextSnapshot === lastSnapshot) {
      return;
    }

    onUpdate(lobby, eventType);
    lastSnapshot = nextSnapshot;
  };

  const handleMessage = (event) => {
    if (event.data?.code === safeCode) {
      emitLatest(event.data.type);
    }
  };

  const handleStorage = (event) => {
    if (event.key?.endsWith(safeCode)) {
      emitLatest("storage");
    }
  };

  const handleVisibleSync = () => {
    emitLatest("visible-sync");
  };

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleVisibleSync);
  document.addEventListener("visibilitychange", handleVisibleSync);
  const unsubscribeRealtime = subscribeToLobbyRealtime(safeCode, () => emitLatest("realtime"));
  const syncInterval = window.setInterval(() => {
    emitLatest("poll");
  }, ROOM_SYNC_INTERVAL_MS);

  emitLatest("initial-sync");

  return () => {
    isDisposed = true;
    window.clearInterval(syncInterval);
    channel?.removeEventListener("message", handleMessage);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleVisibleSync);
    document.removeEventListener("visibilitychange", handleVisibleSync);
    unsubscribeRealtime();
  };
}

function getLobbySnapshot(lobby) {
  return lobby ? JSON.stringify(lobby) : "";
}

export async function createLobby(nicknameInput, ideasInput = "", plannedRoundInput = {}) {
  deleteExpiredLobbies();

  const nickname = validateNickname(nicknameInput);
  const ideas = parseIdeas(ideasInput, false);
  const usedCodes = new Set(listLobbyCodes());
  let code = generateLobbyCode(usedCodes);

  while (await readCloudLobby(code)) {
    usedCodes.add(code);
    code = generateLobbyCode(usedCodes);
  }

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
    plannedRound: normalizePlannedRound(plannedRoundInput),
    participants: [host],
    rounds: [],
  };

  await persistLobby(lobby, "room:create");
  setActiveParticipantId(code, host.id);
  return { lobby, participant: host };
}

export async function joinLobby(codeInput, nicknameInput, ideasInput = "") {
  deleteExpiredLobbies();

  const code = normalizeCode(codeInput);
  const nickname = validateNickname(nicknameInput);
  const ideas = parseIdeas(ideasInput, true);

  if (code.length !== LIMITS.code) {
    throw createLobbyError("invalid-code", "Invalid code.");
  }

  const lobby = await readCloudLobby(code);

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

  const participant = {
    ...createParticipant(nickname, false, ideas),
    isReady: true,
  };
  lobby.participants.push(participant);
  await persistLobby(lobby, "participant:join");
  setActiveParticipantId(code, participant.id);

  return { lobby, participant };
}

export async function restoreParticipant(code) {
  const lobby = await readCloudLobby(code);
  const participantId = getActiveParticipantId(code);
  return lobby?.participants.find((participant) => participant.id === participantId) ?? null;
}

export async function setReady(code, participantId, isReady) {
  return updateLobby(code, "participant:ready", (lobby) => {
    const participant = getParticipant(lobby, participantId);
    if (isReady && !participant.isHost && !participant.ideas?.length) {
      throw createLobbyError("missing-ideas", "Add at least one idea.");
    }

    participant.isReady = Boolean(isReady);
  });
}

export async function updateParticipantIdeas(code, participantId, ideasInput) {
  return updateLobby(code, "participant:ideas", (lobby) => {
    const participant = getParticipant(lobby, participantId);
    participant.ideas = parseIdeas(ideasInput, false);

    if (!participant.ideas.length) {
      participant.isReady = false;
    }
  });
}

export async function toggleLobbyLock(code, participantId) {
  return updateLobby(code, "room:lock", (lobby) => {
    assertHost(lobby, participantId);
    lobby.isLocked = !lobby.isLocked;
  });
}

export async function updateLobbySetup(code, participantId, plannedRoundInput) {
  return updateLobby(code, "room:setup", (lobby) => {
    assertHost(lobby, participantId);
    lobby.plannedRound = normalizePlannedRound(plannedRoundInput);
  });
}

export async function addDemoGroup(code) {
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

export async function removeParticipant(code, participantId) {
  return updateLobby(code, "participant:remove", (lobby) => {
    const removed = lobby.participants.find((participant) => participant.id === participantId);
    lobby.participants = lobby.participants.filter((participant) => participant.id !== participantId);

    // Host transfer rule: if the host leaves, the oldest remaining participant becomes host.
    if (removed?.isHost && lobby.participants.length) {
      lobby.participants[0].isHost = true;
    }
  });
}

export async function leaveLobby(code, participantId) {
  const lobby = await removeParticipant(code, participantId);
  clearActiveParticipantId(code);

  if (!lobby.participants.length) {
    deleteLobby(code);
    announce(code, "room:empty");
  }

  return lobby;
}

export async function closeLobby(code) {
  const safeCode = normalizeCode(code);
  const lobby = readLobby(safeCode);

  if (lobby) {
    lobby.status = "closed";
    await persistLobby(lobby, "room:closing");
  }

  // Cleanup: temporary data is removed; only a short closed marker remains for friendly UI copy.
  deleteLobby(safeCode);
  await closeCloudLobby(safeCode);
  markLobbyClosed(safeCode);
  announce(safeCode, "room:closed");
}

export async function startRound(code, participantId, roundInput) {
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

export async function submitVote(code, participantId, roundId, payload) {
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

export async function completeWheelRound(code, participantId, roundId) {
  return updateLobby(code, "round:wheel", (lobby) => {
    assertHost(lobby, participantId);
    const round = getRound(lobby, roundId);
    assertRoundVoting(round);
    spinWheelResult(round);
  });
}

export async function completeWhoPaysRound(code, participantId, roundId, variant) {
  return updateLobby(code, "round:who-pays", (lobby) => {
    assertHost(lobby, participantId);
    const round = getRound(lobby, roundId);
    assertRoundVoting(round);
    runWhoPaysResult(round, lobby.participants, variant);
  });
}

export async function simulateRoomVotes(code, participantId, roundId) {
  return updateLobby(code, "vote:simulate", (lobby) => {
    assertHost(lobby, participantId);
    const round = getRound(lobby, roundId);
    simulateMissingVotes(round, lobby.participants);
  });
}

export async function createSuddenDeath(code, participantId, roundId) {
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

export async function createRematch(code, participantId, roundId) {
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

async function updateLobby(code, eventName, updater) {
  const lobby = await readCloudLobby(code);

  if (!lobby) {
    throw createLobbyError(wasLobbyClosed(code) ? "room-closed" : "room-not-found", wasLobbyClosed(code) ? "Room closed." : "Room not found.");
  }

  assertLobbyOpen(lobby);
  updater(lobby);
  await persistLobby(lobby, eventName);
  return lobby;
}

async function persistLobby(lobby, eventName) {
  lobby.updatedAt = new Date().toISOString();
  await writeCloudLobby(lobby);
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

function normalizePlannedRound(input = {}) {
  const category = sanitizeText(input.category, 40) || "Food";
  const mode = MODES.some((item) => item.id === input.mode) ? input.mode : "swipe";
  const title = sanitizeText(input.title, LIMITS.title) || "What should we pick?";
  const variant = WHO_PAYS_VARIANTS.includes(input.variant) ? input.variant : WHO_PAYS_VARIANTS[0];

  return { category, mode, title, variant };
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
