<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import {
  useSearchHits,
  type SearchSection as SearchSectionData,
  type SearchSectionKey,
} from '~/composables/useSearchHits.ts'
import { LOOKUP_ALL } from '~~/shared/lookup.ts'
import { useLocale } from '~/composables/useLocale.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { t } = useLocale()

/** Rows revealed per section before the visitor asks for more. */
const PAGE_STEP = 20

/** Query restored from `?q=` so a shared link renders the same search. */
const initialQuery = (): string => (typeof route.query.q === 'string' ? route.query.q : '')
const query = ref(initialQuery())

/** Search box element, focused on arrival with the caret at the end. */
const searchInput = ref<{ inputRef?: HTMLInputElement } | null>(null)

/** Full result sets; the page asks for every hit and reveals them a slice at a time. */
const unlimited: Record<SearchSectionKey, number> = {
  series: LOOKUP_ALL,
  performances: LOOKUP_ALL,
  places: LOOKUP_ALL,
  producers: LOOKUP_ALL,
  songs: LOOKUP_ALL,
}
const { sections, total } = useSearchHits(query, unlimited)

/** Rows currently printed per section. */
const visible = reactive<Record<SearchSectionKey, number>>({
  series: PAGE_STEP,
  performances: PAGE_STEP,
  places: PAGE_STEP,
  producers: PAGE_STEP,
  songs: PAGE_STEP,
})

/** Whether the catalog is still downloading; “没有结果” must wait for the data. */
const loading = computed(() => pending.value || (catalog.value === null && error.value === null))

/** Trimmed query used by the headline, headings and empty state. */
const needle = computed(() => query.value.trim())

/** Rows of one section after the reveal cap. */
const rowsOf = (section: SearchSectionData) => section.rows.slice(0, visible[section.key])

/** Reveals another page of one section. */
const revealMore = (key: SearchSectionKey): void => {
  visible[key] += PAGE_STEP
}

/** Starts every section at its first page after the query changes. */
const resetVisible = (): void => {
  for (const key of Object.keys(visible) as SearchSectionKey[]) visible[key] = PAGE_STEP
}
watch(query, resetVisible)

/** Writes the query into `?q=` without adding a history entry. */
const syncUrl = (): void => {
  const next = query.value.trim()
  const current = typeof route.query.q === 'string' ? route.query.q : ''
  if (next === current) return
  void navigateTo({ path: '/search', query: next === '' ? {} : { q: next } }, { replace: true })
}
watch(query, syncUrl)

/** Restores the box when the back button or a shared link changes `?q=`. */
watch(
  () => route.query.q,
  (value) => {
    const next = typeof value === 'string' ? value : ''
    if (next !== query.value.trim()) query.value = next
  },
)

/** Focuses the search box with the caret at the end, as if the visitor had typed the query. */
const focusSearch = (): void => {
  const element = searchInput.value?.inputRef
  if (element === undefined) return
  element.focus()
  element.setSelectionRange(element.value.length, element.value.length)
}

/** Starts the catalog load, then moves focus into the box. */
const start = (): void => {
  void load()
  void nextTick(focusSearch)
}
onMounted(start)

useHead({
  title: computed(() => (needle.value === '' ? t('search.title') : t('search.titleQuery', { query: needle.value }))),
})
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">{{ t('search.title') }}</h1>
      <UInput
        ref="searchInput"
        v-model="query"
        icon="i-lucide-search"
        :placeholder="t('search.placeholder')"
        size="lg"
        class="mt-4 w-full"
        autocomplete="off"
        autofocus
        :aria-label="t('search.ariaPage')"
      />
      <p v-if="!loading && !error && sections.length > 0" class="mt-2 text-xs text-muted">
        {{ t('search.resultCount', { query: needle, total }) }}
      </p>
    </section>

    <USkeleton v-if="loading" class="h-64 w-full rounded-xl" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('common.catalogError')"
      :description="error"
    />

    <UEmpty
      v-else-if="needle === ''"
      icon="i-lucide-search"
      :title="t('search.startTitle')"
      :description="t('search.startDesc')"
      variant="naked"
    />

    <UEmpty
      v-else-if="sections.length === 0"
      icon="i-lucide-search-x"
      :title="t('search.notFound', { query: needle })"
      :description="t('search.notFoundDesc')"
      variant="naked"
    />

    <div v-else class="space-y-6">
      <SearchSection
        v-for="section in sections"
        :key="section.key"
        :section="section"
        :rows="rowsOf(section)"
        variant="page"
        :query="needle"
        @show-more="revealMore(section.key)"
      />
    </div>
  </main>
</template>
