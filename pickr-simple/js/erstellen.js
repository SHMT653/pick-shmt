const erstellenForm = document.getElementById("erstellen-form");
const erstellenButton = document.getElementById("erstellen-button");
const fehlerText = document.getElementById("fehler");

// Grossbuchstaben ohne I/L/O und Ziffern ohne 0/1, weil die leicht verwechselt werden -
// muss zum RLS-Regex der lobbies-Tabelle passen (^[A-HJ-KM-NP-Z2-9]{6}$).
function erzeugeRaumCode() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function zeigeFehler(text) {
  fehlerText.textContent = text;
  fehlerText.hidden = false;
}

function zerlegeIdeenText(text) {
  return text
    .split("\n")
    .map((zeile) => zeile.trim())
    .filter(Boolean);
}

async function erstellenAbsenden(event) {
  event.preventDefault();

  const frage = document.getElementById("frage").value.trim();
  const name = document.getElementById("name").value.trim();
  const ideenRoh = document.getElementById("ideen").value.trim();

  if (!frage || !name) {
    zeigeFehler("Bitte Frage und Namen ausfüllen.");
    return;
  }

  const ideen = ideenRoh ? zerlegeIdeenText(ideenRoh) : [];
  const teilnehmerId = crypto.randomUUID();
  const code = erzeugeRaumCode();

  const neuerRaum = {
    code,
    status: "open",
    is_locked: false,
    state: {
      erstelltAm: new Date().toISOString(),
      teilnehmer: [{ id: teilnehmerId, name, istHost: true, istBereit: true, ideen }],
      runde: null,
    },
  };

  erstellenButton.disabled = true;
  const angelegterRaum = await legeRaumAn(neuerRaum);
  erstellenButton.disabled = false;

  if (!angelegterRaum) {
    zeigeFehler("Raum konnte nicht angelegt werden. Bitte nochmal versuchen.");
    return;
  }

  // frageEntwurf wird nur lokal gemerkt, um das Frage-Feld auf raum.html vorzubelegen -
  // ist kein Teil des gemeinsamen state-Objekts in der Datenbank.
  localStorage.setItem(
    "pickrIch",
    JSON.stringify({ code, teilnehmerId, name, frageEntwurf: frage }),
  );
  location.href = `raum.html?code=${code}`;
}

erstellenForm.addEventListener("submit", erstellenAbsenden);
