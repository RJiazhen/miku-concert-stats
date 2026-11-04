import { nextTick, onMounted, ref, watch } from 'vue'

/** localStorage key holding the unsent draft, namespaced with the site prefix. */
export const FEEDBACK_DRAFT_KEY = 'miku-feedback-draft'

/** The two fields the visitor types; the page context is re-collected on every open. */
export type FeedbackDraft = { description: string; sourceUrl: string }

/** Empty draft used when nothing is stored or storage is unavailable. */
const emptyDraft = (): FeedbackDraft => ({ description: '', sourceUrl: '' })

/** Reads the cached draft. SSR, private mode and corrupt JSON all fall back to an empty draft. */
const readStoredDraft = (): FeedbackDraft => {
  if (!import.meta.client) return emptyDraft()
  try {
    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY)
    if (!raw) return emptyDraft()
    const decoded: unknown = JSON.parse(raw)
    if (typeof decoded !== 'object' || decoded === null) return emptyDraft()
    const draft = decoded as Partial<FeedbackDraft>
    return {
      description: typeof draft.description === 'string' ? draft.description : '',
      sourceUrl: typeof draft.sourceUrl === 'string' ? draft.sourceUrl : '',
    }
  } catch {
    return emptyDraft()
  }
}

/** Writes the draft. Quota errors and blocked storage in private mode are swallowed. */
const writeStoredDraft = (draft: FeedbackDraft): void => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(FEEDBACK_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Caching is best-effort: a failed write must not block typing or submitting.
  }
}

/** Removes the cached draft, used only after a successful submit. */
const clearStoredDraft = (): void => {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(FEEDBACK_DRAFT_KEY)
  } catch {
    // Nothing to do: the in-memory form is already empty after a success.
  }
}

/**
 * Persists the feedback form while the visitor types.
 * Closing or cancelling the modal keeps the draft; only `clearDraft()` (after a successful
 * submit) removes it. Restores the stored text when the component mounts.
 */
export const useFeedbackDraft = () => {
  const description = ref('')
  const sourceUrl = ref('')
  /** Guards the watcher while a successful submit empties the form, so no empty draft is written back. */
  const clearing = ref(false)

  /** Applies the cached draft after hydration, so server HTML and client HTML agree. */
  onMounted(() => {
    const stored = readStoredDraft()
    description.value = stored.description
    sourceUrl.value = stored.sourceUrl
  })

  /** Saves on every keystroke; last write wins across tabs. */
  watch([description, sourceUrl], () => {
    if (clearing.value) return
    writeStoredDraft({ description: description.value, sourceUrl: sourceUrl.value })
  })

  /** Empties the form and the cache after a successful submit. */
  const clearDraft = async (): Promise<void> => {
    clearing.value = true
    description.value = ''
    sourceUrl.value = ''
    clearStoredDraft()
    await nextTick()
    clearing.value = false
  }

  return { description, sourceUrl, clearDraft }
}
