// Verlauf: zeigt lokal gespeicherte, abgeschlossene Picks (bleibt nur im Browser).
import { t } from "../i18n.js";
import { escapeHTML, formatDateLabel } from "../utils.js";

export function renderHistory(state) {
  const lang = state.settings.language;

  return `
    <section class="list-page page-enter">
      <div class="panel-heading">
        <span class="eyebrow">${escapeHTML(t(lang, "recentPicks"))}</span>
        <h1>${escapeHTML(t(lang, "localHistory"))}</h1>
      </div>
      ${
        state.history.length
          ? `<div class="history-list">
              ${state.history
                .map(
                  (item) => `
                    <article class="history-item">
                      <span>${escapeHTML(formatDateLabel(item.createdAt))}</span>
                      <strong>${escapeHTML(item.winner)}</strong>
                      <small>${escapeHTML(item.roomCode)} · ${escapeHTML(item.mode)}</small>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : `<div class="empty-state"><i data-lucide="history"></i><strong>${escapeHTML(t(lang, "noPicksYet"))}</strong><span>${escapeHTML(t(lang, "recentStayLocal"))}</span></div>`
      }
      ${state.history.length ? `<button class="ghost-action" type="button" data-action="clear-history"><i data-lucide="trash"></i><span>${escapeHTML(t(lang, "clearHistory"))}</span></button>` : ""}
    </section>
  `;
}
