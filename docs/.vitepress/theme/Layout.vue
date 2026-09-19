<script setup>
import DefaultTheme from 'vitepress/theme'
import ThemeSelector from './ThemeSelector.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <ThemeSelector />
    </template>
    <template #nav-screen-content-after>
      <ThemeSelector />
    </template>
  </Layout>
</template>
