const introButton = document.getElementById("intro-zuruecksetzen-button");
const loeschenButton = document.getElementById("daten-loeschen-button");
const hinweis = document.getElementById("daten-hinweis");

introButton.addEventListener("click", () => {
  localStorage.removeItem("pickrIntroGesehen");
  introButton.textContent = "Erledigt - beim nächsten Besuch wieder zu sehen";
  introButton.disabled = true;
});

loeschenButton.addEventListener("click", () => {
  localStorage.removeItem("pickrIch");
  localStorage.removeItem("pickrIntroGesehen");
  localStorage.removeItem("pickrVerlauf");

  hinweis.textContent = "Erledigt - alle lokalen Daten wurden gelöscht.";
  hinweis.hidden = false;
  loeschenButton.disabled = true;

  // "Mein Raum" im Header soll sofort verschwinden, nicht erst beim naechsten Laden.
  const meinRaumLink = document.getElementById("mein-raum-link");
  if (meinRaumLink) {
    meinRaumLink.hidden = true;
  }
});
