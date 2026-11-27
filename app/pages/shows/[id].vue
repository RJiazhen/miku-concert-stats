<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import toursFile from '~~/data/tours.json'
import { parseTours, tourPathForPerformance } from '~~/shared/tours.ts'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useLocale } from '~/composables/useLocale.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { t } = useLocale()
const tours = parseTours(toursFile)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const performanceId = computed(() => Number(route.params.id))
const performance = computed(
  () => catalog.value?.performances.find((row) => row.id === performanceId.value) ?? null,
)
const tour = computed(() => {
  if (!Number.isInteger(performanceId.value)) return null
  return tours.byPerformanceId.get(performanceId.value) ?? null
})

/**
 * Replaces legacy `/shows/{id}` with the tour deep-link once the catalog
 * confirms the 演出 exists and the tour registry lists it.
 */
const redirectWhenReady = (): void => {
  if (pending.value || error.value || !catalog.value) return
  const current = performance.value
  const currentTour = tour.value
  if (current === null || currentTour === null) return
  void navigateTo(tourPathForPerformance(currentTour.id, current.id), { replace: true })
}

watch([catalog, pending, error, performance, tour], redirectWhenReady, { immediate: true })

useHead({ title: computed(() => t('col.performance')) })
</script>

<template>
  <main class="space-y-6">
    <PageSkeleton v-if="pending" />
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && (!performance || !tour)"
      icon="i-lucide-calendar-x"
      :title="t('show.notFound')"
      :description="t('common.notFoundId')"
    />
  </main>
</template>
