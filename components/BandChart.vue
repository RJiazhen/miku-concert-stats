<script setup lang="ts">
import type { BandSummary } from '../shared/stats.ts'

defineProps<{ bands: BandSummary[] }>()

/** Formats a share. Null means the song set was empty. */
const percent = (ratio: number | null): string => {
  if (ratio === null) return '—'
  return `${(ratio * 100).toFixed(1)}%`
}
</script>

<template>
  <div class="bands">
    <div v-for="band in bands" :key="band.id" class="band">
      <span>{{ band.label }}</span>
      <div class="track" :class="{ none: band.id === 'none' }">
        <span :style="{ width: `${(band.ratio ?? 0) * 100}%` }" />
      </div>
      <strong>{{ band.count }} · {{ percent(band.ratio) }}</strong>
    </div>
  </div>
</template>
