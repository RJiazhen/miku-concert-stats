import raw from '~~/data/producer-flags.json'
import { parseProducerFlags, type ProducerFlagIndex } from '~~/shared/producer-flags.ts'

/** Parsed once: the flag file is static build-time data. */
export const producerFlags: ProducerFlagIndex = parseProducerFlags(raw)

/** Checked producer kinds shared by the ranking, filters, search, and song pages. */
export const useProducerFlags = (): ProducerFlagIndex => producerFlags
