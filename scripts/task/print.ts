/**
 * Prints a flat key=value record for agents to parse from command output.
 * Booleans become `true`/`false`; null/undefined become empty strings.
 */
export const printRecord = (record: Record<string, string | number | boolean | null | undefined>): void => {
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      console.log(`${key}=`)
      continue
    }
    if (typeof value === 'boolean') {
      console.log(`${key}=${value ? 'true' : 'false'}`)
      continue
    }
    const text = String(value)
    // Keep values single-line so shell parsers stay simple.
    console.log(`${key}=${text.replace(/\r?\n/g, ' | ')}`)
  }
}

/** Prints a single key=value error line and returns the exit code to use. */
export const printError = (message: string, code = 1): number => {
  printRecord({ ok: false, error: message })
  return code
}
