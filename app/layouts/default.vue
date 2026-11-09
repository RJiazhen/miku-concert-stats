<script setup lang="ts">
import { useLocale, useLocaleDocument } from '~/composables/useLocale.ts'

const { t } = useLocale()

/** Keeps `<html lang>` and the title template in step with the language switch. */
useLocaleDocument()

/** Beacon token from public runtime config; empty until NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN is set. */
const analyticsToken = String(useRuntimeConfig().public.cloudflareWebAnalyticsToken ?? '').trim()

// Public pages only: the admin layout never loads this component, so `/admin` stays unmeasured.
// An empty token renders no script at all, so local development and unconfigured deploys are clean.
useHead({
  script:
    analyticsToken === ''
      ? []
      : [
          {
            key: 'cloudflare-web-analytics',
            src: 'https://static.cloudflareinsights.com/beacon.min.js',
            defer: true,
            'data-cf-beacon': JSON.stringify({ token: analyticsToken }),
          },
        ],
})
</script>

<template>
  <div class="min-h-screen">
    <HeroBackdrop />
    <SiteHeader />
    <div class="mx-auto max-w-body px-4 pt-8 pb-16 sm:px-6">
      <slot />
    </div>
    <footer class="border-t border-default/60">
      <div class="mx-auto max-w-body px-4 pt-8 pb-24 text-xs text-muted sm:px-6 sm:pb-8">
        <p>
          {{ t('footer.data1') }}<ULink to="https://vocadb.net/" target="_blank" class="text-primary">VocaDB</ULink>{{ t('footer.data2') }}<ULink to="https://w.atwiki.jp/hmiku/" target="_blank" class="text-primary">初音ミク Wiki</ULink>{{ t('footer.data3') }}<ULink to="https://wiki.vocadb.net/docs/license" target="_blank" class="text-primary">VocaDB License</ULink>.
        </p>
      </div>
    </footer>
    <FeedbackWidget />
  </div>
</template>
