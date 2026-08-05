import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Commit, aus dem dieser Build entstanden ist – wird in der App angezeigt,
// damit sich prüfen lässt, welcher Stand auf dem Gerät läuft.
function currentCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unbekannt'
  }
}

// GitHub Pages serves the app from https://<user>.github.io/<repo>/, so every
// asset URL needs that prefix. The deploy workflow passes the repository name
// via VITE_BASE; the fallback keeps `npm run preview` working locally.
const base = process.env.VITE_BASE || '/Wizard-Score-Tracker/'

export default defineConfig({
  base,
  define: {
    // GITHUB_RUN_NUMBER zählt pro Workflow automatisch hoch – lokal gibt es
    // stattdessen "dev".
    __APP_BUILD_NUMBER__: JSON.stringify(process.env.GITHUB_RUN_NUMBER || 'dev'),
    __APP_COMMIT__: JSON.stringify(currentCommit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-64x64.png', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'WIZARD - F&E Version',
        short_name: 'WIZARD F&E',
        description:
          'Punkte-Tracker für das Kartenspiel Wizard: Ansagen, Stiche und Punktestand – komplett offline.',
        lang: 'de',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8f9fa',
        theme_color: '#3b2a91',
        categories: ['games', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
