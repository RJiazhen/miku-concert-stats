import { computed } from 'vue'
import { useLocale } from './useLocale.ts'

/**
 * The demo prompt that points an external AI at `/skill.md`, shared by the header button and the
 * compact menu, so both copy exactly the same three lines in the active language.
 */
export const useAiPrompt = () => {
  const { t } = useLocale()

  /** Prompt text: the skill link plus two short questions, in the active language. */
  const prompt = computed(() => [t('ai.promptIntro'), t('ai.promptQ1'), t('ai.promptQ2')].join('\n'))

  /** Copies the prompt; `false` means the clipboard refused so the caller can report it. */
  const copyPrompt = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(prompt.value)
      return true
    } catch {
      return false
    }
  }

  return { prompt, copyPrompt }
}
