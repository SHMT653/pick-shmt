import { CODE_ALPHABET, LIMITS, PICKR_CONFIG } from "./config.js";

export function randomNumber() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  }

  return Math.random();
}

export function randomInt(max) {
  return Math.floor(randomNumber() * Math.max(1, max));
}

export function generateId(prefix = "id") {
  const bytes = new Uint8Array(8);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 255);
    });
  }

  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${value}`;
}

export function generateLobbyCode(existingCodes = new Set()) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    let code = "";

    for (let index = 0; index < LIMITS.code; index += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }

    if (!existingCodes.has(code)) {
      return code;
    }
  }

  throw new Error("Could not generate a unique room code.");
}

export function normalizeCode(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LIMITS.code);
}

export function sanitizeText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function parseOptionLines(value) {
  const seen = new Set();
  const options = [];

  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => sanitizeText(line, LIMITS.option))
    .filter(Boolean)
    .forEach((option) => {
      const key = option.toLowerCase();
      if (!seen.has(key) && options.length < LIMITS.maxOptions) {
        seen.add(key);
        options.push(option);
      }
    });

  return options;
}

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function isExpired(lobby) {
  return lobby?.expiresAt ? new Date(lobby.expiresAt).getTime() <= Date.now() : false;
}

export function getTimeLeftLabel(lobby, language = "en") {
  const isGerman = language === "de";

  if (!lobby?.expiresAt) {
    return isGerman ? "Temporärer Raum" : "Temporary room";
  }

  const ms = new Date(lobby.expiresAt).getTime() - Date.now();
  if (ms <= 0) {
    return isGerman ? "Abgelaufen" : "Expired";
  }

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.max(1, Math.floor((ms % 3600000) / 60000));
  const suffix = isGerman ? "übrig" : "left";
  return hours > 0 ? `${hours}h ${minutes}m ${suffix}` : `${minutes}m ${suffix}`;
}

export function makeShareUrl(code) {
  const appUrl = getCurrentOrigin() || normalizeAppUrl(PICKR_CONFIG.appUrl);
  return `${appUrl}/join/${normalizeCode(code)}`;
}

function getCurrentOrigin() {
  if (typeof window === "undefined" || !window.location?.origin || window.location.origin === "null") {
    return "";
  }

  return window.location.origin.replace(/\/$/, "");
}

function normalizeAppUrl(value) {
  const rawUrl = String(value ?? "").trim().replace(/^["']|["']$/g, "");

  if (!rawUrl) {
    return "";
  }

  try {
    return new URL(rawUrl).origin.replace(/\/$/, "");
  } catch {
    return `https://${rawUrl.replace(/^\/+|\/+$/g, "")}`;
  }
}

export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[char];
  });
}

export function percent(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function formatDateLabel(dateValue) {
  const date = new Date(dateValue);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: diffDays < 7 ? "long" : undefined,
    month: diffDays >= 7 ? "short" : undefined,
    day: diffDays >= 7 ? "numeric" : undefined,
  }).format(date);
}

export function sample(items) {
  return items[randomInt(items.length)];
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function byNewest(first, second) {
  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}
