/** Character chips shown before the rest collapse into the counter button. */
export const VISIBLE_CHARACTER_CHIPS = 3

/** Chips that fit a cell, plus the names hidden behind the counter button. */
export type CharacterChipSplit = {
  visible: string[]
  hidden: string[]
}

/**
 * Splits character names into the chips shown inline and the rest behind `+N`.
 * At most `limit` names stay visible; the tooltip of the counter renders the remainder,
 * so the character column keeps a fixed height and width.
 */
export const splitCharacterChips = (names: readonly string[], limit = VISIBLE_CHARACTER_CHIPS): CharacterChipSplit => {
  if (names.length <= limit) return { visible: [...names], hidden: [] }
  return { visible: names.slice(0, limit), hidden: names.slice(limit) }
}
