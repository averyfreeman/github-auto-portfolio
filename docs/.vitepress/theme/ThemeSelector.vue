<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { data as attributes } from '../../user-attributes.data.js'

const themes = [
  { id: 'latte', label: 'Latte', swatch: '☀️' },
  { id: 'frappe', label: 'Frappé', swatch: '🌤️' },
  { id: 'macchiato', label: 'Macchiato', swatch: '🌙' },
  { id: 'mocha', label: 'Mocha', swatch: '🌌' }
]
const themeIds = new Set(themes.map((theme) => theme.id))
const currentTheme = ref(
  attributes.theme?.default && themeIds.has(attributes.theme.default) ? attributes.theme.default : 'mocha'
)

function applyTheme(theme, persist = true) {
  if (!themeIds.has(theme) || typeof document === 'undefined') return

  currentTheme.value = theme
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', theme !== 'latte')

  if (typeof window !== 'undefined') {
    if (persist) window.localStorage.setItem('portfolio-theme', theme)
    window.dispatchEvent(new CustomEvent('portfolio-theme-change', { detail: theme }))
  }
}

function handleThemeChange(event) {
  if (themeIds.has(event.detail)) currentTheme.value = event.detail
}

onMounted(() => {
  window.addEventListener('portfolio-theme-change', handleThemeChange)
  const savedTheme = window.localStorage.getItem('portfolio-theme')
  applyTheme(themeIds.has(savedTheme) ? savedTheme : currentTheme.value, false)
})

onBeforeUnmount(() => {
  window.removeEventListener('portfolio-theme-change', handleThemeChange)
})
</script>

<template>
  <div class="theme-selector" role="group" aria-label="Color theme">
    <span class="sr-only">Choose a color theme</span>
    <button
      v-for="theme in themes"
      :key="theme.id"
      class="theme-selector__button"
      type="button"
      :aria-label="`Use ${theme.label} theme`"
      :aria-pressed="currentTheme === theme.id"
      :title="`${theme.label} theme`"
      @click="applyTheme(theme.id)"
    >
      <span aria-hidden="true">{{ theme.swatch }}</span>
      <span class="theme-selector__label">{{ theme.label }}</span>
    </button>
  </div>
</template>
