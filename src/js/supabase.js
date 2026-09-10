import { createClient } from "@supabase/supabase-js";
import { PICKR_CONFIG } from "./config.js";

let client;

export function isSupabaseConfigured() {
  return Boolean(PICKR_CONFIG.supabaseUrl && PICKR_CONFIG.supabaseAnonKey);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(PICKR_CONFIG.supabaseUrl, PICKR_CONFIG.supabaseAnonKey);
  }

  return client;
}

export function getRealtimeLabel() {
  return isSupabaseConfigured() ? "Supabase Realtime ready" : "Local demo realtime";
}

export function getSupabaseWarning() {
  if (isSupabaseConfigured()) {
    return "";
  }

  return "Supabase unavailable. This build uses temporary browser sync for local testing.";
}

export function subscribeToLobbyRealtime(code, onChange) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => {};
  }

  // Realtime boundary: the UI can react to normalized table changes here
  // without exposing service-role keys or storing secrets in the browser.
  const channel = supabase
    .channel(`pickr-room-${code}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lobbies" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "participants" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rounds" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "options" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "votes" },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
