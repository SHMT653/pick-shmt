// Einstellungen: Sprache, Dark Mode, reduzierte Bewegung, lokale Daten löschen,
// plus Datenschutz-Hinweise und Diagnose bei Supabase-Problemen.
import { LANGUAGES, t } from "../i18n.js";
import { getSupabaseWarning } from "../supabase.js";
import { escapeHTML } from "../utils.js";

export function renderSettings(state) {
  const warning = getSupabaseWarning();
  const lang = state.settings.language;

  return `
    <section class="settings-page page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "settings"))}</span>
        <h1>Swipe. Pick. Done.</h1>
      </div>
      <div class="settings-grid">
        <section class="surface">
          <div class="setting-row">
            <div>
              <strong>${escapeHTML(t(lang, "language"))}</strong>
              <span>${escapeHTML(t(lang, "languageCopy"))}</span>
            </div>
            <div class="language-switch" role="group" aria-label="${escapeHTML(t(lang, "language"))}">
              ${LANGUAGES.map(
                (language) => `
                  <button class="${state.settings.language === language.id ? "is-active" : ""}" type="button" data-action="set-language" data-language="${language.id}">
                    ${escapeHTML(language.shortLabel)}
                  </button>
                `,
              ).join("")}
            </div>
          </div>
          <div class="setting-row">
            <div>
              <strong>${escapeHTML(t(lang, "darkMode"))}</strong>
              <span>${escapeHTML(t(lang, "darkModeCopy"))}</span>
            </div>
            <button class="toggle ${state.settings.theme === "dark" ? "is-on" : ""}" type="button" data-action="toggle-theme" aria-label="${escapeHTML(t(lang, "toggleDarkMode"))}">
              <span></span>
            </button>
          </div>
          <div class="setting-row">
            <div>
              <strong>${escapeHTML(t(lang, "reducedMotion"))}</strong>
              <span>${escapeHTML(t(lang, "reducedMotionCopy"))}</span>
            </div>
            <button class="toggle ${state.settings.reduceMotion ? "is-on" : ""}" type="button" data-action="toggle-motion" aria-label="${escapeHTML(t(lang, "toggleReducedMotion"))}">
              <span></span>
            </button>
          </div>
          <button class="ghost-action full" type="button" data-action="clear-local-data">
            <i data-lucide="eraser"></i>
            <span>${escapeHTML(t(lang, "clearLocalData"))}</span>
          </button>
        </section>

        <section class="surface privacy-panel">
          <span class="eyebrow">${escapeHTML(t(lang, "privacy"))}</span>
          <h2>${escapeHTML(t(lang, "privacyHeadline"))}</h2>
          <ul>
            <li>${escapeHTML(t(lang, "privacyOne"))}</li>
            <li>${escapeHTML(t(lang, "privacyTwo"))}</li>
            <li>${escapeHTML(t(lang, "privacyThree"))}</li>
            <li>${escapeHTML(t(lang, "privacyFour"))}</li>
          </ul>
          ${warning ? `<div class="inline-warning"><i data-lucide="wifi-off"></i>${escapeHTML(warning)}</div>` : ""}
          ${state.supabaseIssue ? `
            <div class="inline-warning cloud-diagnostic">
              <i data-lucide="database-zap"></i>
              <span>
                <strong>${escapeHTML(t(lang, "supabaseIssue"))}</strong>
                ${escapeHTML(t(lang, "supabaseIssueCopy"))}
                <code>${escapeHTML(state.supabaseIssue)}</code>
              </span>
            </div>
          ` : ""}
        </section>
      </div>
    </section>
  `;
}
