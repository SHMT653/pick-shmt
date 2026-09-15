import { t } from "../i18n.js";
import { escapeHTML } from "../utils.js";

export function renderImprint(state) {
  const lang = state.settings.language;

  return `
    <section class="legal-page page-enter">
      <button class="ghost-action legal-back" type="button" data-action="navigate" data-view="home">
        <i data-lucide="arrow-left"></i>
        <span>${escapeHTML(t(lang, "backHome"))}</span>
      </button>
      <div class="legal-panel">
        <span class="eyebrow">${escapeHTML(t(lang, "imprint"))}</span>
        <h1>Impressum</h1>
        <p>Pickr ist ein studentisches Webprojekt im Rahmen der DHBW und dient nur der Demonstration.</p>

        <div class="legal-grid">
          <section>
            <h2>Projekt</h2>
            <p>Pickr</p>
            <p>Ein Projekt von SHMT.</p>
          </section>
          <section>
            <h2>Verantwortlich</h2>
            <p>SHMT</p>
            <p>Luca Schmut</p>
            <p>Thymianplatz 5</p>
            <p>64653 Lorsch</p>
          </section>
          <section>
            <h2>Kontakt</h2>
            <p><a href="mailto:luca@schmut.de">luca@schmut.de</a></p>
          </section>
          <section>
            <h2>Hinweis</h2>
            <p>Diese Anwendung ist kein kommerzielles Angebot und nicht fuer den produktiven Betrieb gedacht.</p>
          </section>
        </div>
      </div>
    </section>
  `;
}

export function renderPrivacy(state) {
  const lang = state.settings.language;

  return `
    <section class="legal-page page-enter">
      <button class="ghost-action legal-back" type="button" data-action="navigate" data-view="home">
        <i data-lucide="arrow-left"></i>
        <span>${escapeHTML(t(lang, "backHome"))}</span>
      </button>
      <div class="legal-panel">
        <span class="eyebrow">${escapeHTML(t(lang, "privacy"))}</span>
        <h1>Datenschutz</h1>
        <p>Pickr sammelt nur Daten, die fuer temporäre Entscheidungsraeume gebraucht werden.</p>

        <div class="legal-grid">
          <section>
            <h2>Welche Daten?</h2>
            <p>Raumcode, Nickname, Ideen, Stimmen und lokale Einstellungen im Browser.</p>
          </section>
          <section>
            <h2>Wofuer?</h2>
            <p>Damit Gruppen einen Raum erstellen, beitreten und gemeinsam abstimmen koennen.</p>
          </section>
          <section>
            <h2>Speicherung</h2>
            <p>Raeume sind temporär. Lokale Daten bleiben nur auf dem jeweiligen Gerät.</p>
          </section>
          <section>
            <h2>Kein Tracking</h2>
            <p>Keine Werbung, keine Marketing-Cookies, keine Analyseprofile.</p>
          </section>
          <section>
            <h2>DHBW-Projekt</h2>
            <p>Die App ist nur fuer die DHBW-Praesentation gedacht und ein Projekt von SHMT.</p>
          </section>
        </div>
      </div>
    </section>
  `;
}
