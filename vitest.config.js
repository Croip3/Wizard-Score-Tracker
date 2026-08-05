import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Gegenstücke zu den Build-Konstanten aus vite.config.js, damit Module,
  // die src/lib/version.js einbinden, auch im Test auflösbar sind.
  define: {
    __APP_BUILD_NUMBER__: JSON.stringify('test'),
    __APP_COMMIT__: JSON.stringify('testsha'),
    __APP_BUILD_TIME__: JSON.stringify('2026-01-01T00:00:00.000Z')
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.js']
  }
})
