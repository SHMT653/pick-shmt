// Alle Zugriffe auf die Datenbank laufen roh per fetch() gegen die Supabase-REST-API (PostgREST),
// bewusst ohne Supabase-JS-SDK - das ist transparenter zu erklären.

const SUPABASE_URL = "https://tjodkygosuxrlvzvlgos.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2RreWdvc3V4cmx2enZsZ29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzYzMjgsImV4cCI6MjEwNDUxMjMyOH0.jadRVsOBpTuuO_cKM6y7MF8lDK3QLNF8YCedFi1ml8k";

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

// Gibt das Raum-Objekt zurück oder null, wenn der Code nicht existiert (abgelaufene Räume
// sind durch die Row-Level-Security in Supabase ebenfalls unsichtbar und liefern dann auch null).
async function holeRaum(code) {
  const url = `${SUPABASE_URL}/rest/v1/lobbies?code=eq.${code}&select=*`;
  const antwort = await fetch(url, { headers: supabaseHeaders });

  if (!antwort.ok) {
    return null;
  }

  const raeume = await antwort.json();
  return raeume.length > 0 ? raeume[0] : null;
}

// Schreibt das komplette state-Objekt des Raums zurück (kein Teil-Update einzelner Felder nötig).
async function speichereRaum(raum) {
  const url = `${SUPABASE_URL}/rest/v1/lobbies?code=eq.${raum.code}`;
  const antwort = await fetch(url, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ state: raum.state }),
  });

  return antwort.ok;
}

// Legt eine neue Raum-Zeile an und gibt den angelegten Raum zurück.
async function legeRaumAn(raum) {
  const url = `${SUPABASE_URL}/rest/v1/lobbies`;
  const antwort = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(raum),
  });

  if (!antwort.ok) {
    return null;
  }

  const angelegteRäume = await antwort.json();
  return angelegteRäume[0];
}
