<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { localSongMatches } from '~~/shared/lookup.ts'

const { catalog, load } = useCatalog()

/** Starts the browser catalog load after hydration so search works without visiting the ranking first. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const root = ref<HTMLElement | null>(null)
const query = ref('')
const open = ref(false)
const mobileOpen = ref(false)

/** Local matches in the loaded catalog. */
const localHits = computed(() => (catalog.value ? localSongMatches(catalog.value, query.value) : []))

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

/** Opens one song's detail page. */
const openSong = async (songId: number): Promise<void> => {
  reset()
  await navigateTo(`/songs/${songId}`)
}

/** Enter opens the first local hit. */
const submit = (): void => {
  const first = localHits.value[0]
  if (first) void openSong(first.id)
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
      placeholder="搜索歌名、歌手或制作人"
      size="sm"
      class="hidden w-56 md:block lg:w-72"
      autocomplete="off"
      aria-label="搜索歌曲"
      @focus="open = true"
      @keydown.enter.prevent="submit"
      @keydown.esc="open = false"
    />
    <div
      v-if="panelOpen"
      class="absolute top-full right-0 z-50 mt-2 w-96 rounded-xl bg-default shadow-xl ring ring-default"
    >
      <SiteSearchResults :query="query" :local="localHits" @select="openSong" />
    </div>

    <!-- Narrow screens: a floating panel opened from the header button. -->
    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="搜索歌曲"
      class="md:hidden"
      @click="mobileOpen = true"
    />
    <div v-if="mobileOpen" class="fixed inset-0 z-50 bg-default/95 backdrop-blur md:hidden">
      <div class="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="搜索歌名、歌手或制作人"
            size="md"
            class="flex-1"
            autocomplete="off"
            autofocus
            aria-label="搜索歌曲"
            @keydown.enter.prevent="submit"
          />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="关闭搜索" @click="reset" />
        </div>
        <div class="rounded-xl bg-default ring ring-default">
          <SiteSearchResults :query="query" :local="localHits" @select="openSong" />
        </div>
      </div>
    </div>
  </div>
</template>
