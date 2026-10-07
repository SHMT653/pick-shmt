const MODI_MIT_OPTIONEN = ["swipe", "rad", "battle"];

const codeInput = document.getElementById("code");
const ideenFeld = document.getElementById("ideen-feld");
const beitretenForm = document.getElementById("beitreten-form");
const beitretenButton = document.getElementById("beitreten-button");
const fehlerText = document.getElementById("fehler");

function zeigeFehler(text) {
  fehlerText.textContent = text;
  fehlerText.hidden = false;
}

function versteckeFehler() {
  fehlerText.hidden = true;
}

function zerlegeIdeenText(text) {
  return text
    .split("\n")
    .map((zeile) => zeile.trim())
    .filter(Boolean);
}

// Vorschau sobald der Code eingegeben ist: nur wenn der schon geplante Modus Optionen braucht,
// wird das Ideen-Feld überhaupt angezeigt.
async function ideenFeldAktualisieren() {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    return;
  }

  const raum = await holeRaum(code);
  const brauchtIdeen = !raum || !raum.state.runde || MODI_MIT_OPTIONEN.includes(raum.state.runde.modus);
  ideenFeld.hidden = !brauchtIdeen;
}

async function beitretenAbsenden(event) {
  event.preventDefault();
  versteckeFehler();

  const code = codeInput.value.trim().toUpperCase();
  const name = document.getElementById("name").value.trim();
  const ideenRoh = document.getElementById("ideen").value.trim();

  if (!code || !name) {
    zeigeFehler("Bitte Code und Namen ausfüllen.");
    return;
  }

  beitretenButton.disabled = true;
  const raum = await holeRaum(code);
  beitretenButton.disabled = false;

  if (!raum) {
    zeigeFehler("Diesen Raum gibt es nicht (mehr).");
    return;
  }

  const ideen = ideenRoh ? zerlegeIdeenText(ideenRoh) : [];
  const teilnehmerId = crypto.randomUUID();

  // Bereit per Default, außer es läuft schon eine Runde in einem Modus, der Optionen/Ideen
  // braucht - dann soll man erst noch Ideen einreichen können, bevor man "bereit" ist.
  const istBereit = !raum.state.runde || !MODI_MIT_OPTIONEN.includes(raum.state.runde.modus);

  raum.state.teilnehmer.push({ id: teilnehmerId, name, istHost: false, istBereit, ideen });

  beitretenButton.disabled = true;
  const gespeichert = await speichereRaum(raum);
  beitretenButton.disabled = false;

  if (!gespeichert) {
    zeigeFehler("Beitreten hat nicht funktioniert. Bitte nochmal versuchen.");
    return;
  }

  localStorage.setItem("pickrIch", JSON.stringify({ code, teilnehmerId, name }));
  location.href = `/test/raum.html?code=${code}`;
}

codeInput.addEventListener("blur", ideenFeldAktualisieren);
beitretenForm.addEventListener("submit", beitretenAbsenden);
