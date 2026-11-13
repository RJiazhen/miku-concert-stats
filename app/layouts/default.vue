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
    <div class="mx-auto max-w-body px-4 pt-8 pb-10 sm:px-6">
      <slot />
    </div>
    <footer class="border-t border-default/60">
      <div class="mx-auto max-w-body px-4 pt-4 pb-20 text-xs text-muted sm:px-6 sm:pb-5">
        <p>
          {{ t('footer.data1') }}<ULink to="https://vocadb.net/" target="_blank" class="text-primary">VocaDB</ULink>{{ t('footer.data2') }}<ULink to="https://w.atwiki.jp/hmiku/" target="_blank" class="text-primary">初音ミク Wiki</ULink>{{ t('footer.data3') }}<ULink to="https://wiki.vocadb.net/docs/license" target="_blank" class="text-primary">VocaDB License</ULink>.
        </p>
      </div>
    </footer>
    <FeedbackWidget />
  </div>
</template>
