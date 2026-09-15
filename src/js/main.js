// Einstiegspunkt der App. Hält den gesamten App-State an einem Ort und
// verdrahtet DOM-Events (Klick/Submit/Input/Change) mit Aktionen, die den
// State verändern und danach neu rendern. Am Ende der Datei folgen die
// Frage-Vorlagen, Fehlertexte, das URL-Routing und die Swipe-Geste als eigene
// Abschnitte, da sie ohne den State auskommen, inhaltlich aber eng zum
// Einstiegspunkt gehören.
import QRCode from "qrcode";
import { createIcons, icons } from "lucide";
import "../styles.css";
import { LIMITS, MODES, WHO_PAYS_VARIANTS } from "./config.js";
import { t } from "./i18n.js";
import {
  addDemoGroup,
  closeLobby,
  completeWheelRound,
  completeWhoPaysRound,
  createLobby,
  createRematch,
  createSuddenDeath,
  getActiveRound,
  isHost,
  joinLobby,
  leaveLobby,
  removeParticipant,
  restoreParticipant,
  setReady,
  simulateRoomVotes,
  startRound,
  submitVote,
  subscribeToLobby,
  toggleLobbyLock,
  updateParticipantIdeas,
} from "./lobby.js";
import {
  createRoundFromInput,
  recordBattleVote,
  spinWheelResult,
} from "./modes.js";
import {
  addHistoryItem,
  clearHistory,
  clearLocalData,
  getLastCloudError,
  loadHistory,
  loadSettings,
  readCloudLobby,
  saveSettings,
  wasLobbyClosed,
} from "./storage.js";
import { renderApp } from "./ui.js";
import { getDefaultComposer } from "./views/room.js";
import { getDefaultQuickOptions } from "./views/quick-pick.js";
import {
  copyText,
  makeShareUrl,
  normalizeCode,
  parseOptionLines,
  sanitizeText,
  randomInt,
} from "./utils.js";

const app = document.querySelector("#app");
const quickParticipant = { id: "quick-user", nickname: "You", isHost: true, isReady: true };
const recordedResults = new Set();

const state = {
  view: "intro",
  routeCode: "",
  lobby: null,
  participant: null,
  settings: loadSettings(),
  history: loadHistory(),
  composer: getDefaultComposer(),
  quickOptions: getDefaultQuickOptions(),
  quickRound: null,
  spinning: null,
  toast: null,
  supabaseIssue: "",
  error: "",
};

let unsubscribeRoom = () => {};
let subscribedCode = "";
let toastTimer = 0;
let roomSyncTimer = 0;
let roomSnapshot = "";

state.composer.title = defaultQuestion(state.composer.category, state.settings.language);

boot();

function boot() {
  app.addEventListener("click", handleClick);
  app.addEventListener("submit", handleSubmit);
  app.addEventListener("input", handleInput);
  app.addEventListener("change", handleChange);
  window.addEventListener("popstate", applyRoute);
  applyRoute();
}

// --- Routing ---

function applyRoute() {
  const route = parseRoute();
  state.error = "";

  if (route.view === "join") {
    state.view = "join";
    state.routeCode = route.code ?? "";
    render();
    return;
  }

  if (route.view === "room" || route.view === "decision") {
    loadRoomRoute(route.code, route.view);
    return;
  }

  state.view = route.view === "home" && shouldShowIntro() ? "intro" : route.view;
  if (route.view !== "quick") {
    state.quickRound = null;
  }
  render();
}

async function loadRoomRoute(code, view) {
  let lobby;
  let participant;

  try {
    lobby = await readCloudLobby(code);
    participant = await restoreParticipant(code);
  } catch (error) {
    state.view = "room";
    state.lobby = null;
    state.participant = null;
    state.error = getFriendlyMessage(error, state.settings.language);
    subscribeToRoom("");
    render();
    return;
  }

  if (!lobby) {
    state.view = "room";
    state.lobby = null;
    state.participant = null;
    state.error = t(state.settings.language, wasLobbyClosed(code) ? "errorRoomClosed" : "errorRoomNotFound");
    subscribeToRoom("");
    render();
    return;
  }

  if (!participant) {
    state.view = "join";
    state.routeCode = code;
    state.lobby = null;
    state.participant = null;
    render();
    return;
  }

  setCurrentRoom(lobby, participant);
  state.view = shouldAutoOpenDecision(lobby, participant, view) ? "decision" : view;
  render();
}

function navigate(view) {
  const path = pathForView(view, state.lobby?.code);
  window.history.pushState({}, "", path);
  applyRoute();
}

// --- Raum-Synchronisierung ---

function setCurrentRoom(lobby, participant = null) {
  state.lobby = lobby;
  state.participant =
    participant ??
    lobby.participants.find((item) => item.id === state.participant?.id) ??
    null;
  roomSnapshot = getRoomSnapshot(lobby);
  if (shouldAutoOpenDecision(lobby, state.participant, state.view)) {
    state.view = "decision";
    window.history.replaceState({}, "", `/room/${lobby.code}/pick`);
  }
  subscribeToRoom(lobby.code);
  startRoomAutoSync(lobby.code);
  recordCompletedResults(lobby);
}

function subscribeToRoom(code) {
  if (subscribedCode === code) {
    return;
  }

  unsubscribeRoom();
  subscribedCode = code;

  if (!code) {
    unsubscribeRoom = () => {};
    stopRoomAutoSync();
    return;
  }

  unsubscribeRoom = subscribeToLobby(code, (lobby, eventType) => {
    if (!lobby) {
      state.lobby = null;
      state.participant = null;
      state.error = t(state.settings.language, eventType === "room:closed" ? "errorRoomClosed" : "errorRoomNotFound");
      state.view = "room";
      render();
      return;
    }

    setCurrentRoom(lobby);
    render();
  });
}

function shouldAutoOpenDecision(lobby, participant, view) {
  const activeRound = getActiveRound(lobby);
  return view === "room" && !isHost(participant) && activeRound?.status === "voting";
}

function startRoomAutoSync(code) {
  window.clearInterval(roomSyncTimer);
  roomSyncTimer = window.setInterval(() => syncCurrentRoom(code), 1500);
}

function stopRoomAutoSync() {
  window.clearInterval(roomSyncTimer);
  roomSyncTimer = 0;
  roomSnapshot = "";
}

async function syncCurrentRoom(code) {
  if (!state.lobby || state.lobby.code !== code) {
    return;
  }

  try {
    const lobby = await readCloudLobby(code);
    const nextSnapshot = getRoomSnapshot(lobby);

    if (!lobby || nextSnapshot === roomSnapshot) {
      return;
    }

    setCurrentRoom(lobby);
    render();
  } catch {
    // Subscription errors are surfaced through normal room actions.
  }
}

function getRoomSnapshot(lobby) {
  return lobby ? JSON.stringify(lobby) : "";
}

function updateRoom(lobby) {
  setCurrentRoom(lobby);
  render();
}

function recordCompletedResults(lobby) {
  lobby.rounds
    .filter((round) => round.status === "completed" && round.result && !recordedResults.has(round.id))
    .forEach((round) => {
      const modeLabel = MODES.find((mode) => mode.id === round.mode)?.label ?? round.mode;
      addHistoryItem({
        roundId: round.id,
        roomCode: lobby.code,
        winner: round.result.winnerLabel,
        mode: modeLabel,
        createdAt: round.completedAt || new Date().toISOString(),
      });
      recordedResults.add(round.id);
    });

  state.history = loadHistory();
}

// --- Rendering ---

function render() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.classList.toggle("reduce-motion", state.settings.reduceMotion);
  state.supabaseIssue = cloudIssueMessage();
  app.innerHTML = renderApp(state);
  createIcons({ icons });
  renderQrCode();
  bindSwipeGesture({ reduceMotion: state.settings.reduceMotion, onVote: voteSwipe });
}

async function renderQrCode() {
  const canvas = document.querySelector("#room-qr");
  if (!canvas || !state.lobby) {
    return;
  }

  try {
    await QRCode.toCanvas(canvas, makeShareUrl(state.lobby.code), {
      width: 180,
      margin: 1,
      color: {
        dark: "#111C35",
        light: "#FFFFFF",
      },
    });
  } catch {
    showToast(t(state.settings.language, "toastQrUnavailable"), "error", false);
  }
}

// --- Event-Handler ---

async function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) {
    return;
  }

  const action = button.dataset.action;

  try {
    if (action === "finish-intro") {
      markIntroSeen();
      navigate("home");
    } else if (action === "navigate") {
      navigate(button.dataset.view);
    } else if (action === "shuffle-question") {
      shuffleQuestion();
    } else if (action === "select-mode") {
      selectMode(button.dataset.mode);
    } else if (action === "toggle-ready") {
      await toggleReady();
    } else if (action === "toggle-lock") {
      await toggleRoomLock();
    } else if (action === "add-demo-group") {
      updateRoom(await addDemoGroup(state.lobby.code));
      showToast(t(state.settings.language, "toastDemoGroup"));
    } else if (action === "copy-link") {
      copyRoomLink(button.dataset.link);
    } else if (action === "copy-code") {
      copyRoomCode(button.dataset.code);
    } else if (action === "copy-result") {
      copyResult(button.dataset.result);
    } else if (action === "share-room") {
      shareRoom(button.dataset.link);
    } else if (action === "remove-participant") {
      updateRoom(await removeParticipant(state.lobby.code, button.dataset.participantId));
    } else if (action === "leave-room") {
      await leaveCurrentRoom();
    } else if (action === "close-room") {
      await closeCurrentRoom();
    } else if (action === "open-decision") {
      navigate("decision");
    } else if (action === "back-room" || action === "new-pick") {
      navigate("room");
    } else if (action === "swipe-vote") {
      await voteSwipe(button.dataset.optionId, button.dataset.vote);
    } else if (action === "blind-vote") {
      await voteBlind(button.dataset.optionId);
    } else if (action === "battle-vote") {
      await voteBattle(button.dataset.optionId);
    } else if (action === "spin-wheel") {
      await runSpinAnimation("wheel");
    } else if (action === "run-who-pays") {
      await runSpinAnimation("whoPays");
    } else if (action === "simulate-votes") {
      await simulateVotes();
    } else if (action === "sudden-death") {
      await startSuddenDeath();
    } else if (action === "rematch") {
      await startRematch();
    } else if (action === "toggle-theme") {
      toggleTheme();
    } else if (action === "set-language") {
      setLanguage(button.dataset.language);
    } else if (action === "toggle-motion") {
      toggleMotion();
    } else if (action === "clear-local-data") {
      resetLocalData();
    } else if (action === "clear-history") {
      clearRecentHistory();
    } else if (action === "quick-reset") {
      resetQuickPick();
    } else if (action === "quick-battle-vote") {
      voteQuickBattle(button.dataset.optionId);
    }
  } catch (error) {
    handleUserError(error);
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const formType = form.dataset.form;
  const data = new FormData(form);

  try {
    if (formType === "create-room") {
      await submitCreateRoom(data);
    } else if (formType === "join-room") {
      await submitJoinRoom(data);
    } else if (formType === "home-join") {
      submitHomeJoin(data);
    } else if (formType === "start-round") {
      await submitStartRound(data);
    } else if (formType === "save-ideas") {
      await submitIdeas(data);
    } else if (formType === "quick-pick") {
      submitQuickPick(form, event.submitter);
    }
  } catch (error) {
    handleUserError(error);
  }
}

function handleInput(event) {
  const field = event.target.dataset.composerField;

  if (field) {
    state.composer[field] = event.target.value;
  }

  if (event.target.name === "code") {
    event.target.value = normalizeCode(event.target.value);
  }

  if (event.target.name === "options" && state.view === "quick") {
    state.quickOptions = event.target.value;
  }
}

function handleChange(event) {
  const field = event.target.dataset.composerField;

  if (!field) {
    return;
  }

  state.composer[field] = event.target.value;

  if (field === "category") {
    state.composer.title = defaultQuestion(event.target.value, state.settings.language);
    render();
  }
}

// --- Formular-Aktionen ---

async function submitCreateRoom(data) {
  applyComposerFromForm(data);
  const result = await createLobby(data.get("nickname"), data.get("ideas"));
  state.settings.lastNickname = result.participant.nickname;
  saveSettings(state.settings);
  setCurrentRoom(result.lobby, result.participant);
  state.view = "room";
  window.history.pushState({}, "", `/room/${result.lobby.code}`);
  showToast(t(state.settings.language, getLastCloudError() ? "toastRoomCreatedLocal" : "toastRoomCreated"));
}

function applyComposerFromForm(data) {
  const category = sanitizeText(data.get("category"), 40);
  const title = sanitizeText(data.get("title"), LIMITS.title);
  const mode = sanitizeText(data.get("mode"), 24);

  if (category) {
    state.composer.category = category;
  }

  if (title) {
    state.composer.title = title;
  }

  if (MODES.some((item) => item.id === mode)) {
    state.composer.mode = mode;
  }
}

async function submitJoinRoom(data) {
  const result = await joinLobby(data.get("code"), data.get("nickname"), data.get("ideas"));
  state.settings.lastNickname = result.participant.nickname;
  saveSettings(state.settings);
  setCurrentRoom(result.lobby, result.participant);
  state.view = "room";
  window.history.pushState({}, "", `/room/${result.lobby.code}`);
  showToast(t(state.settings.language, "toastJoinedRoom"));
}

function submitHomeJoin(data) {
  const code = normalizeCode(data.get("code"));

  if (code.length !== LIMITS.code) {
    throw createAppError("invalid-code", t(state.settings.language, "errorInvalidCode"));
  }

  state.routeCode = code;
  window.history.pushState({}, "", `/join/${code}`);
  applyRoute();
}

async function submitStartRound() {
  const lobby = await startRound(state.lobby.code, state.participant.id, {
    ...state.composer,
  });
  setCurrentRoom(lobby);
  state.view = "decision";
  window.history.pushState({}, "", `/room/${lobby.code}/pick`);
  render();
}

async function submitIdeas(data) {
  updateRoom(await updateParticipantIdeas(state.lobby.code, state.participant.id, data.get("ideas")));
  showToast(t(state.settings.language, "toastIdeasSaved"));
}

function submitQuickPick(form, submitter) {
  const mode = submitter?.dataset.quickMode ?? "wheel";
  const data = new FormData(form);
  const options = parseOptionLines(data.get("options"));

  if (options.length < 2) {
    throw createAppError("missing-options", t(state.settings.language, "errorMissingOptions"));
  }

  if (mode === "random") {
    const winner = options[randomInt(options.length)];
    state.quickRound = {
      id: "quick-random",
      mode: "random",
      status: "completed",
      result: {
        headline: t(state.settings.language, "pickrHasDecided"),
        winnerLabel: winner,
        copy: state.settings.language === "de" ? "Kein Raum nötig." : "No room needed.",
      },
    };
    render();
    return;
  }

  const round = createRoundFromInput(
    {
      title: "Quick Pick",
      category: "Custom",
      mode: mode === "battle" ? "battle" : "wheel",
      options,
      variant: WHO_PAYS_VARIANTS[0],
    },
    quickParticipant.id,
    [quickParticipant],
  );

  if (mode === "wheel") {
    spinWheelResult(round);
  }

  state.quickRound = round;
  render();
}

function selectMode(mode) {
  state.composer.mode = mode;

  if (mode === "whoPays") {
    state.composer.category = "Who Pays";
    state.composer.title = defaultQuestion("Who Pays", state.settings.language);
  } else if (state.composer.category === "Who Pays") {
    state.composer.category = "Food";
    state.composer.title = defaultQuestion("Food", state.settings.language);
  }

  render();
}

function shuffleQuestion() {
  const templates = questionTemplates(state.composer.category, state.settings.language);
  const choices = templates.filter((question) => question !== state.composer.title);
  const pool = choices.length ? choices : templates;
  state.composer.title = pool[randomInt(pool.length)] ?? defaultQuestion(state.composer.category, state.settings.language);
  render();
}

// --- Spiel-Aktionen (Voten, Spinnen, Rematch) ---

async function toggleReady() {
  updateRoom(await setReady(state.lobby.code, state.participant.id, !state.participant.isReady));
}

async function toggleRoomLock() {
  const lobby = await toggleLobbyLock(state.lobby.code, state.participant.id);
  updateRoom(lobby);
  showToast(t(state.settings.language, lobby.isLocked ? "toastRoomLocked" : "toastRoomUnlocked"));
}

async function voteSwipe(optionId, vote) {
  const lobby = await submitVote(state.lobby.code, state.participant.id, state.lobby.activeRoundId, {
    optionId,
    vote,
  });
  updateRoom(lobby);
}

async function voteBlind(optionId) {
  updateRoom(await submitVote(state.lobby.code, state.participant.id, state.lobby.activeRoundId, { optionId }));
}

async function voteBattle(optionId) {
  updateRoom(await submitVote(state.lobby.code, state.participant.id, state.lobby.activeRoundId, { optionId }));
}

async function simulateVotes() {
  updateRoom(await simulateRoomVotes(state.lobby.code, state.participant.id, state.lobby.activeRoundId));
}

async function runSpinAnimation(mode) {
  const round = getActiveRound(state.lobby);

  if (!round) {
    return;
  }

  try {
    state.spinning = { roundId: round.id, mode };

    if (mode === "wheel") {
      updateRoom(await completeWheelRound(state.lobby.code, state.participant.id, round.id));
    } else {
      const variant = document.querySelector("[data-who-pays-variant]")?.value ?? WHO_PAYS_VARIANTS[0];
      updateRoom(await completeWhoPaysRound(state.lobby.code, state.participant.id, round.id, variant));
    }

    window.setTimeout(() => {
      state.spinning = null;
      render();
    }, state.settings.reduceMotion ? 150 : 1550);
  } catch (error) {
    state.spinning = null;
    handleUserError(error);
  }
}

async function startSuddenDeath() {
  updateRoom(await createSuddenDeath(state.lobby.code, state.participant.id, state.lobby.activeRoundId));
  navigate("decision");
}

async function startRematch() {
  updateRoom(await createRematch(state.lobby.code, state.participant.id, state.lobby.activeRoundId));
  navigate("decision");
}

function resetQuickPick() {
  state.quickRound = null;
  state.quickOptions = getDefaultQuickOptions();
  render();
}

function shouldShowIntro() {
  try {
    return window.sessionStorage.getItem("pickr:intro-seen") !== "1";
  } catch {
    return true;
  }
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem("pickr:intro-seen", "1");
  } catch {
    // Session storage is optional; the intro button still navigates.
  }
}

function voteQuickBattle(optionId) {
  recordBattleVote(state.quickRound, quickParticipant.id, optionId, [quickParticipant]);
  render();
}

// --- Teilen & Kopieren ---

function copyRoomLink(link) {
  copyText(link).then(
    () => showToast(t(state.settings.language, "toastLinkCopied")),
    () => showToast(t(state.settings.language, "toastCopyFailed"), "error"),
  );
}

function copyRoomCode(code) {
  copyText(normalizeCode(code)).then(
    () => showToast(t(state.settings.language, "toastCodeCopied")),
    () => showToast(t(state.settings.language, "toastCopyFailed"), "error"),
  );
}

function copyResult(result) {
  copyText(result).then(
    () => showToast(t(state.settings.language, "toastResultCopied")),
    () => showToast(t(state.settings.language, "toastCopyFailed"), "error"),
  );
}

function shareRoom(link) {
  if (navigator.share) {
    const lang = state.settings.language;
    navigator
      .share({
        title: lang === "de" ? "Tritt meinem Pickr-Raum bei" : "Join my Pickr room",
        text: `${t(lang, "room")} ${state.lobby.code}`,
        url: link,
      })
      .catch(() => {});
    return;
  }

  copyRoomLink(link);
}

async function closeCurrentRoom() {
  await closeLobby(state.lobby.code);
  state.lobby = null;
  state.participant = null;
  showToast(t(state.settings.language, "toastRoomClosed"));
  navigate("home");
}

async function leaveCurrentRoom() {
  const code = state.lobby.code;
  await leaveLobby(code, state.participant.id);
  state.lobby = null;
  state.participant = null;
  showToast(t(state.settings.language, "toastLeftRoom"));
  navigate("home");
}

// --- Einstellungen ---

function toggleTheme() {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  saveSettings(state.settings);
  render();
}

function setLanguage(language) {
  const shouldLocalizeQuestion = isTemplateQuestion(state.composer.title);
  state.settings.language = language === "de" ? "de" : "en";
  if (shouldLocalizeQuestion) {
    state.composer.title = defaultQuestion(state.composer.category, state.settings.language);
  }
  saveSettings(state.settings);
  render();
}

function toggleMotion() {
  state.settings.reduceMotion = !state.settings.reduceMotion;
  saveSettings(state.settings);
  render();
}

function resetLocalData() {
  clearLocalData();
  state.settings = loadSettings();
  state.history = loadHistory();
  state.lobby = null;
  state.participant = null;
  state.error = "";
  showToast(t(state.settings.language, "toastLocalDataCleared"));
  navigate("home");
}

function clearRecentHistory() {
  clearHistory();
  state.history = [];
  showToast(t(state.settings.language, "toastHistoryCleared"));
  render();
}

// --- Fehler & Toasts ---

function handleUserError(error) {
  const message = getFriendlyMessage(error, state.settings.language);
  state.error = message;
  showToast(message, "error");
  render();
}

function showToast(message, type = "success", rerender = true) {
  window.clearTimeout(toastTimer);
  state.toast = { message: sanitizeText(message, 120), type };
  if (rerender) {
    render();
  }

  toastTimer = window.setTimeout(() => {
    state.toast = null;
    render();
  }, 2600);
}

// === Frage-Vorlagen ===
// Liefert Standard-/Zufallsfragen pro Kategorie und Sprache, und erkennt, ob
// ein Fragetext eine dieser Vorlagen ist (statt frei getippt).

const QUESTION_TEMPLATES = {
  en: {
    Food: [
      "What should we eat tonight?",
      "Where should we order from?",
      "What feels worth leaving the house for?",
    ],
    Movies: [
      "What should we watch?",
      "What movie fits tonight?",
      "What are we actually in the mood for?",
    ],
    Activities: [
      "What should we do?",
      "What should we do for the next few hours?",
      "What plan sounds the least boring?",
    ],
    Travel: [
      "Where should we go?",
      "What should be our next trip?",
      "Which place deserves the next weekend?",
    ],
    Games: [
      "What should we play?",
      "What game should start the night?",
      "What are we all okay losing at?",
    ],
    Party: [
      "What is the plan tonight?",
      "Where should the night start?",
      "What plan keeps everyone happy?",
    ],
    Shopping: [
      "What should we buy?",
      "Which option is actually worth it?",
      "What should make it into the cart?",
    ],
    "Who Pays": [
      "Who pays tonight?",
      "Who picks up this round?",
      "Who gets lucky tonight?",
    ],
    Custom: [
      "What should we pick?",
      "Which option wins?",
      "What should Pickr decide?",
    ],
  },
  de: {
    Food: [
      "Was essen wir heute?",
      "Wo bestellen wir?",
      "Wofür lohnt es sich, rauszugehen?",
    ],
    Movies: [
      "Was schauen wir?",
      "Welcher Film passt heute?",
      "Worauf haben wir wirklich Lust?",
    ],
    Activities: [
      "Was machen wir?",
      "Was machen wir die nächsten Stunden?",
      "Welcher Plan klingt am besten?",
    ],
    Travel: [
      "Wo geht es hin?",
      "Was wird unser nächster Trip?",
      "Welcher Ort verdient das nächste Wochenende?",
    ],
    Games: [
      "Was spielen wir?",
      "Welches Spiel startet den Abend?",
      "Worin verlieren wir alle freiwillig?",
    ],
    Party: [
      "Was ist der Plan heute Abend?",
      "Wo startet die Nacht?",
      "Welcher Plan hält alle happy?",
    ],
    Shopping: [
      "Was kaufen wir?",
      "Welche Option lohnt sich wirklich?",
      "Was landet im Warenkorb?",
    ],
    "Who Pays": [
      "Wer zahlt heute?",
      "Wer übernimmt diese Runde?",
      "Wer hat heute Glück?",
    ],
    Custom: [
      "Was soll Pickr entscheiden?",
      "Welche Option gewinnt?",
      "Was wählen wir?",
    ],
  },
};

function questionTemplates(category, language = "en") {
  const localizedQuestions = QUESTION_TEMPLATES[language] ?? QUESTION_TEMPLATES.en;
  return localizedQuestions[category] ?? localizedQuestions.Custom;
}

function defaultQuestion(category, language) {
  return questionTemplates(category, language)[0] ?? "What should we pick?";
}

function isTemplateQuestion(title) {
  const categories = ["Food", "Movies", "Activities", "Travel", "Games", "Party", "Shopping", "Who Pays", "Custom"];
  return categories.some((category) =>
    ["en", "de"].some((language) => questionTemplates(category, language).includes(title)),
  );
}

// === Fehlertexte ===
// Übersetzt technische Fehler (App- und Supabase-Fehler) in freundliche,
// sprachabhängige Nutzer-Meldungen.

function getFriendlyMessage(error, language) {
  if (isSupabaseSetupError(error)) {
    return t(language, "errorSupabaseSetup");
  }

  const messages = {
    "already-voted": "errorAlreadyVoted",
    "invalid-code": "errorInvalidCode",
    "missing-nickname": "errorMissingNickname",
    "missing-ideas": "errorMissingIdeas",
    "missing-options": "errorMissingOptions",
    "nickname-used": "errorNicknameUsed",
    "not-ready": "errorNotReady",
    "not-enough-people": "errorNotEnoughPeople",
    "not-host": "errorNotHost",
    "room-closed": "errorRoomClosed",
    "room-expired": "errorRoomExpired",
    "room-full": "errorRoomFull",
    "room-locked": "errorRoomLocked",
    "room-not-found": "errorRoomNotFound",
    "round-limit": "errorRoundLimit",
  };

  return t(language, messages[error?.code] ?? "errorGeneric");
}

function isSupabaseSetupError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  const code = String(error?.code ?? "");

  return (
    code === "PGRST204" ||
    code === "42P01" ||
    code === "42501" ||
    message.includes("schema cache") ||
    message.includes("column") && message.includes("state") ||
    message.includes("relation") && message.includes("lobbies") ||
    message.includes("row-level security") ||
    message.includes("violates row-level security") ||
    message.includes("permission denied")
  );
}

function createAppError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cloudIssueMessage() {
  const error = getLastCloudError();

  if (!error) {
    return "";
  }

  const code = error.code ? `${error.code}: ` : "";
  return sanitizeText(`${code}${error.message ?? error}`, 180);
}

// === URL-Routing ===
// Liest die aktuelle Browser-Adresse in eine {view, code}-Angabe ein und baut
// umgekehrt den passenden Pfad für eine Ansicht.

function parseRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const joinMatch = path.match(/^\/join\/([A-Za-z0-9]{1,12})$/);
  const roomMatch = path.match(/^\/room\/([A-Za-z0-9]{1,12})$/);
  const decisionMatch = path.match(/^\/room\/([A-Za-z0-9]{1,12})\/pick$/);
  const simpleRoutes = new Set(["/intro", "/create", "/join", "/history", "/settings", "/quick", "/impressum", "/datenschutz"]);

  if (joinMatch) {
    return { view: "join", code: normalizeCode(joinMatch[1]) };
  }

  if (roomMatch) {
    return { view: "room", code: normalizeCode(roomMatch[1]) };
  }

  if (decisionMatch) {
    return { view: "decision", code: normalizeCode(decisionMatch[1]) };
  }

  if (simpleRoutes.has(path)) {
    return { view: path.slice(1) };
  }

  return { view: "home" };
}

function pathForView(view, lobbyCode) {
  if (view === "home") {
    return "/";
  }

  if (view === "room" && lobbyCode) {
    return `/room/${lobbyCode}`;
  }

  if (view === "decision" && lobbyCode) {
    return `/room/${lobbyCode}/pick`;
  }

  return `/${view}`;
}

// === Swipe-Geste ===
// Bindet Pointer-Events an die aktuell sichtbare Swipe-Karte, so dass man sie
// ziehen und per Wurf (statt nur per Klick) abstimmen kann.

function bindSwipeGesture({ reduceMotion, onVote }) {
  const card = document.querySelector("[data-swipe-card]");
  if (!card) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let dragging = false;

  const reset = () => {
    card.style.transform = "";
    card.style.opacity = "";
  };

  card.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    card.setPointerCapture(event.pointerId);
    card.classList.add("is-dragging");
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }

    currentX = event.clientX - startX;
    currentY = event.clientY - startY;
    const rotation = currentX / 16;
    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
    card.style.opacity = String(1 - Math.min(Math.abs(currentX) / 420, 0.45));
  });

  card.addEventListener("pointerup", () => {
    dragging = false;
    card.classList.remove("is-dragging");

    if (Math.abs(currentX) < 90) {
      reset();
      return;
    }

    const vote = currentX > 0 ? "yes" : "no";
    card.classList.add(vote === "yes" ? "fly-right" : "fly-left");
    window.setTimeout(() => onVote(card.dataset.optionId, vote), reduceMotion ? 20 : 180);
  });

  card.addEventListener("pointercancel", () => {
    dragging = false;
    card.classList.remove("is-dragging");
    reset();
  });
}
