/** Character chips kept inline on tablet widths before the rest collapse into the counter button. */
export const VISIBLE_CHARACTER_CHIPS = 3

/** Chips that fit a cell, plus the names hidden behind the counter button. */
export type CharacterChipSplit = {
  visible: string[]
  hidden: string[]
}

/**
 * Splits character names into the chips shown inline and the rest behind `+N`.
 * At most `limit` names stay in the folded set; `CharacterChips` only folds them on tablet
 * (`md`..`lg`) and prints every name on phone and desktop widths.
 */
export const splitCharacterChips = (names: readonly string[], limit = VISIBLE_CHARACTER_CHIPS): CharacterChipSplit => {
  if (names.length <= limit) return { visible: [...names], hidden: [] }
  return { visible: names.slice(0, limit), hidden: names.slice(limit) }
}
