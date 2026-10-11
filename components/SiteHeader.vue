<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const STORAGE_KEY = 'miku-concert-stats-theme'

const theme = ref<'light' | 'dark'>('dark')

/** Theme currently applied, or the system preference when the visitor has not chosen. */
const currentTheme = (): 'light' | 'dark' => {
  const stored = document.documentElement.dataset.theme
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

let stopWatchingSystem: (() => void) | null = null

/** Matches the toggle to the head script, then follows the system until a choice is stored. */
const readTheme = (): void => {
  theme.value = currentTheme()
  const media = window.matchMedia('(prefers-color-scheme: light)')
  /** Updates the label when the OS theme changes and no manual choice is stored. */
  const onChange = (): void => {
    const chosen = document.documentElement.dataset.theme
    if (chosen === 'light' || chosen === 'dark') return
    theme.value = media.matches ? 'light' : 'dark'
  }
  media.addEventListener('change', onChange)
  stopWatchingSystem = () => {
    media.removeEventListener('change', onChange)
  }
}
onMounted(readTheme)

/** Drops the system-theme listener when the header unmounts. */
const releaseSystemWatch = (): void => {
  stopWatchingSystem?.()
  stopWatchingSystem = null
}
onUnmounted(releaseSystemWatch)

/** Flips the manual theme, stores it, and applies it on the document element. */
const toggleTheme = (): void => {
  const next = theme.value === 'dark' ? 'light' : 'dark'
  theme.value = next
  document.documentElement.dataset.theme = next
  localStorage.setItem(STORAGE_KEY, next)
}
</script>

<template>
  <header class="site-header">
    <h1 class="brand">
      初音未来演唱会曲目
      <span>播放量区间在浏览器里计算。没有快照的歌保持空，不估算。</span>
    </h1>
    <nav>
      <NuxtLink to="/">排行</NuxtLink>
      <NuxtLink to="/catalog">单场</NuxtLink>
      <NuxtLink to="/compare">比较</NuxtLink>
      <NuxtLink to="/windows">观察窗</NuxtLink>
      <NuxtLink to="/correlation">换算</NuxtLink>
      <NuxtLink to="/lookup">检索</NuxtLink>
      <button type="button" class="theme-toggle" @click="toggleTheme">
        {{ theme === 'dark' ? '浅色' : '深色' }}
      </button>
    </nav>
  </header>
</template>
