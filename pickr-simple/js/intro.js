const introVideo = document.getElementById("intro-video");
const weiterButton = document.getElementById("weiter-button");
const introSection = document.getElementById("intro");
const startSection = document.getElementById("start");

function zeigeStartBereich() {
  introSection.hidden = true;
  startSection.hidden = false;
}

weiterButton.addEventListener("click", zeigeStartBereich);
introVideo.addEventListener("ended", zeigeStartBereich);
