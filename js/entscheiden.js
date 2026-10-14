const params = new URLSearchParams(location.search);
const code = params.get("code");
const ich = JSON.parse(localStorage.getItem("pickrIch") || "null");

if (!code || !ich || ich.code !== code) {
  location.href = "/beitreten.html";
}

const fragenAnzeige = document.getElementById("frage-anzeige");

const ergebnisBereich = document.getElementById("ergebnis-bereich");
const ergebnisText = document.getElementById("ergebnis-text");
const zurueckLink = document.getElementById("zurueck-link");
const neueRundeButton = document.getElementById("neue-runde-button");

const swipeFortschritt = document.getElementById("swipe-fortschritt");
const swipeInhalt = document.getElementById("swipe-inhalt");
const swipeKarte = document.getElementById("swipe-karte");
const swipeTitel = document.getElementById("swipe-titel");
const swipeWarten = document.getElementById("swipe-warten");
const swipeJaButton = document.getElementById("swipe-ja");
const swipeNeinButton = document.getElementById("swipe-nein");

const radKreis = document.getElementById("rad-kreis");
const radLegende = document.getElementById("rad-legende");
const radDrehenButton = document.getElementById("rad-drehen-button");
const radWarten = document.getElementById("rad-warten");

// Die Segment-Farben des Glücksrads, der Reihe nach fuer jede Option.
const RAD_FARBEN = ["#6657f5", "#55e6b5", "#ffbe55", "#ff637d", "#2bb98a", "#8b7cf6"];

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
    location.href = `/raum.html?code=${code}`;
    return;
  }

  fragenAnzeige.textContent = runde.frage;

  if (runde.status === "fertig") {
    zeigeNur("ergebnis-bereich");
    ergebnisText.textContent = runde.ergebnis;
    zurueckLink.href = `/raum.html?code=${code}`;
    merkeImVerlauf(runde);
    return;
  }

  zeigeNur(`modus-${runde.modus}`);

  if (runde.modus === "swipe") rendereSwipe(runde);
  else if (runde.modus === "rad") rendereRad(runde);
  else if (runde.modus === "mehrheit") rendereMehrheit(runde);
  else if (runde.modus === "battle") rendereBattle(runde);
}

// Speichert eine Stimme und prueft danach ob sie wirklich angekommen ist.
// Hintergrund: wenn zwei Leute fast gleichzeitig abstimmen, lesen beide den
// gleichen alten Stand, aendern ihn und speichern nacheinander zurueck - die
// zweite Speicherung ueberschreibt die erste dabei komplett, die Stimme davor
// geht verloren und die Runde haengt dann ewig bei "nicht alle fertig" fest.
// "stimmeHinzufuegen" darf die Runde veraendern, "stimmeIstDa" prueft danach
// ob die eigene Stimme drinsteht - falls nicht, wird es nochmal versucht.
async function stimmeSpeichernMitRetry(stimmeHinzufuegen, stimmeIstDa) {
  for (let versuch = 0; versuch < 3; versuch++) {
    const aktuellerRaum = await holeRaum(code);
    if (!aktuellerRaum) {
      return;
    }

    stimmeHinzufuegen(aktuellerRaum.state.runde, aktuellerRaum.state.teilnehmer);
    await speichereRaum(aktuellerRaum);

    const kontrolle = await holeRaum(code);
    if (kontrolle && stimmeIstDa(kontrolle.state.runde)) {
      raum = kontrolle;
      letzterStand = JSON.stringify(raum);
      rendereRunde();
      return;
    }
  }
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

  // Karte fuer die naechste Option wieder an ihren Platz setzen, falls die
  // vorherige noch rausgeflogen war.
  swipeKarte.style.transition = "none";
  swipeKarte.style.transform = "";
}

// Ziehen wie bei Tinder: die Karte folgt per Pointer-Events dem Finger/der
// Maus. Ab einer Schwelle fliegt sie raus und zaehlt als Ja (rechts) oder
// Nein (links), sonst schnappt sie zurueck in die Mitte.
let ziehtGerade = false;
let ziehStartX = 0;
let ziehX = 0;

function swipeZiehenStart(event) {
  if (aktuelleSwipeOptionId === null) {
    return;
  }

  ziehtGerade = true;
  ziehStartX = event.clientX;
  swipeKarte.setPointerCapture(event.pointerId);
  swipeKarte.style.transition = "none";
}

function swipeZiehenBewegen(event) {
  if (!ziehtGerade) {
    return;
  }

  ziehX = event.clientX - ziehStartX;
  const rotation = ziehX / 14;
  swipeKarte.style.transform = `translateX(${ziehX}px) rotate(${rotation}deg)`;
}

function swipeZiehenEnde() {
  if (!ziehtGerade) {
    return;
  }

  ziehtGerade = false;
  swipeKarte.style.transition = "transform 300ms ease";

  const schwelle = 100;
  if (Math.abs(ziehX) < schwelle) {
    swipeKarte.style.transform = "";
    return;
  }

  const stimme = ziehX > 0 ? "ja" : "nein";
  swipeKarte.style.transform = `translateX(${ziehX > 0 ? 600 : -600}px) rotate(${ziehX > 0 ? 30 : -30}deg)`;

  // Erst die Flug-Animation zeigen, dann erst abstimmen/speichern - sonst
  // wird die Karte durch den naechsten rendereRunde()-Aufruf sofort ersetzt.
  setTimeout(() => swipeAbstimmen(stimme), 220);
}

swipeKarte.addEventListener("pointerdown", swipeZiehenStart);
swipeKarte.addEventListener("pointermove", swipeZiehenBewegen);
swipeKarte.addEventListener("pointerup", swipeZiehenEnde);
swipeKarte.addEventListener("pointercancel", swipeZiehenEnde);

async function swipeAbstimmen(stimme) {
  const optionId = aktuelleSwipeOptionId;

  await stimmeSpeichernMitRetry(
    (runde, teilnehmer) => {
      runde.stimmen.push({ teilnehmerId: ich.teilnehmerId, optionId, stimme });

      const insgesamtNoetig = runde.optionen.length * teilnehmer.length;
      if (runde.stimmen.length >= insgesamtNoetig) {
        runde.status = "fertig";
        runde.ergebnis = ermittleSwipeGewinner(runde);
      }
    },
    (runde) => runde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId && s.optionId === optionId),
  );
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
  // Kreis-Segmente per conic-gradient bauen - ein Farbabschnitt pro Option,
  // alle gleich gross. Dazu eine Legende mit Farbpunkt + Name darunter,
  // weil Text direkt auf dem Rad bei vielen Optionen schwer lesbar waere.
  const anzahl = runde.optionen.length;
  const segmentGroesse = 360 / anzahl;

  const segmente = runde.optionen.map((_, i) => {
    const farbe = RAD_FARBEN[i % RAD_FARBEN.length];
    return `${farbe} ${i * segmentGroesse}deg ${(i + 1) * segmentGroesse}deg`;
  });
  radKreis.style.background = `conic-gradient(${segmente.join(", ")})`;

  radLegende.innerHTML = "";
  runde.optionen.forEach((option, i) => {
    const eintrag = document.createElement("li");
    const farbpunkt = document.createElement("span");
    farbpunkt.className = "rad-farbe";
    farbpunkt.style.background = RAD_FARBEN[i % RAD_FARBEN.length];
    eintrag.append(farbpunkt, document.createTextNode(option.titel));
    radLegende.appendChild(eintrag);
  });

  const binHost = Boolean(raum.state.teilnehmer.find((t) => t.id === ich.teilnehmerId)?.istHost);
  radDrehenButton.hidden = !binHost;
  radWarten.hidden = binHost;
}

function radDrehen() {
  radDrehenButton.disabled = true;

  // Der Gewinner steht VOR dem Drehen schon fest - das Rad dreht sich dann
  // gezielt so weit, dass das passende Segment am Zeiger oben landet. So
  // zeigt das Rad wirklich das Ergebnis, statt sich nur zufaellig zu drehen.
  const optionen = raum.state.runde.optionen;
  const segmentGroesse = 360 / optionen.length;
  const gewinnerIndex = Math.floor(Math.random() * optionen.length);
  const gewinnerOption = optionen[gewinnerIndex];
  const segmentMitte = gewinnerIndex * segmentGroesse + segmentGroesse / 2;

  // 5 volle Umdrehungen fuers Spektakel, dann exakt auf die Segment-Mitte.
  radKreis.style.transform = `rotate(${5 * 360 - segmentMitte}deg)`;

  // Erst nach der Dreh-Animation (3s, siehe CSS) wird das Ergebnis gespeichert.
  setTimeout(async () => {
    const aktuellerRaum = await holeRaum(code);
    if (!aktuellerRaum) {
      return;
    }

    const aktuelleRunde = aktuellerRaum.state.runde;
    aktuelleRunde.status = "fertig";
    aktuelleRunde.ergebnis = gewinnerOption.titel;

    await speichereRaum(aktuellerRaum);
    raum = aktuellerRaum;
    letzterStand = JSON.stringify(raum);
    rendereRunde();
  }, 3000);
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
  document.querySelectorAll(".mehrheit-option").forEach((button) => {
    button.disabled = true;
  });

  await stimmeSpeichernMitRetry(
    (runde, teilnehmer) => {
      if (runde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId)) {
        return;
      }

      runde.stimmen.push({ teilnehmerId: ich.teilnehmerId, optionId });

      if (runde.stimmen.length >= teilnehmer.length) {
        runde.status = "fertig";
        runde.ergebnis = ermittleMehrheitsGewinner(runde);
      }
    },
    (runde) => runde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId),
  );
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
  // Sofort sperren, nicht erst wenn das Speichern durch ist - sonst koennte
  // ein zweiter, schneller Klick auf den anderen Button eine zweite Stimme
  // derselben Person auslösen, bevor die erste überhaupt gespeichert ist.
  battleOption0.disabled = true;
  battleOption1.disabled = true;

  await stimmeSpeichernMitRetry(
    (runde, teilnehmer) => {
      if (runde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId)) {
        return;
      }

      const option = runde.optionen[optionIndex];
      runde.stimmen.push({ teilnehmerId: ich.teilnehmerId, optionId: option.id });

      if (runde.stimmen.length >= teilnehmer.length) {
        runde.status = "fertig";
        runde.ergebnis = ermittleBattleGewinner(runde);
      }
    },
    (runde) => runde.stimmen.some((s) => s.teilnehmerId === ich.teilnehmerId),
  );
}

function ermittleBattleGewinner(runde) {
  const stimmenErste = runde.stimmen.filter((s) => s.optionId === runde.optionen[0].id).length;
  const stimmenZweite = runde.stimmen.filter((s) => s.optionId === runde.optionen[1].id).length;
  // Bei Gleichstand gewinnt die erste Option.
  return stimmenZweite > stimmenErste ? runde.optionen[1].titel : runde.optionen[0].titel;
}

// --- Ergebnis-Bereich / Neue Runde -----------------------------------------

const MODUS_NAMEN = { swipe: "Swipe", rad: "Zufallsrad", mehrheit: "Mehrheit", battle: "Battle" };

// Traegt ein fertiges Ergebnis einmalig in den lokalen Verlauf ein (verlauf.html).
// Die Runden-ID verhindert doppelte Eintraege, weil rendereRunde() bei jedem
// Polling-Tick erneut aufgerufen wird, solange die Runde "fertig" ist.
function merkeImVerlauf(runde) {
  const verlauf = JSON.parse(localStorage.getItem("pickrVerlauf") || "[]");
  if (verlauf.some((eintrag) => eintrag.rundenId === runde.id)) {
    return;
  }

  verlauf.unshift({
    rundenId: runde.id,
    raumCode: code,
    modus: MODUS_NAMEN[runde.modus] || runde.modus,
    frage: runde.frage,
    ergebnis: runde.ergebnis,
    datum: new Date().toISOString(),
  });

  // Nur die letzten 30 Eintraege behalten, damit localStorage nicht endlos waechst.
  localStorage.setItem("pickrVerlauf", JSON.stringify(verlauf.slice(0, 30)));
}

async function neueRundeStarten() {
  const aktuellerRaum = await holeRaum(code);
  if (!aktuellerRaum) {
    location.href = `/raum.html?code=${code}`;
    return;
  }

  aktuellerRaum.state.runde = null;
  await speichereRaum(aktuellerRaum);
  location.href = `/raum.html?code=${code}`;
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
