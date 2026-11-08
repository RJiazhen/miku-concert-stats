<script setup lang="ts">
import { useLocale, useLocaleDocument } from '~/composables/useLocale.ts'

const { t } = useLocale()

/** Keeps `<html lang>` and the title template in step with the language switch. */
useLocaleDocument()
</script>

<template>
  <div class="min-h-screen">
    <HeroBackdrop />
    <SiteHeader />
    <div class="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <slot />
    </div>
    <footer class="border-t border-default/60">
      <div class="mx-auto max-w-6xl space-y-2 px-4 pt-8 pb-24 text-xs text-muted sm:px-6 sm:pb-8">
        <p>
          {{ t('footer.data1') }}<ULink to="https://vocadb.net/" target="_blank" class="text-primary">VocaDB</ULink>{{ t('footer.data2') }}<ULink to="https://w.atwiki.jp/hmiku/" target="_blank" class="text-primary">初音ミク Wiki</ULink>{{ t('footer.data3') }}<ULink to="https://wiki.vocadb.net/docs/license" target="_blank" class="text-primary">VocaDB License</ULink>.
        </p>
        <p>
          {{ t('footer.ai1') }}<ULink to="/skill.md" target="_blank" class="text-primary">/skill.md</ULink>{{ t('footer.ai2') }}
        </p>
      </div>
    </footer>
    <FeedbackWidget />
  </div>
</template>
