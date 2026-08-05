# Stiche Raten – Punkte Tracker

Progressive Web App zum Punkte-Tracking für das Kartenspiel **Stiche Raten** (Wizard-Variante).
Mobile-first, komplett clientseitig, offline nutzbar – kein Backend, kein Konto.

## Funktionen

- **Spielerverwaltung**: 2–6 Spieler, freie Namen, Sitzreihenfolge per ↑/↓ anpassbar, Schnellauswahl bereits bekannter Spieler
- **Rundenablauf**: die Kartenanzahl der ersten Runde wird beim Spielstart per Stepper gesetzt und zählt danach je Runde um eine Karte herunter – in jeder Runde frei anpassbar (auch wieder hoch oder von vorn), Ansage-Phase und Stich-Phase getrennt
- **Dealer-Rotation**: der Geber wandert automatisch reihum; angesagt wird links vom Geber, der Geber ist zuletzt dran
- **Schnelle Eingabe**: alle Zahlen über +/− Stepper, keine Tastatur nötig; Stiche zusätzlich per Reset-Button (einzeln oder für alle) auf 0
- **Sinnvolle Grenzen**: Ansage und Stiche liegen je Spieler immer zwischen 0 und der Kartenanzahl der Runde. Die Summe der Stiche darf von der Kartenanzahl abweichen (mehr oder weniger) – die App zeigt die Abweichung nur als Hinweis an und blockiert den Rundenabschluss nicht
- **Punkteübersicht**: Tabelle mit einer Zeile pro Runde und einer Spalte pro Spieler, inklusive Gesamtstand und Platzierung
- **Spielende jederzeit**: manuell beendbar, danach Auswertung mit Gewinner, Endstand, Trefferquote und Rundenübersicht
- **Statistiken**: alle Spiele bleiben lokal gespeichert – Siege, Punkte, Ø pro Spiel und Trefferquote je Spieler
- **PWA**: installierbar (Manifest, Icons, Splash Screen), App-Shell wird per Service Worker gecacht und läuft offline

## Punktewertung

Verwendet wird die Standardvariante von Stiche-Raten, **nur der Bonus ist von 10 auf 5 reduziert**:

| Fall | Punkte |
| --- | --- |
| Jeder gewonnene Stich | **1 Punkt** |
| Ansage getroffen | **zusätzlich 5 Bonuspunkte** |
| Ansage verfehlt | **nur der Bonus entfällt – kein Punktabzug** |

Beispiele: Ansage 3 / 3 Stiche → `5 + 3 = 8` Punkte · Ansage 0 / 0 Stiche → `5` Punkte ·
Ansage 1 / 4 Stiche → `4` Punkte · Ansage 2 / 0 Stiche → `0` Punkte.

Punkte werden nie abgezogen, der Punktestand kann also nicht sinken. Die Bonuspunkte sind
bewusst fest im Code hinterlegt (`src/lib/rules.js`) und nicht konfigurierbar.
Trumpffarben werden nicht erfasst.

## Tech-Stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- [Vite](https://vite.dev/) als Build-Tool
- [Bootstrap 5](https://getbootstrap.com/) für Layout und Komponenten (nur CSS, kein Bootstrap-JS)
- [Dexie.js](https://dexie.org/) für die Offline-Speicherung in IndexedDB
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) für Manifest und Service Worker
- [Vitest](https://vitest.dev/) für die Unit-Tests der Spiellogik

## Entwicklung

```bash
npm install     # Abhängigkeiten installieren
npm run dev     # Dev-Server (http://localhost:5173/Wizard-Score-Tracker/)
npm test        # Unit-Tests der Punkte- und Dealer-Logik
npm run build   # Produktions-Build nach dist/
npm run preview # Produktions-Build lokal testen (inkl. Service Worker)
```

> Der Service Worker ist im Dev-Modus deaktiviert. Zum Testen der Offline-Funktion
> `npm run build && npm run preview` verwenden.

## Projektstruktur

```
src/
├── App.vue                  # App-Shell, Ansichtssteuerung, Fehleranzeige
├── main.js                  # Einstiegspunkt, Bootstrap-CSS, Farbschema
├── assets/styles.css        # eigene Styles (Stepper, Tabelle, Aktionsleiste)
├── components/
│   ├── HomeView.vue         # Startseite mit Regelübersicht
│   ├── PlayerSetup.vue      # Spielerverwaltung
│   ├── GameView.vue         # laufendes Spiel (Phasen + Punktetabelle)
│   ├── RoundBidding.vue     # Kartenanzahl + Ansagen
│   ├── RoundTricks.vue      # tatsächliche Stiche inkl. Reset-Buttons
│   ├── ScoreTable.vue       # Punkteübersicht je Runde/Spieler
│   ├── GameSummary.vue      # Auswertung nach Spielende
│   ├── StatsView.vue        # spielübergreifende Statistiken
│   ├── NumberStepper.vue    # wiederverwendbarer +/- Stepper
│   └── ConfirmDialog.vue    # Bestätigungsdialog
├── db/
│   ├── index.js             # Dexie-Schema und Statuskonstanten
│   └── repository.js        # Lese-/Schreibzugriffe und Auswertungen
├── lib/rules.js             # Punkteberechnung, Dealer-Rotation, Endstand
└── store/gameStore.js       # reaktiver Spielzustand mit Persistenz
```

## Datenmodell (IndexedDB via Dexie)

| Tabelle | Felder |
| --- | --- |
| `players` | `id`, `name`, `nameKey` (eindeutig, für Wiedererkennung), `createdAt` |
| `games` | `id`, `startedAt`, `endedAt`, `status` (`running`/`finished`), `playerIds`, `winnerPlayerIds` |
| `rounds` | `id`, `gameId`, `roundNumber`, `cardCount`, `dealerPlayerId`, `phase`, `completedAt` |
| `roundEntries` | `id`, `roundId`, `gameId`, `playerId`, `bid`, `tricksWon`, `points` |

Jede Eingabe wird sofort geschrieben: Ein Reload oder ein geschlossener Browser-Tab mitten in
der Runde geht nicht verloren, das laufende Spiel wird beim nächsten Start automatisch fortgesetzt.

## Deployment auf GitHub Pages

Der Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) baut und
veröffentlicht die App bei jedem Push auf `main`:

1. In den Repository-Einstellungen unter **Settings → Pages** als Quelle **GitHub Actions** wählen.
2. Auf `main` pushen (oder den Workflow manuell über **Actions → Deploy to GitHub Pages → Run workflow** starten).
3. Die App liegt anschließend unter `https://<user>.github.io/<repository>/`.

Der Basis-Pfad wird im Workflow aus dem Repository-Namen abgeleitet und über die
Umgebungsvariable `VITE_BASE` an Vite übergeben; lokal greift der Standardwert
`/Wizard-Score-Tracker/` aus [`vite.config.js`](vite.config.js).

## Lizenz

[MIT](LICENSE)
