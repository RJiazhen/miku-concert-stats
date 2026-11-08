<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { searchPagePath, useSearchHits } from '~/composables/useSearchHits.ts'
import { useLocale } from '~/composables/useLocale.ts'

const { catalog, error, pending, load } = useCatalog()
const { t } = useLocale()

/** Placeholder shared by the desktop input and the mobile panel. */
const placeholder = computed(() => t('search.placeholder'))

/** Starts the browser catalog load after hydration so search works without visiting the ranking first. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const root = ref<HTMLElement | null>(null)
const query = ref('')
const open = ref(false)
const mobileOpen = ref(false)

/** Sectioned hits shared with `/search`; the panel keeps its per-type caps. */
const { sections } = useSearchHits(query)

/** Whether the catalog is still downloading; an empty panel must not claim “没有找到”. */
const loading = computed(() => pending.value || (catalog.value === null && error.value === null))

/** Whether the desktop result panel should be open. */
const panelOpen = computed(() => open.value && query.value.trim() !== '')

watch(query, () => {
  if (query.value.trim() !== '') open.value = true
})

/** Closes both panels and clears the query. */
const reset = (): void => {
  query.value = ''
  open.value = false
  mobileOpen.value = false
}

/** Enter opens the full results page instead of guessing one result to open. */
const submit = (): void => {
  if (query.value.trim() === '') return
  const target = searchPagePath(query.value)
  reset()
  void navigateTo(target)
}

/** Closes the desktop panel when the click lands outside the search box. */
const onClickOutside = (event: MouseEvent): void => {
  if (root.value === null) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (!root.value.contains(target)) open.value = false
}

/** Listens for outside clicks while the component is mounted. */
const startListening = (): void => {
  document.addEventListener('mousedown', onClickOutside)
}
onMounted(startListening)

/** Removes the document listener when the header unmounts. */
const stopListening = (): void => {
  document.removeEventListener('mousedown', onClickOutside)
}
onUnmounted(stopListening)
</script>

<template>
  <div ref="root" class="relative">
    <!-- Desktop: always visible input with a floating result panel. -->
    <UInput
      v-model="query"
      icon="i-lucide-search"
      :placeholder="placeholder"
      size="sm"
      class="hidden w-56 xl:block xl:w-64"
      autocomplete="off"
      :aria-label="t('search.aria')"
      @focus="open = true"
      @keydown.enter.prevent="submit"
      @keydown.esc="open = false"
    />
    <div
      v-if="panelOpen"
      class="absolute top-full right-0 z-50 mt-2 w-96 rounded-xl bg-default shadow-xl ring ring-default"
    >
      <SiteSearchResults
        :query="query"
        :sections="sections"
        :loading="loading"
        :error="error"
        @select="reset"
      />
    </div>

    <!-- Narrow screens: a floating panel opened from the header button. -->
    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="t('search.aria')"
      class="xl:hidden"
      @click="mobileOpen = true"
    />
    <div v-if="mobileOpen" class="fixed inset-0 z-50 bg-default/95 backdrop-blur xl:hidden">
      <div class="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            :placeholder="placeholder"
            size="md"
            class="flex-1"
            autocomplete="off"
            autofocus
            :aria-label="t('search.aria')"
            @keydown.enter.prevent="submit"
            @keydown.esc="reset"
          />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="t('search.close')" @click="reset" />
        </div>
        <div v-if="query.trim() !== ''" class="rounded-xl bg-default ring ring-default">
          <SiteSearchResults
            :query="query"
            :sections="sections"
            :loading="loading"
            :error="error"
            @select="reset"
          />
        </div>
      </div>
    </div>
  </div>
</template>
