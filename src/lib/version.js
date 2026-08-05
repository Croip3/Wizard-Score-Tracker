/* global __APP_BUILD_NUMBER__, __APP_COMMIT__, __APP_BUILD_TIME__ */

/**
 * Build-Informationen. Die Werte werden von Vite zur Build-Zeit eingesetzt
 * (siehe `define` in vite.config.js):
 *
 * - Buildnummer: läuft im Deploy-Workflow automatisch hoch (GITHUB_RUN_NUMBER),
 *   lokal steht "dev"
 * - Commit: kurzer Git-SHA, aus dem der Build entstanden ist
 * - Zeitpunkt: wann gebaut wurde
 */
export const APP_BUILD_NUMBER = __APP_BUILD_NUMBER__
export const APP_COMMIT = __APP_COMMIT__
export const APP_BUILD_TIME = __APP_BUILD_TIME__

/** Einzeilige Versionsangabe für die Anzeige in der App. */
export function versionLabel() {
  const built = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(APP_BUILD_TIME))
  return `Version ${APP_BUILD_NUMBER} · ${APP_COMMIT} · ${built}`
}
