// Zeigt den lokalen Entscheidungs-Verlauf an, den entscheiden.js bei jeder
// fertigen Runde in localStorage ("pickrVerlauf") einträgt.

const liste = document.getElementById("verlauf-liste");
const leerHinweis = document.getElementById("verlauf-leer");

const verlauf = JSON.parse(localStorage.getItem("pickrVerlauf") || "[]");

if (!verlauf.length) {
  leerHinweis.hidden = false;
}

verlauf.forEach((eintrag) => {
  const datum = new Date(eintrag.datum).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const eintragElement = document.createElement("li");
  eintragElement.className = "verlauf-eintrag";

  const kopf = document.createElement("div");
  kopf.className = "verlauf-kopf";

  const modusSpan = document.createElement("span");
  modusSpan.className = "verlauf-modus";
  modusSpan.textContent = eintrag.modus;

  const datumSpan = document.createElement("span");
  datumSpan.className = "verlauf-datum";
  datumSpan.textContent = `${datum} Uhr`;

  kopf.append(modusSpan, datumSpan);

  const frage = document.createElement("strong");
  frage.textContent = eintrag.frage;

  const ergebnis = document.createElement("span");
  ergebnis.className = "verlauf-ergebnis";
  ergebnis.textContent = eintrag.ergebnis;

  eintragElement.append(kopf, frage, ergebnis);
  liste.appendChild(eintragElement);
});
