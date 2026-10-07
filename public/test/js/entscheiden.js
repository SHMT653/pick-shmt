const params = new URLSearchParams(location.search);
const code = params.get("code");
const ich = JSON.parse(localStorage.getItem("pickrIch") || "null");

if (!code || !ich || ich.code !== code) {
  location.href = "beitreten.html";
}

const fragenAnzeige = document.getElementById("frage-anzeige");

const ergebnisBereich = document.getElementById("ergebnis-bereich");
const ergebnisText = document.getElementById("ergebnis-text");
const zurueckLink = document.getElementById("zurueck-link");
const neueRundeButton = document.getElementById("neue-runde-button");

const swipeFortschritt = document.getElementById("swipe-fortschritt");
const swipeInhalt = document.getElementById("swipe-inhalt");
const swipeTitel = document.getElementById("swipe-titel");
const swipeWarten = document.getElementById("swipe-warten");
const swipeJaButton = document.getElementById("swipe-ja");
const swipeNeinButton = document.getElementById("swipe-nein");

const rad = document.getElementById("rad");
const radListe = document.getElementById("rad-liste");
const radDrehenButton = document.getElementById("rad-drehen-button");
const radWarten = document.getElementById("rad-warten");

const fingerFeld = document.getElementById("finger-feld");
const fingerStatus = document.getElementById("finger-status");

const tipprennenButton = document.getElementById("tipprennen-button");
const tipprennenListe = document.getElementById("tipprennen-liste");

const battleOption0 = document.getElementById("battle-option-0");
const battleOption1 = document.getElementById("battle-option-1");
const battleWarten = document.getElementById("battle-warten");

let raum = null;
let letzterStand = "";
let aktuelleSwipeOptionId = null;

// Zahler-Modus ist rein lokal auf dem Host-Gerät, bis das Ergebnis feststeht.
const fingerPositionen = new Map();
let fingerTimer = null;
let fingerGewinnerIndex = null;

// Tipprennen: lokal sofort hochzählen, aber nur gesammelt alle 300ms synchronisieren,
// damit nicht bei jedem einzelnen Klick ein Request raus geht.
let meinTippZaehler = 0;
let tippSyncTimer = null;

function zeigeNur(bereichId) {
  document.querySelectorAll(".modus-bereich").forEach((el) => {
    el.hidden = el.id !== bereichId;
  });
  ergebnisBereich.hidden = bereichId !== "ergebnis-bereich";
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
  rendereRunde();
}

function rendereRunde() {
  const runde = raum.state.runde;
  if (!runde) {
    location.href = `raum.html?code=${code}`;
    return;
  }

  fragenAnzeige.textContent = runde.frage;

  if (runde.status === "fertig") {
    zeigeNur("ergebnis-bereich");
    ergebnisText.textContent = runde.ergebnis;
    zurueckLink.href = `raum.html?code=${code}`;
    return;
  }

  zeigeNur(`modus-${runde.modus}`);

  if (runde.modus === "swipe") rendereSwipe(runde);
  else if (runde.modus === "rad") rendereRad(runde);
  else if (runde.modus === "zahler") rendereZahler(runde);
  else if (runde.modus === "tipprennen") rendereTipprennen(runde);
  else if (runde.modus === "battle") rendereBattle(runde);
}

// --- Swipe -----------------------------------------------------------------

function rendereSwipe(runde) {
  const meineStimmen = runde.stimmen.filter((s) => s.teilnehmerId === ich.teilnehmerId);
  const offeneOption = runde.optionen.find((o) => !meineStimmen.some((s) => s.optionId === o.id));

  swipeFortschritt.textContent = `${meineStimmen.length} / ${runde.optionen.length} bewertet`;

  if (!offeneOption) {
    swipeInhalt.hidden = true;
    swipeWarten.hidden = false;
    return;
  }

  swipeInhalt.hidden = false;
  swipeWarten.hidden = true;
  swipeTitel.textContent = offeneOption.titel;
  aktuelleSwipeOptionId = offeneOption.id;
}

async function swipeAbstimmen(stimme) {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    return;
  }

  const aktuelleRunde = aktuellerRaum.state.runde;
  aktuelleRunde.stimmen.push({
    teilnehmerId: ich.teilnehmerId,
    optionId: aktuelleSwipeOptionId,
    stimme,
  });

  const insgesamtNoetig = aktuelleRunde.optionen.length * aktuellerRaum.state.teilnehmer.length;
  if (aktuelleRunde.stimmen.length >= insgesamtNoetig) {
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = ermittleSwipeGewinner(aktuelleRunde);
  }

  await speichereRaum(aktuellerRaum);
  raum = aktuellerRaum;
  letzterStand = JSON.stringify(raum);
  rendereRunde();
}

function ermittleSwipeGewinner(runde) {
  // Bei Gleichstand gewinnt einfach die zuerst erstellte Option (kein Sudden-Death).
  let bestenfalls = runde.optionen[0];
  let besteJaAnzahl = -1;

  for (const option of runde.optionen) {
    const jaAnzahl = runde.stimmen.filter((s) => s.optionId === option.id && s.stimme === "ja").length;
    if (jaAnzahl > besteJaAnzahl) {
      besteJaAnzahl = jaAnzahl;
      bestenfalls = option;
    }
  }

  return bestenfalls.titel;
}

// --- Rad (Zufallsrad) -------------------------------------------------------

function rendereRad(runde) {
  radListe.innerHTML = "";
  runde.optionen.forEach((option) => {
    const eintrag = document.createElement("li");
    eintrag.textContent = option.titel;
    radListe.appendChild(eintrag);
  });

  const binHost = Boolean(raum.state.teilnehmer.find((t) => t.id === ich.teilnehmerId)?.istHost);
  radDrehenButton.hidden = !binHost;
  radWarten.hidden = binHost;
}

function radDrehen() {
  radDrehenButton.disabled = true;
  rad.classList.add("dreht-sich");

  // Erst nach der CSS-Dreh-Animation (1.5s) wird das Ergebnis ermittelt und gespeichert.
  setTimeout(async () => {
    const aktuellerRaum = await holeRaum(code);
    if (!aktuellerRaum) {
      return;
    }

    const aktuelleRunde = aktuellerRaum.state.runde;
    const gewinnerOption = aktuelleRunde.optionen[Math.floor(Math.random() * aktuelleRunde.optionen.length)];
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = gewinnerOption.titel;

    await speichereRaum(aktuellerRaum);
    raum = aktuellerRaum;
    letzterStand = JSON.stringify(raum);
    rendereRunde();
  }, 1500);
}

// --- Zahler (Finger-Methode) -------------------------------------------------

function rendereZahler() {
  // Keine Server-Daten nötig, das Finger-Auflegen ist rein lokal auf diesem Gerät.
}

function fingerPositionBerechnen(event) {
  const rect = fingerFeld.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

function fingerAufgelegt(event) {
  if (fingerGewinnerIndex !== null) {
    return;
  }

  fingerPositionen.set(event.pointerId, fingerPositionBerechnen(event));
  rendereFingerRinge();
  fingerTimerNeuStarten();
}

function fingerEntfernt(event) {
  if (fingerGewinnerIndex !== null) {
    return;
  }

  fingerPositionen.delete(event.pointerId);
  rendereFingerRinge();
  fingerTimerNeuStarten();
}

function fingerTimerNeuStarten() {
  clearTimeout(fingerTimer);
  // Erst wenn sich 800ms nichts mehr ändert (keine neuen/entfernten Finger), wird gewertet.
  if (fingerPositionen.size >= 2) {
    fingerTimer = setTimeout(fingerGewinnerErmitteln, 800);
  }
}

function rendereFingerRinge() {
  fingerFeld.innerHTML = "";
  let index = 0;
  for (const [, position] of fingerPositionen) {
    const ring = document.createElement("div");
    ring.className = "finger-ring" + (index === fingerGewinnerIndex ? " gewinner" : "");
    ring.style.left = `${position.x}%`;
    ring.style.top = `${position.y}%`;
    ring.textContent = String(index + 1);
    fingerFeld.appendChild(ring);
    index++;
  }
  fingerStatus.textContent = `${fingerPositionen.size} Finger erkannt`;
}

function fingerGewinnerErmitteln() {
  if (fingerPositionen.size < 2 || fingerGewinnerIndex !== null) {
    return;
  }

  const anzahlFinger = fingerPositionen.size;
  fingerGewinnerIndex = Math.floor(Math.random() * anzahlFinger);
  rendereFingerRinge();
  fingerStatus.textContent = `Finger ${fingerGewinnerIndex + 1} zahlt gleich ...`;

  // Der Gewinner-Finger blinkt erst 5 Sekunden lang, bevor das Ergebnis gespeichert wird -
  // so sieht die Gruppe noch, wer "gezogen" wurde, bevor die Seite wechselt.
  setTimeout(async () => {
    const aktuellerRaum = await holeRaum(code);
    if (!aktuellerRaum) {
      return;
    }

    const aktuelleRunde = aktuellerRaum.state.runde;
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = `Finger ${fingerGewinnerIndex + 1} zahlt!`;

    await speichereRaum(aktuellerRaum);
    raum = aktuellerRaum;
    letzterStand = JSON.stringify(raum);
    rendereRunde();
  }, 5000);
}

// --- Tipprennen --------------------------------------------------------------

function rendereTipprennen(runde) {
  tipprennenListe.innerHTML = "";
  runde.stimmen.forEach((stimme) => {
    const teilnehmer = raum.state.teilnehmer.find((t) => t.id === stimme.teilnehmerId);
    const eintrag = document.createElement("li");
    eintrag.textContent = `${teilnehmer ? teilnehmer.name : "?"}: ${stimme.anzahl} / 20`;
    tipprennenListe.appendChild(eintrag);
  });

  const meineStimme = runde.stimmen.find((s) => s.teilnehmerId === ich.teilnehmerId);
  meinTippZaehler = meineStimme ? meineStimme.anzahl : 0;
}

function tipprennenKlick() {
  meinTippZaehler++;

  if (meinTippZaehler >= 20) {
    clearTimeout(tippSyncTimer);
    tipprennenSpeichern();
    return;
  }

  clearTimeout(tippSyncTimer);
  tippSyncTimer = setTimeout(tipprennenSpeichern, 300);
}

async function tipprennenSpeichern() {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    return;
  }

  const aktuelleRunde = aktuellerRaum.state.runde;
  let meineStimme = aktuelleRunde.stimmen.find((s) => s.teilnehmerId === ich.teilnehmerId);
  if (!meineStimme) {
    meineStimme = { teilnehmerId: ich.teilnehmerId, anzahl: 0 };
    aktuelleRunde.stimmen.push(meineStimme);
  }
  meineStimme.anzahl = Math.max(meineStimme.anzahl, meinTippZaehler);

  if (meineStimme.anzahl >= 20 && aktuelleRunde.status !== "fertig") {
    const gewinnerTeilnehmer = aktuellerRaum.state.teilnehmer.find((t) => t.id === ich.teilnehmerId);
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = gewinnerTeilnehmer ? gewinnerTeilnehmer.name : "Unbekannt";
  }

  await speichereRaum(aktuellerRaum);
  raum = aktuellerRaum;
  letzterStand = JSON.stringify(raum);
  rendereRunde();
}

// --- Battle --------------------------------------------------------------

function rendereBattle(runde) {
  battleOption0.textContent = runde.optionen[0].titel;
  battleOption1.textContent = runde.optionen[1].titel;

  const meineStimme = runde.stimmen.find((s) => s.teilnehmerId === ich.teilnehmerId);
  battleWarten.hidden = !meineStimme;
  battleOption0.disabled = Boolean(meineStimme);
  battleOption1.disabled = Boolean(meineStimme);
}

async function battleAbstimmen(optionIndex) {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    return;
  }

  const aktuelleRunde = aktuellerRaum.state.runde;
  if (aktuelleRunde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId)) {
    return;
  }

  const option = aktuelleRunde.optionen[optionIndex];
  aktuelleRunde.stimmen.push({ teilnehmerId: ich.teilnehmerId, optionId: option.id });

  if (aktuelleRunde.stimmen.length >= aktuellerRaum.state.teilnehmer.length) {
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = ermittleBattleGewinner(aktuelleRunde);
  }

  await speichereRaum(aktuellerRaum);
  raum = aktuellerRaum;
  letzterStand = JSON.stringify(raum);
  rendereRunde();
}

function ermittleBattleGewinner(runde) {
  const stimmenErste = runde.stimmen.filter((s) => s.optionId === runde.optionen[0].id).length;
  const stimmenZweite = runde.stimmen.filter((s) => s.optionId === runde.optionen[1].id).length;
  // Bei Gleichstand gewinnt die erste Option.
  return stimmenZweite > stimmenErste ? runde.optionen[1].titel : runde.optionen[0].titel;
}

// --- Ergebnis-Bereich / Neue Runde -----------------------------------------

async function neueRundeStarten() {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    location.href = `raum.html?code=${code}`;
    return;
  }

  aktuellerRaum.state.runde = null;
  await speichereRaum(aktuellerRaum);
  location.href = `raum.html?code=${code}`;
}

swipeJaButton.addEventListener("click", () => swipeAbstimmen("ja"));
swipeNeinButton.addEventListener("click", () => swipeAbstimmen("nein"));
radDrehenButton.addEventListener("click", radDrehen);
fingerFeld.addEventListener("pointerdown", fingerAufgelegt);
fingerFeld.addEventListener("pointerup", fingerEntfernt);
fingerFeld.addEventListener("pointercancel", fingerEntfernt);
tipprennenButton.addEventListener("click", tipprennenKlick);
battleOption0.addEventListener("click", () => battleAbstimmen(0));
battleOption1.addEventListener("click", () => battleAbstimmen(1));
neueRundeButton.addEventListener("click", neueRundeStarten);

ladeUndRendere();
setInterval(ladeUndRendere, 2000);
