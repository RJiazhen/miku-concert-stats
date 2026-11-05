<script setup lang="ts">
/**
 * The backend entry point is the feedback inbox: `/admin` always forwards to `/admin/feedback`.
 * The Nitro guard runs first, so an unauthenticated visit is sent to Cloudflare Access before
 * this redirect is ever evaluated.
 */
definePageMeta({
  redirect: '/admin/feedback',
})
</script>

<template>
  <div />
</template>
