import { bitsOf, type QuantId } from './quant'

export type SpeedCard = { id: string; vram_gb: number; bandwidth_gbs?: number | null }
export type Speed = { tokPerSec: number; bytesGb: number } | { missing: string[] }

/**
 * An UPPER BOUND on generation speed, not a prediction. Each generated token reads the model's active weights once; a model split by layers reads each
 * card's share from that card's memory, one card after another, so time per token is the sum of (bytes on the card / its memory bandwidth).
 * The split is proportional to each card's memory. Real speeds in the sources we read reached about half to four-fifths of this bound.
 * Needs a maker-sourced bandwidth for every card; otherwise it returns which cards are missing and shows nothing.
 */
export function speedBound(cards: SpeedCard[], activeParamsB: number, quant: QuantId): Speed {
  const missing = cards.filter((c) => !(c.bandwidth_gbs && c.bandwidth_gbs > 0)).map((c) => c.id)
  if (cards.length === 0 || missing.length) return { missing: missing.length ? [...new Set(missing)] : ['no cards'] }
  const bytesGb = (activeParamsB * bitsOf(quant)) / 8
  const vram = cards.reduce((s, c) => s + c.vram_gb, 0)
  const seconds = cards.reduce((s, c) => s + ((bytesGb * c.vram_gb) / vram) / (c.bandwidth_gbs as number), 0)
  return { tokPerSec: 1 / seconds, bytesGb }
}
