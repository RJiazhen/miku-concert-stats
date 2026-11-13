<script setup lang="ts">
import { useLocale } from '~/composables/useLocale.ts'

const { uiLocale } = useLocale()
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
