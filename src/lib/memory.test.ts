import { describe, expect, it } from 'vitest'
import { classifyFit, stackTotals } from './memory'

const base = { vramGb: 48, cards: 2, ramGb: 192, moe: false }
describe('memory fit', () => {
  it('fits in VRAM when weights plus context are under usable VRAM', () => {
    expect(classifyFit({ ...base, weightsGb: 30 }).fit).toBe('vram')
  })
  it('a dense model that needs system RAM is slow, not offload', () => {
    expect(classifyFit({ ...base, weightsGb: 100 }).fit).toBe('slow')
  })
  it('a MoE model that needs system RAM is offload', () => {
    expect(classifyFit({ ...base, weightsGb: 100, moe: true }).fit).toBe('offload')
  })
  it('does not fit past VRAM plus usable RAM', () => {
    expect(classifyFit({ ...base, weightsGb: 250, moe: true }).fit).toBe('no')
  })
  it('reserves overhead per card and an OS reserve, so the boundary is not the raw totals', () => {
    // 48 GB VRAM, 2 cards -> 45 usable. 41 GB weights + 4 GB context = 45: fits exactly; 41.1 does not.
    expect(classifyFit({ ...base, weightsGb: 41 }).fit).toBe('vram')
    expect(classifyFit({ ...base, weightsGb: 41.1 }).fit).toBe('slow')
    // 0 GB VRAM, 192 RAM -> 184 usable. 180 + 4 = 184 fits; more does not.
    expect(classifyFit({ vramGb: 0, cards: 0, ramGb: 192, weightsGb: 180, moe: true }).fit).toBe('offload')
    expect(classifyFit({ vramGb: 0, cards: 0, ramGb: 192, weightsGb: 181, moe: true }).fit).toBe('no')
  })
  it('stack totals: all at once sums, one at a time takes the biggest', () => {
    expect(stackTotals([10, 20, 5])).toEqual({ allAtOnce: 35, oneAtATime: 20 })
  })
})
