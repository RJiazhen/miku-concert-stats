<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { localSongMatches, type LookupHit } from '~~/shared/lookup.ts'

const { catalog, error, pending, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const query = ref('')
const localHits = ref<ReturnType<typeof localSongMatches>>([])
const remoteHits = ref<LookupHit[]>([])
const lookedUp = ref(false)
const lookupError = ref<string | null>(null)
const searching = ref(false)

/** Searches the local catalog first and calls VocaDB only when nothing matches. */
const submit = async (): Promise<void> => {
  lookedUp.value = false
  lookupError.value = null
  remoteHits.value = []
  if (!catalog.value) return
  localHits.value = localSongMatches(catalog.value, query.value)
  if (localHits.value.length > 0 || query.value.trim() === '') return
  searching.value = true
  try {
    const response = await fetch(`/api/lookup?q=${encodeURIComponent(query.value.trim())}`)
    if (!response.ok) throw new Error(`检索失败（${response.status}）`)
    remoteHits.value = (await response.json()) as LookupHit[]
    lookedUp.value = true
  } catch (caught) {
    lookupError.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    searching.value = false
  }
}
</script>

<template>
  <main class="space-y-6">
    <header class="space-y-2">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Lookup</p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">检索</h1>
      <p class="max-w-2xl text-sm leading-relaxed text-muted">
        目录里已经有的歌不会再请求 VocaDB。只有本地没有命中时，服务器才向 VocaDB 查询最多 5 首，并只返回已登记的投稿链接。
      </p>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UAlert v-if="lookupError" color="warning" variant="subtle" icon="i-lucide-circle-alert" :description="lookupError" />

    <UCard>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="submit">
        <UInput
          v-model="query"
          type="search"
          maxlength="80"
          required
          icon="i-lucide-search"
          placeholder="歌名或艺人"
          class="min-w-64 flex-1"
        />
        <UButton type="submit" :loading="searching" icon="i-lucide-search" label="检索" />
      </form>

      <div v-if="localHits.length > 0" class="mt-4 space-y-2">
        <p class="text-xs text-muted">已在本地目录中，未请求 VocaDB。</p>
        <ul class="space-y-1 text-sm">
          <li v-for="hit in localHits" :key="hit.id">
            <NuxtLink :to="`/songs/${hit.id}`" class="text-primary">
              <SongTitle :song-id="hit.id" :original="hit.name" />
            </NuxtLink>
            <span v-if="hit.artist_string" class="text-muted"> · {{ hit.artist_string }}</span>
          </li>
        </ul>
      </div>

      <div v-if="lookedUp" class="mt-4 space-y-2">
        <p class="text-xs text-muted">以下来自 VocaDB 实时检索，尚未写入仓库。</p>
        <ul v-if="remoteHits.length > 0" class="space-y-2 text-sm">
          <li v-for="hit in remoteHits" :key="hit.id">
            <ULink :to="hit.url" target="_blank" class="text-primary">
              <SongTitle :song-id="hit.id" :original="hit.name" />
            </ULink>
            <span v-if="hit.artistString" class="text-muted"> · {{ hit.artistString }}</span>
            <span v-for="pv in hit.pvs" :key="pv.url" class="text-xs text-muted">
              · <ULink :to="pv.url" target="_blank" class="text-primary">{{ pv.platform }}</ULink>
            </span>
          </li>
        </ul>
        <UEmpty v-else icon="i-lucide-search-x" title="VocaDB 没有返回结果" description="试试更短的歌名或换成日文原名。" variant="naked" />
      </div>
    </UCard>
  </main>
</template>
