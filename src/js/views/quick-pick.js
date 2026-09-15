// Quick Pick: sofortige Entscheidung ohne Raum (Rad, Battle oder Zufall) über
// eine simple Options-Liste.
import { DEFAULT_OPTIONS_BY_CATEGORY, WHO_PAYS_VARIANTS } from "../config.js";
import { t } from "../i18n.js";
import { escapeHTML } from "../utils.js";
import { getBattlePair } from "../modes.js";
import { wheelResultCopy } from "../ui.js";

const DEFAULT_QUICK_OPTIONS = {
  en: DEFAULT_OPTIONS_BY_CATEGORY.Food.slice(0, 3),
  de: ["Pizza", "Sushi", "Pasta"],
};

export function renderQuickPick(state) {
  const round = state.quickRound;
  const lang = state.settings.language;

  if (round?.status === "completed") {
    return renderQuickResult(state, round);
  }

  if (round?.mode === "battle") {
    const pair = getBattlePair(round);
    return `
      <section class="decision-screen quick-page page-enter">
        <div class="decision-top">
          <button class="icon-action" type="button" title="${escapeHTML(t(lang, "navHome"))}" data-action="quick-reset"><i data-lucide="chevron-left"></i></button>
          <div>
            <span class="eyebrow">${escapeHTML(t(lang, "quickPick"))}</span>
            <h1>${escapeHTML(round.title)}</h1>
          </div>
        </div>
        <div class="battle-stage">
          <button class="battle-card" type="button" data-action="quick-battle-vote" data-option-id="${pair[0]?.id}">
            <span>${escapeHTML(t(lang, "champion"))}</span>
            <strong>${escapeHTML(pair[0]?.title ?? "")}</strong>
          </button>
          <div class="versus">VS</div>
          <button class="battle-card" type="button" data-action="quick-battle-vote" data-option-id="${pair[1]?.id}">
            <span>${escapeHTML(t(lang, "challenger"))}</span>
            <strong>${escapeHTML(pair[1]?.title ?? "")}</strong>
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section class="quick-page center-panel page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "quickPick"))}</span>
        <h1>${escapeHTML(t(lang, "quickHeadline"))}</h1>
      </div>
      <form class="form-panel" data-form="quick-pick">
        <label>
          <span>${escapeHTML(t(lang, "options"))}</span>
          <textarea name="options" rows="6">${escapeHTML(state.quickOptions)}</textarea>
        </label>
        <div class="button-row">
          <button class="primary-action" type="submit" data-quick-mode="wheel">
            <i data-lucide="disc-3"></i>
            <span>${escapeHTML(t(lang, "wheel"))}</span>
          </button>
          <button class="secondary-action" type="submit" data-quick-mode="battle">
            <i data-lucide="swords"></i>
            <span>${escapeHTML(t(lang, "battle"))}</span>
          </button>
          <button class="ghost-action" type="submit" data-quick-mode="random">
            <i data-lucide="dice-5"></i>
            <span>${escapeHTML(t(lang, "random"))}</span>
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderQuickResult(state, round) {
  const lang = state.settings.language;
  const copy = round.result.copy ?? (round.result.type === "wheel" ? wheelResultCopy(round.result, lang) : "");

  return `
    <section class="result-screen page-enter">
      <span class="result-kicker">${escapeHTML(round.result.headline)}</span>
      <h1>${escapeHTML(round.result.winnerLabel)}</h1>
      <p>${escapeHTML(copy)}</p>
      <div class="result-actions">
        <button class="primary-action" type="button" data-action="quick-reset"><i data-lucide="zap"></i><span>${escapeHTML(t(lang, "quickPick"))}</span></button>
        <button class="ghost-action" type="button" data-action="navigate" data-view="home"><i data-lucide="home"></i><span>${escapeHTML(t(lang, "navHome"))}</span></button>
      </div>
    </section>
  `;
}

export function getDefaultQuickOptions(language = "en") {
  return (DEFAULT_QUICK_OPTIONS[language] ?? DEFAULT_QUICK_OPTIONS.en).join("\n");
}

export function isDefaultQuickOptions(value) {
  const normalized = String(value ?? "").trim();
  return Object.values(DEFAULT_QUICK_OPTIONS).some((options) => options.join("\n") === normalized);
}
