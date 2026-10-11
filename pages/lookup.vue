<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCatalog } from '../composables/useCatalog.ts'
import { localSongMatches, type LookupHit } from '../shared/lookup.ts'

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
  <main>
    <p class="lede">
      目录里已经有的歌不会再请求 VocaDB。只有本地没有命中时，服务器才向 VocaDB 查询最多 5 首，并只返回已登记的投稿链接。
    </p>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <ClientOnly>
      <section v-if="catalog" class="panel">
        <form class="controls" @submit.prevent="submit">
          <label>
            歌名或作者
            <input v-model="query" type="search" maxlength="80" required>
          </label>
          <button type="submit" :disabled="searching">检索</button>
        </form>
        <p v-if="lookupError" class="note">{{ lookupError }}</p>
        <p v-if="localHits.length" class="note">已在本地目录中，未请求 VocaDB。</p>
        <ul v-if="localHits.length">
          <li v-for="song in localHits" :key="song.id">
            <a :href="song.source_url"><SongTitle :song-id="song.id" :original="song.name" /></a>
            <span v-if="song.artist_string"> · {{ song.artist_string }}</span>
          </li>
        </ul>
        <p v-if="lookedUp" class="note">以下来自 VocaDB 实时检索，尚未写入仓库。</p>
        <ul v-if="remoteHits.length">
          <li v-for="hit in remoteHits" :key="hit.id">
            <a :href="hit.url"><SongTitle :song-id="hit.id" :original="hit.name" /></a>
            <span v-if="hit.artistString"> · {{ hit.artistString }}</span>
            <span v-for="pv in hit.pvs" :key="pv.url">
              · <a :href="pv.url">{{ pv.platform }}</a>
            </span>
          </li>
        </ul>
        <p v-else-if="lookedUp" class="note">VocaDB 没有返回结果。</p>
      </section>
    </ClientOnly>
  </main>
</template>
