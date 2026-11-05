import { fitsModel } from './compat'
import { OVERHEAD_GB } from './constants'

export type Fit = 'fits' | 'tight' | 'no'

/** Fits when the build's memory covers the model plus per-card overhead; tight when less than 15% of the model's size is left over. */
export function fitOf(vram: number, need: number, cards: number): Fit {
  if (!fitsModel(vram, need, OVERHEAD_GB, cards)) return 'no'
  return vram - OVERHEAD_GB * cards - need < need * 0.15 ? 'tight' : 'fits'
}
