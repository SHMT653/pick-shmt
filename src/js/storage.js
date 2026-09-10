import { STORAGE_KEYS } from "./config.js";
import { isExpired, normalizeCode } from "./utils.js";

const DEFAULT_SETTINGS = {
  theme: "light",
  language: "en",
  reduceMotion: false,
  lastNickname: "",
};

function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private windows. The app remains usable without it.
  }
}

export function loadSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ...loadJson(STORAGE_KEYS.settings, {}),
  };
}

export function saveSettings(settings) {
  saveJson(STORAGE_KEYS.settings, {
    theme: settings.theme,
    language: settings.language === "de" ? "de" : "en",
    reduceMotion: Boolean(settings.reduceMotion),
    lastNickname: settings.lastNickname ?? "",
  });
}

export function readLobby(code) {
  const lobby = loadJson(`${STORAGE_KEYS.lobbyPrefix}${normalizeCode(code)}`, null);

  if (lobby && isExpired(lobby)) {
    deleteLobby(code);
    return null;
  }

  return lobby;
}

export function writeLobby(lobby) {
  saveJson(`${STORAGE_KEYS.lobbyPrefix}${normalizeCode(lobby.code)}`, lobby);
}

export function deleteLobby(code) {
  window.localStorage.removeItem(`${STORAGE_KEYS.lobbyPrefix}${normalizeCode(code)}`);
}

export function markLobbyClosed(code) {
  saveJson(`${STORAGE_KEYS.closedPrefix}${normalizeCode(code)}`, {
    code: normalizeCode(code),
    closedAt: new Date().toISOString(),
  });
}

export function wasLobbyClosed(code) {
  const marker = loadJson(`${STORAGE_KEYS.closedPrefix}${normalizeCode(code)}`, null);
  if (!marker) {
    return false;
  }

  const age = Date.now() - new Date(marker.closedAt).getTime();
  if (age > 60 * 60 * 1000) {
    window.localStorage.removeItem(`${STORAGE_KEYS.closedPrefix}${normalizeCode(code)}`);
    return false;
  }

  return true;
}

export function listLobbyCodes() {
  const codes = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_KEYS.lobbyPrefix)) {
      codes.push(key.replace(STORAGE_KEYS.lobbyPrefix, ""));
    }
  }

  return codes;
}

export function deleteExpiredLobbies() {
  listLobbyCodes().forEach((code) => {
    const lobby = readLobby(code);
    if (!lobby || isExpired(lobby)) {
      deleteLobby(code);
    }
  });
}

export function setActiveParticipantId(code, participantId) {
  saveJson(`${STORAGE_KEYS.activeParticipantPrefix}${normalizeCode(code)}`, {
    participantId,
    savedAt: new Date().toISOString(),
  });
}

export function getActiveParticipantId(code) {
  return loadJson(`${STORAGE_KEYS.activeParticipantPrefix}${normalizeCode(code)}`, null)?.participantId ?? "";
}

export function clearActiveParticipantId(code) {
  window.localStorage.removeItem(`${STORAGE_KEYS.activeParticipantPrefix}${normalizeCode(code)}`);
}

export function loadHistory() {
  return loadJson(STORAGE_KEYS.history, []);
}

export function addHistoryItem(item) {
  const current = loadHistory().filter((entry) => entry.roundId !== item.roundId);
  saveJson(STORAGE_KEYS.history, [item, ...current].slice(0, 12));
}

export function clearHistory() {
  saveJson(STORAGE_KEYS.history, []);
}

export function clearLocalData() {
  const keys = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("pickr:")) {
      keys.push(key);
    }
  }

  keys.forEach((key) => window.localStorage.removeItem(key));
}
