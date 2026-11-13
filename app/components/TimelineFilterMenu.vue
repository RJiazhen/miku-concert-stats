<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '~/composables/useLocale.ts'
import type { TimelineFilterDraft } from '~/utils/timeline-filter-draft.ts'
import { normalizeYearRange } from '~~/shared/year-range.ts'

/** One option of a filter control; `value` is what the statistics and the URL receive. */
type FilterItem<T extends string | number> = { label: string; value: T }

/** Year value that means "no bound"; matches the page's `YEAR_ANY` sentinel. */
const ANY_YEAR = 0

const props = withDefaults(defineProps<{
  /** Items of both year pickers, `不限` first. */
  yearItems: FilterItem<number>[]
  /** Series options in site-language order. */
  seriesItems: FilterItem<number>[]
  /** Cities the catalog recognises. */
  cityItems: FilterItem<string>[]
  /** Producers from the catalog index. */
  producerItems: FilterItem<string>[]
  /** Characters in `data/characters.json` order. */
  characterItems: FilterItem<string>[]
  /** Chart destinations in page order. */
  charts: readonly { key: string; label: string }[]
  /** Chart currently focused in the URL hash, highlighted in the list. */
  focusedChart: string
  /** Whether the panel lists the charts itself; the wide-screen rail already does. */
  showCharts?: boolean
  /** Whether filter changes reach the page at once instead of waiting for the confirm button. */
  instant?: boolean
  /** Live filter values, copied into the drafts when the panel opens. */
  yearFrom: number
  yearTo: number
  selectedSeries: number[]
  selectedCities: string[]
  selectedProducers: string[]
  selectedCharacters: string[]
  includeBroadcast: boolean
  mergeVariants: boolean
}>(), { showCharts: true, instant: false })

const emit = defineEmits<{
  /** Confirmed drafts; the page applies them and closes the panel. */
  apply: [draft: TimelineFilterDraft]
  /** Drafts changed in instant mode; the page applies them and keeps the panel open. */
  update: [draft: TimelineFilterDraft]
  /** A chart was picked from the panel's own list. */
  selectChart: [key: string]
}>()

const { t } = useLocale()

// The panel edits draft copies, so a half-finished selection never redraws the charts behind it.

/** Draft lower year bound. */
const draftYearFrom = ref<number>(props.yearFrom)
/** Draft upper year bound. */
const draftYearTo = ref<number>(props.yearTo)
/** Draft series selection. */
const draftSeries = ref<number[]>([...props.selectedSeries])
/** Draft city selection. */
const draftCities = ref<string[]>([...props.selectedCities])
/** Draft producer selection. */
const draftProducers = ref<string[]>([...props.selectedProducers])
/** Draft character selection. */
const draftCharacters = ref<string[]>([...props.selectedCharacters])
/** Draft broadcast / VR counting switch. */
const draftBroadcast = ref(props.includeBroadcast)
/** Draft song-version merge switch. */
const draftMergeVariants = ref(props.mergeVariants)

/** Count of non-default conditions among the drafts, printed on the panel's reset button. */
const draftFilterCount = computed(() => {
  const draftRange = normalizeYearRange({
    from: draftYearFrom.value === ANY_YEAR ? null : draftYearFrom.value,
    to: draftYearTo.value === ANY_YEAR ? null : draftYearTo.value,
  })
  let count = draftSeries.value.length + draftCities.value.length + draftProducers.value.length + draftCharacters.value.length
  if (!draftBroadcast.value) count += 1
  if (draftMergeVariants.value) count += 1
  if (draftRange.from !== null || draftRange.to !== null) count += 1
  return count
})

/** Clears every draft back to its default without touching the charts behind the panel. */
const resetDrafts = (): void => {
  draftYearFrom.value = ANY_YEAR
  draftYearTo.value = ANY_YEAR
  draftSeries.value = []
  draftCities.value = []
  draftProducers.value = []
  draftCharacters.value = []
  draftBroadcast.value = true
  draftMergeVariants.value = false
}

/** Snapshots the drafts into the shape the page applies. */
const currentDraft = (): TimelineFilterDraft => ({
  yearFrom: draftYearFrom.value,
  yearTo: draftYearTo.value,
  selectedSeries: [...draftSeries.value],
  selectedCities: [...draftCities.value],
  selectedProducers: [...draftProducers.value],
  selectedCharacters: [...draftCharacters.value],
  includeBroadcast: draftBroadcast.value,
  mergeVariants: draftMergeVariants.value,
})

/** Hands the drafts to the page, which applies them to the live filters. */
const confirm = (): void => {
  emit('apply', currentDraft())
}

/** Pushes every draft change to the page in instant mode; a no-op while confirming manually. */
const publishDraft = (): void => {
  if (!props.instant) return
  emit('update', currentDraft())
}
watch(
  [draftYearFrom, draftYearTo, draftSeries, draftCities, draftProducers, draftCharacters, draftBroadcast, draftMergeVariants],
  publishDraft,
  { deep: true },
)
</script>

<template>
  <div class="space-y-3">
    <div v-if="showCharts">
      <p class="mb-1.5 px-1 text-xs font-medium tracking-[0.12em] text-muted uppercase">{{ t('timeline.charts') }}</p>
      <div class="grid grid-cols-2 gap-0.5">
        <UButton
          v-for="chart in charts"
          :key="chart.key"
          :variant="focusedChart === chart.key ? 'soft' : 'ghost'"
          color="neutral"
          size="sm"
          class="justify-start"
          :label="chart.label"
          @click="emit('selectChart', chart.key)"
        />
      </div>
    </div>
    <div :class="showCharts ? 'border-t border-default/60 pt-3' : ''">
      <TimelineFilters
        v-model:year-from="draftYearFrom"
        v-model:year-to="draftYearTo"
        v-model:selected-series="draftSeries"
        v-model:selected-cities="draftCities"
        v-model:selected-producers="draftProducers"
        v-model:selected-characters="draftCharacters"
        v-model:include-broadcast="draftBroadcast"
        v-model:merge-variants="draftMergeVariants"
        :year-items="yearItems"
        :series-items="seriesItems"
        :city-items="cityItems"
        :producer-items="producerItems"
        :character-items="characterItems"
        :active-count="draftFilterCount"
        :show-note="false"
        @reset="resetDrafts"
      />
    </div>
    <!-- Manual mode confirms every control at once; instant mode has already applied them. -->
    <div v-if="!instant" class="flex justify-end border-t border-default/60 pt-3">
      <UButton
        color="primary"
        icon="i-lucide-check"
        :label="t('timeline.confirmFilters')"
        class="max-sm:w-full max-sm:justify-center"
        @click="confirm"
      />
    </div>
  </div>
</template>
