// 1. RAUM ERKENNEN
// Raum-Code aus der URL lesen + eigenen Nutzer aus localStorage holen.
// Wenn Nutzer oder Code nicht passen -> zurück zur Beitrittsseite.

const params = new URLSearchParams(location.search);
const code = params.get("code");
const ich = JSON.parse(localStorage.getItem("pickrIch") || "null");

if (!code || !ich || ich.code !== code) {
  location.href = "/beitreten.html";
}

// 2. HTML-ELEMENTE HOLEN
// Mit getElementById greifen wir auf Elemente der HTML-Seite zu,
// damit JavaScript sie später verändern kann.

const codeAnzeige = document.getElementById("raum-code-anzeige");
const qrBild = document.getElementById("qr-bild");
const einladungsLink = document.getElementById("einladungs-link");
const laufendeRundeBanner = document.getElementById("laufende-runde-banner");
const zurEntscheidungLink = document.getElementById("zur-entscheidung-link");
const teilnehmerListe = document.getElementById("teilnehmer-liste");
const bereitButton = document.getElementById("bereit-button");
const hostBereich = document.getElementById("host-bereich");
const modusKacheln = document.querySelectorAll(".modus-kachel");
const rundenFrageInput = document.getElementById("runden-frage");
const hostHinweis = document.getElementById("host-hinweis");
const rundeStartenButton = document.getElementById("runde-starten-button");

// Zustand, den wir uns über mehrere Funktionen hinweg merken müssen.
let raum = null;
let letzterStand = "";
let ausgewaehlterModus = null;
let frageVorbelegt = false;

// 3. LOBBY ANZEIGEN
// rendereRaum() zeigt immer den aktuellen Zustand der Lobby an:
// Raum-Code, QR-Code, Teilnehmer, Bereit-Status und Host-Bereich.

function rendereRaum() {
  codeAnzeige.textContent = raum.code;

  // Einladung erzeugen:
  // Link zur Lobby zusammenbauen (aus der eigenen aktuellen Seiten-Adresse,
  // damit er automatisch stimmt egal wo die App läuft) und daraus über einen
  // externen Dienst ein QR-Code-Bild erzeugen lassen - der Dienst bekommt
  // unseren Link einfach als Text-Parameter übergeben.
  const beitrittsLink = `${location.origin}${location.pathname.replace("raum.html", "beitreten.html")}?code=${raum.code}`;
  qrBild.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(beitrittsLink)}`;
  einladungsLink.textContent = beitrittsLink;

  // TEILNEHMER ANZEIGEN
  // forEach geht alle Teilnehmer einzeln durch.
  // Für jeden wird dynamisch ein HTML-Listeneintrag erstellt.
  teilnehmerListe.innerHTML = "";
  raum.state.teilnehmer.forEach((teilnehmer) => {
    const eintrag = document.createElement("li");
    eintrag.className = "teilnehmer-eintrag";

    const punkt = document.createElement("span");
    punkt.className = `bereit-punkt${teilnehmer.istBereit ? " ist-bereit" : ""}`;

    const name = document.createElement("span");
    name.className = "teilnehmer-name";
    name.textContent = teilnehmer.name + (teilnehmer.istHost ? " (Host)" : "");

    eintrag.append(punkt, name);
    teilnehmerListe.appendChild(eintrag);
  });

  // EIGENEN NUTZER FINDEN
  // find sucht mich über meine Teilnehmer-ID.
  // Danach prüfen wir, ob ich Host bin und ob ich bereit bin.
  const ichSelbst = raum.state.teilnehmer.find((t) => t.id === ich.teilnehmerId);
  bereitButton.textContent = ichSelbst && ichSelbst.istBereit ? "Nicht mehr bereit" : "Bereit";

  // HOST-LOGIK
  // Nur der Host sieht die Einstellungen zum Starten einer Runde.
  // Normale Teilnehmer werden bei Rundenstart automatisch weitergeleitet.
  const binHost = Boolean(ichSelbst && ichSelbst.istHost);
  hostBereich.hidden = !binHost;

  if (!binHost && raum.state.runde) {
    location.href = `/entscheiden.html?code=${raum.code}`;
    return;
  }

  // Die zuletzt eingegebene Frage merken wir uns in localStorage (siehe
  // erstellen.js) und tragen sie hier einmalig vor, damit der Host sie nicht
  // nochmal abtippen muss.
  if (binHost && !frageVorbelegt && ich.frageEntwurf) {
    rundenFrageInput.value = ich.frageEntwurf;
    frageVorbelegt = true;
  }

  laufendeRundeBanner.hidden = !raum.state.runde;
  if (raum.state.runde) {
    zurEntscheidungLink.href = `/entscheiden.html?code=${raum.code}`;
  }

  if (binHost) {
    aktualisiereStartKnopf();
  }
}

// 4. DOPPELTE IDEEN ENTFERNEN
// Set speichert Werte nur einmal.
// Durch trim + toLowerCase sind "Pizza" und "pizza" dieselbe Idee.

function sortiereIdeenAus(ideen) {
  const gesehen = new Set();
  const ergebnis = [];

  for (const idee of ideen) {
    const schluessel = idee.trim().toLowerCase();
    if (!schluessel || gesehen.has(schluessel)) {
      continue;
    }
    gesehen.add(schluessel);
    ergebnis.push(idee.trim());
  }

  return ergebnis;
}

// 5. DARF DIE RUNDE STARTEN?
// Wir prüfen:
// - Modus gewählt?
// - alle bereit?
// - mindestens 2 Ideen?
// - Frage eingegeben?
// Nur dann wird der Startbutton aktiviert.

function aktualisiereStartKnopf() {
  // every = Bedingung muss bei ALLEN Teilnehmern stimmen.
  const alleBereit = raum.state.teilnehmer.every((t) => t.istBereit);
  const gesammelteIdeen = sortiereIdeenAus(raum.state.teilnehmer.flatMap((t) => t.ideen || []));
  const brauchtOptionen = MODI_MIT_OPTIONEN.includes(ausgewaehlterModus);
  const genugIdeen = !brauchtOptionen || gesammelteIdeen.length >= 2;
  const frageVorhanden = rundenFrageInput.value.trim().length > 0;
  const kannStarten = Boolean(ausgewaehlterModus) && alleBereit && genugIdeen && frageVorhanden;

  rundeStartenButton.disabled = !kannStarten;

  if (!ausgewaehlterModus) {
    hostHinweis.textContent = "Wähle einen Modus.";
  } else if (!alleBereit) {
    hostHinweis.textContent = "Warte, bis alle Teilnehmer:innen bereit sind.";
  } else if (!genugIdeen) {
    hostHinweis.textContent = "Es werden mindestens 2 Ideen benötigt.";
  } else if (!frageVorhanden) {
    hostHinweis.textContent = "Bitte eine Frage eingeben.";
  } else {
    hostHinweis.textContent = "Bereit zum Starten!";
  }
}

// 6. AKTUELLEN RAUM LADEN
// async/await: Wir warten, bis die Raumdaten geladen wurden.
// Nur wenn sich etwas geändert hat, wird neu gerendert.

async function ladeUndRendere() {
  const neuerRaum = await holeRaum(code);
  if (!neuerRaum) {
    return;
  }

  // gleicher Stand -> nichts neu zeichnen
  const stand = JSON.stringify(neuerRaum);
  if (stand === letzterStand) {
    return;
  }

  letzterStand = stand;
  raum = neuerRaum;
  rendereRaum();
}

// 7. BEREIT-BUTTON
// Klick auf "Bereit" wechselt istBereit zwischen true und false
// und speichert anschließend den neuen Raumzustand.

async function bereitUmschalten() {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    return;
  }

  const teilnehmer = aktuellerRaum.state.teilnehmer.find((t) => t.id === ich.teilnehmerId);
  if (!teilnehmer) {
    return;
  }

  teilnehmer.istBereit = !teilnehmer.istBereit;
  await speichereRaum(aktuellerRaum);

  raum = aktuellerRaum;
  letzterStand = JSON.stringify(raum);
  rendereRaum();
}

// 8. MODUS AUSWÄHLEN
// Speichert den angeklickten Modus.
// CSS-Klasse zeigt zusätzlich optisch, welcher Modus gewählt wurde.

function modusAuswaehlen(event) {
  ausgewaehlterModus = event.currentTarget.dataset.modus;
  modusKacheln.forEach((kachel) => {
    kachel.classList.toggle("ist-ausgewaehlt", kachel === event.currentTarget);
  });
  aktualisiereStartKnopf();
}

// 9. NEUE RUNDE STARTEN
// Ideen sammeln, eindeutige IDs erstellen und neues Runden-Objekt anlegen.
// Stimmen sind am Anfang leer, Status ist "offen", Ergebnis noch null.

async function rundeStarten() {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    return;
  }

  const frage = rundenFrageInput.value.trim();
  const brauchtOptionen = MODI_MIT_OPTIONEN.includes(ausgewaehlterModus);

  let optionen = [];
  if (brauchtOptionen) {
    const alleIdeen = sortiereIdeenAus(aktuellerRaum.state.teilnehmer.flatMap((t) => t.ideen || []));
    optionen = alleIdeen.map((titel) => ({ id: crypto.randomUUID(), titel }));
    if (ausgewaehlterModus === "battle") {
      // Bewusste Vereinfachung: bei mehr als 2 Ideen werden einfach nur die ersten 2 genommen.
      optionen = optionen.slice(0, 2);
    }
  }

  // crypto.randomUUID() erzeugt eine eindeutige ID - auch für die Runde
  // selbst, damit entscheiden.js ein fertiges Ergebnis später nur einmal in
  // den Verlauf einträgt, selbst wenn mehrfach gepollt wird.
  aktuellerRaum.state.runde = {
    id: crypto.randomUUID(),
    modus: ausgewaehlterModus,
    frage,
    optionen,
    stimmen: [],
    status: "offen",
    ergebnis: null,
  };

  await speichereRaum(aktuellerRaum);
  location.href = `/entscheiden.html?code=${code}`;
}

// 10. EVENTS
// addEventListener verbindet Benutzeraktionen mit unseren Funktionen:
// Klick auf Modus, Bereit-Button und Runde starten.

modusKacheln.forEach((kachel) => kachel.addEventListener("click", modusAuswaehlen));
rundenFrageInput.addEventListener("input", () => {
  if (ausgewaehlterModus) {
    aktualisiereStartKnopf();
  }
});
bereitButton.addEventListener("click", bereitUmschalten);
rundeStartenButton.addEventListener("click", rundeStarten);

ladeUndRendere();

// 11. LIVE-AKTUALISIERUNG
// Polling: Jede Sekunde wird geprüft, ob sich der Raum geändert hat.
// Dadurch sehen alle Teilnehmer Änderungen fast live.
// Einfacher als WebSockets und für unser Projekt ausreichend.

setInterval(ladeUndRendere, 1000);
