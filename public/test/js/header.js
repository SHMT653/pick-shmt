// Auf jeder Seite eingebunden: zeigt im Header einen Schnellzugriff "Mein Raum",
// wenn gerade (oder zuletzt) ein Raum beigetreten/erstellt wurde - dafuer wird
// einfach der schon vorhandene pickrIch-Eintrag aus dem Beitreten/Erstellen
// wiederverwendet, keine eigene Datenhaltung noetig.
const meinRaumLink = document.getElementById("mein-raum-link");

if (meinRaumLink) {
  const ich = JSON.parse(localStorage.getItem("pickrIch") || "null");

  if (ich && ich.code) {
    meinRaumLink.href = `/test/raum.html?code=${ich.code}`;
    meinRaumLink.hidden = false;
  }
}
