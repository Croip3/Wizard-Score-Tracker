import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/styles.css'
import App from './App.vue'

// Bootstrap-Farbschema an die Systemeinstellung koppeln – gespielt wird oft abends.
const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyColorScheme = (event) => {
  document.documentElement.setAttribute('data-bs-theme', event.matches ? 'dark' : 'light')
}
applyColorScheme(colorScheme)
colorScheme.addEventListener('change', applyColorScheme)

createApp(App).mount('#app')
