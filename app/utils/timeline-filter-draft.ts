/** Filter values confirmed in the timeline filter menu, written back into the page state at once. */
export type TimelineFilterDraft = {
  /** Lower year bound; `0` means no bound, matching the page's sentinel. */
  yearFrom: number
  /** Upper year bound; `0` means no bound. */
  yearTo: number
  /** Selected series ids. */
  selectedSeries: number[]
  /** Selected city names. */
  selectedCities: string[]
  /** Selected producer names. */
  selectedProducers: string[]
  /** Selected character names. */
  selectedCharacters: string[]
  /** Whether broadcast / online / VR shows count. */
  includeBroadcast: boolean
  /** Whether song versions are merged before counting. */
  mergeVariants: boolean
}
