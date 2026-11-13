<script setup lang="ts">
import { useLocale } from '~/composables/useLocale.ts'

/** One option of a filter control; `value` is what the statistics and the URL receive. */
type FilterItem<T extends string | number> = { label: string; value: T }

withDefaults(defineProps<{
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
  /** Number of active conditions, printed on the reset button. */
  activeCount: number
  /** Whether to print the broadcast / VR counting note under the checkboxes. */
  showNote?: boolean
}>(), { showNote: true })

/** Emitted when the visitor clears every filter. */
const emit = defineEmits<{ reset: [] }>()

const { t } = useLocale()

/** First year of the range; `0` means no lower bound. */
const yearFrom = defineModel<number>('yearFrom', { required: true })
/** Last year of the range; `0` means no upper bound. */
const yearTo = defineModel<number>('yearTo', { required: true })
/** Selected series ids. */
const selectedSeries = defineModel<number[]>('selectedSeries', { required: true })
/** Selected city names. */
const selectedCities = defineModel<string[]>('selectedCities', { required: true })
/** Selected producer names. */
const selectedProducers = defineModel<string[]>('selectedProducers', { required: true })
/** Selected character names. */
const selectedCharacters = defineModel<string[]>('selectedCharacters', { required: true })
/** Whether broadcast / online / VR shows count; on matches the series overview totals. */
const includeBroadcast = defineModel<boolean>('includeBroadcast', { required: true })
/** Whether song versions are merged into one row before counting. */
const mergeVariants = defineModel<boolean>('mergeVariants', { required: true })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-3">
      <FilterField :label="t('timeline.filtersFromYear')">
        <USelect v-model="yearFrom" :items="yearItems" size="sm" class="w-24" />
      </FilterField>
      <FilterField :label="t('timeline.filtersToYear')">
        <USelect v-model="yearTo" :items="yearItems" size="sm" class="w-24" />
      </FilterField>
      <FilterField :label="t('timeline.filtersSeries')">
        <USelectMenu
          v-model="selectedSeries"
          :items="seriesItems"
          value-key="value"
          multiple
          search-input
          :filter-fields="['label']"
          :placeholder="t('timeline.filtersAllSeries')"
          size="sm"
          class="w-44"
        />
      </FilterField>
      <FilterField :label="t('timeline.filtersCities')">
        <USelectMenu
          v-model="selectedCities"
          :items="cityItems"
          value-key="value"
          multiple
          search-input
          :filter-fields="['label']"
          :placeholder="t('timeline.filtersAllCities')"
          size="sm"
          class="w-36"
        />
      </FilterField>
      <FilterField :label="t('timeline.filtersProducers')">
        <USelectMenu
          v-model="selectedProducers"
          :items="producerItems"
          value-key="value"
          multiple
          search-input
          :filter-fields="['label']"
          :placeholder="t('timeline.filtersAllProducers')"
          size="sm"
          class="w-40"
        />
      </FilterField>
      <FilterField :label="t('timeline.filtersCharacters')">
        <USelectMenu
          v-model="selectedCharacters"
          :items="characterItems"
          value-key="value"
          multiple
          search-input
          :filter-fields="['label']"
          :placeholder="t('timeline.filtersAllCharacters')"
          size="sm"
          class="w-36"
        />
      </FilterField>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-rotate-ccw"
        :label="activeCount > 0 ? t('common.resetCount', { n: activeCount }) : t('common.reset')"
        :disabled="activeCount === 0"
        class="ml-auto"
        @click="emit('reset')"
      />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      <UCheckbox v-model="includeBroadcast" :label="t('timeline.filtersBroadcast')" size="sm" />
      <UCheckbox v-model="mergeVariants" :label="t('timeline.filtersMerge')" size="sm" />
      <span v-if="showNote" class="text-xs text-muted">{{ t('timeline.filtersNote') }}</span>
    </div>
  </div>
</template>
