const introVideo = document.getElementById("intro-video");
const weiterButton = document.getElementById("weiter-button");
const introSection = document.getElementById("intro");
const startSection = document.getElementById("start");

function zeigeStartBereich() {
  introSection.hidden = true;
  startSection.hidden = false;
  localStorage.setItem("pickrIntroGesehen", "ja");
}

// Intro-Video nur beim allerersten Besuch zeigen - wer schon mal da war,
// landet direkt auf dem Start-Bildschirm.
if (localStorage.getItem("pickrIntroGesehen") === "ja") {
  introVideo.pause();
  introSection.hidden = true;
  startSection.hidden = false;
} else {
  weiterButton.addEventListener("click", zeigeStartBereich);
  introVideo.addEventListener("ended", zeigeStartBereich);
}
