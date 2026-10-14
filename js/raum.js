const MODI_MIT_OPTIONEN = ["swipe", "rad", "battle", "mehrheit"];

// Sortiert doppelte Ideen aus (Gross-/Kleinschreibung egal) - wenn zwei Leute
// "Pizza" eintragen, soll das nur einmal als Option auftauchen. Die zuerst
// eingetragene Schreibweise gewinnt.
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

const params = new URLSearchParams(location.search);
const code = params.get("code");
const ich = JSON.parse(localStorage.getItem("pickrIch") || "null");

if (!code || !ich || ich.code !== code) {
  location.href = "/beitreten.html";
}

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

let raum = null;
let letzterStand = "";
let ausgewaehlterModus = null;
let frageVorbelegt = false;

function rendereRaum() {
  codeAnzeige.textContent = raum.code;

  const beitrittsLink = `${location.origin}${location.pathname.replace("raum.html", "beitreten.html")}?code=${raum.code}`;
  qrBild.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(beitrittsLink)}`;
  einladungsLink.textContent = beitrittsLink;

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

  const ichSelbst = raum.state.teilnehmer.find((t) => t.id === ich.teilnehmerId);
  bereitButton.textContent = ichSelbst && ichSelbst.istBereit ? "Nicht mehr bereit" : "Bereit";

  const binHost = Boolean(ichSelbst && ichSelbst.istHost);
  hostBereich.hidden = !binHost;

  // Sobald der Host eine Runde startet, sollen alle anderen direkt in die
  // Abstimmung wechseln statt erst auf einen Link klicken zu muessen - der
  // Host bleibt bewusst im Raum, falls er/sie hier noch was sehen will.
  if (!binHost && raum.state.runde) {
    location.href = `/entscheiden.html?code=${raum.code}`;
    return;
  }

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

function aktualisiereStartKnopf() {
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

async function ladeUndRendere() {
  const neuerRaum = await holeRaum(code);
  if (!neuerRaum) {
    return;
  }

  const stand = JSON.stringify(neuerRaum);
  if (stand === letzterStand) {
    return;
  }

  letzterStand = stand;
  raum = neuerRaum;
  rendereRaum();
}

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

function modusAuswaehlen(event) {
  ausgewaehlterModus = event.currentTarget.dataset.modus;
  modusKacheln.forEach((kachel) => {
    kachel.classList.toggle("ist-ausgewaehlt", kachel === event.currentTarget);
  });
  aktualisiereStartKnopf();
}

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

  aktuellerRaum.state.runde = {
    // Eigene ID pro Runde, damit entscheiden.js ein fertiges Ergebnis nur
    // einmal in den Verlauf einträgt, auch wenn mehrfach gepollt wird.
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

modusKacheln.forEach((kachel) => kachel.addEventListener("click", modusAuswaehlen));
rundenFrageInput.addEventListener("input", () => {
  if (ausgewaehlterModus) {
    aktualisiereStartKnopf();
  }
});
bereitButton.addEventListener("click", bereitUmschalten);
rundeStartenButton.addEventListener("click", rundeStarten);

ladeUndRendere();
// Live-Sync ohne Realtime/WebSockets, weil Polling einfacher zu erklären ist: jede
// Sekunde neu laden und nur neu rendern, wenn sich wirklich etwas geändert hat.
setInterval(ladeUndRendere, 1000);
