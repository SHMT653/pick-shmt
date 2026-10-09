const params = new URLSearchParams(location.search);
const code = params.get("code");
const ich = JSON.parse(localStorage.getItem("pickrIch") || "null");

if (!code || !ich || ich.code !== code) {
  location.href = "/test/beitreten.html";
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

const mehrheitListe = document.getElementById("mehrheit-liste");
const mehrheitWarten = document.getElementById("mehrheit-warten");

const battleOption0 = document.getElementById("battle-option-0");
const battleOption1 = document.getElementById("battle-option-1");
const battleWarten = document.getElementById("battle-warten");

let raum = null;
let letzterStand = "";
let aktuelleSwipeOptionId = null;

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
    location.href = `/test/raum.html?code=${code}`;
    return;
  }

  fragenAnzeige.textContent = runde.frage;

  if (runde.status === "fertig") {
    zeigeNur("ergebnis-bereich");
    ergebnisText.textContent = runde.ergebnis;
    zurueckLink.href = `/test/raum.html?code=${code}`;
    return;
  }

  zeigeNur(`modus-${runde.modus}`);

  if (runde.modus === "swipe") rendereSwipe(runde);
  else if (runde.modus === "rad") rendereRad(runde);
  else if (runde.modus === "mehrheit") rendereMehrheit(runde);
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

// --- Mehrheit ----------------------------------------------------------------
// Jede:r stimmt einmal fuer die Lieblingsoption, Option mit den meisten
// Stimmen gewinnt (anders als Battle: beliebig viele Optionen statt nur 2).

function rendereMehrheit(runde) {
  const meineStimme = runde.stimmen.find((s) => s.teilnehmerId === ich.teilnehmerId);
  mehrheitWarten.hidden = !meineStimme;

  mehrheitListe.innerHTML = "";
  runde.optionen.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mehrheit-option";
    button.textContent = option.titel;
    button.disabled = Boolean(meineStimme);
    button.addEventListener("click", () => mehrheitAbstimmen(option.id));
    mehrheitListe.appendChild(button);
  });
}

async function mehrheitAbstimmen(optionId) {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    return;
  }

  const aktuelleRunde = aktuellerRaum.state.runde;
  if (aktuelleRunde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId)) {
    return;
  }

  aktuelleRunde.stimmen.push({ teilnehmerId: ich.teilnehmerId, optionId });

  if (aktuelleRunde.stimmen.length >= aktuellerRaum.state.teilnehmer.length) {
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = ermittleMehrheitsGewinner(aktuelleRunde);
  }

  await speichereRaum(aktuellerRaum);
  raum = aktuellerRaum;
  letzterStand = JSON.stringify(raum);
  rendereRunde();
}

function ermittleMehrheitsGewinner(runde) {
  // Bei Gleichstand gewinnt die zuerst erstellte Option.
  let gewinner = runde.optionen[0];
  let meisteStimmen = -1;

  runde.optionen.forEach((option) => {
    const anzahl = runde.stimmen.filter((s) => s.optionId === option.id).length;
    if (anzahl > meisteStimmen) {
      meisteStimmen = anzahl;
      gewinner = option;
    }
  });

  return gewinner.titel;
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
    location.href = `/test/raum.html?code=${code}`;
    return;
  }

  aktuellerRaum.state.runde = null;
  await speichereRaum(aktuellerRaum);
  location.href = `/test/raum.html?code=${code}`;
}

swipeJaButton.addEventListener("click", () => swipeAbstimmen("ja"));
swipeNeinButton.addEventListener("click", () => swipeAbstimmen("nein"));
radDrehenButton.addEventListener("click", radDrehen);
battleOption0.addEventListener("click", () => battleAbstimmen(0));
battleOption1.addEventListener("click", () => battleAbstimmen(1));
neueRundeButton.addEventListener("click", neueRundeStarten);

ladeUndRendere();
// Jede Sekunde neu laden (statt alle 2s) - fuehlt sich fuer alle Mitspieler:innen
// deutlich schneller synchron an, ohne die Datenbank spuerbar mehr zu belasten.
setInterval(ladeUndRendere, 1000);
