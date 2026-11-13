import raw from '~~/data/setlist-merges.json'
import { parseSetlistMerges, type SetlistMergeIndex } from '~~/shared/edition-setlists.ts'

/** Parsed once: the merge file is static build-time data. */
export const setlistMerges: SetlistMergeIndex = parseSetlistMerges(raw)

/** Hand-checked region groups for song lists that cover the same series year. */
export const useSetlistMerges = (): SetlistMergeIndex => setlistMerges
