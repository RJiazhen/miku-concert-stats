import raw from '~~/data/characters.zh-CN.json'
import {
  characterSortLocale,
  localizeCharacterName,
  parseCharacterNames,
  type CharacterNameFile,
} from '~~/shared/character-names.ts'
import { useSongLanguage } from './useSongLanguage.ts'

/** Parsed once: the character list is static build-time data. */
export const characterNameFile: CharacterNameFile = parseCharacterNames(raw)

/**
 * Localizes character names to the site's current language.
 * The language is shared with song titles and places, so one switch covers every name.
 */
export const useCharacterNames = () => {
  const { language } = useSongLanguage()

  /** Chinese name when the site language is Chinese, otherwise the canonical Japanese name. */
  const localizeCharacter = (name: string): string => localizeCharacterName(characterNameFile, name, language.value)

  /** Compares two canonical names by the label each shows in the active language. */
  const compareCharacters = (left: string, right: string): number =>
    localizeCharacter(left).localeCompare(localizeCharacter(right), characterSortLocale(language.value))

  /** Compares two character lists by their `、`-joined display text in the active language. */
  const compareCharacterLists = (left: readonly string[], right: readonly string[]): number =>
    left.map(localizeCharacter).join('、').localeCompare(
      right.map(localizeCharacter).join('、'),
      characterSortLocale(language.value),
    )

  return { localizeCharacter, compareCharacters, compareCharacterLists }
}
