// Solo-Tools: brauchen keinen Raum und keine Datenbank - alles bleibt lokal in
// diesem einen Browser-Tab, deshalb kein api.js auf dieser Seite nötig.

// --- Auswahl: welches Tool wird gerade gezeigt? -----------------------------

const auswahlBereich = document.getElementById("solo-auswahl");
const werMussBereich = document.getElementById("solo-wer-muss");
const muenzeBereich = document.getElementById("solo-muenze");

function zeigeTool(tool) {
  auswahlBereich.hidden = true;
  werMussBereich.hidden = tool !== "wer-muss";
  muenzeBereich.hidden = tool !== "muenze";
}

function zeigeAuswahl() {
  auswahlBereich.hidden = false;
  werMussBereich.hidden = true;
  muenzeBereich.hidden = true;
}

document.querySelectorAll("#solo-auswahl .modus-kachel").forEach((kachel) => {
  kachel.addEventListener("click", () => zeigeTool(kachel.dataset.tool));
});

document.querySelectorAll('[data-action="zurueck"]').forEach((button) => {
  button.addEventListener("click", zeigeAuswahl);
});

// --- Wer muss...? (Finger-Methode) ------------------------------------------

const frageInput = document.getElementById("solo-frage");
const fingerFeld = document.getElementById("solo-finger-feld");
const fingerStatus = document.getElementById("solo-finger-status");
const nochmalButton = document.getElementById("solo-finger-reset");

const fingerPositionen = new Map();
let fingerTimer = null;
let fingerGewinnerIndex = null;

function fingerPositionBerechnen(event) {
  const rect = fingerFeld.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
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
  fingerStatus.textContent = fingerPositionen.size ? `${fingerPositionen.size} Finger erkannt` : "";
}

function fingerGewinnerErmitteln() {
  if (fingerPositionen.size < 2 || fingerGewinnerIndex !== null) {
    return;
  }

  fingerGewinnerIndex = Math.floor(Math.random() * fingerPositionen.size);
  rendereFingerRinge();

  const frage = frageInput.value.trim() || "Wer ist dran";
  fingerStatus.textContent = `Finger ${fingerGewinnerIndex + 1}: ${frage}!`;
  nochmalButton.hidden = false;
}

function nochmal() {
  fingerPositionen.clear();
  fingerGewinnerIndex = null;
  clearTimeout(fingerTimer);
  fingerFeld.innerHTML = "";
  fingerStatus.textContent = "";
  nochmalButton.hidden = true;
}

fingerFeld.addEventListener("pointerdown", fingerAufgelegt);
fingerFeld.addEventListener("pointerup", fingerEntfernt);
fingerFeld.addEventListener("pointercancel", fingerEntfernt);
nochmalButton.addEventListener("click", nochmal);

// --- Münzwurf ----------------------------------------------------------------

const muenze = document.getElementById("muenze");
const muenzeErgebnis = document.getElementById("muenze-ergebnis");
const muenzeButton = document.getElementById("muenze-werfen-button");

function muenzeWerfen() {
  muenzeButton.disabled = true;
  muenzeErgebnis.textContent = "";

  const istKopf = Math.random() < 0.5;

  // Klasse entfernen und per Reflow (offsetWidth lesen) erzwingen, dass die
  // CSS-Animation bei einem erneuten Wurf wirklich neu von vorne startet.
  muenze.classList.remove("wirft-kopf", "wirft-zahl");
  void muenze.offsetWidth;
  muenze.classList.add(istKopf ? "wirft-kopf" : "wirft-zahl");

  setTimeout(() => {
    muenzeErgebnis.textContent = istKopf ? "Kopf!" : "Zahl!";
    muenzeButton.disabled = false;
  }, 900);
}

muenzeButton.addEventListener("click", muenzeWerfen);
