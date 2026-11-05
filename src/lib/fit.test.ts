import { describe, expect, it } from 'vitest'
import { OVERHEAD_GB } from './constants'
import { fitOf } from './fit'

describe('fitOf', () => {
  it("says won't fit when the memory cannot cover the model plus per-card overhead", () => {
    expect(fitOf(24, 30, 1)).toBe('no')
    expect(fitOf(24, 24, 1)).toBe('no')
  })
  it('says tight when under 15% of the model size is left', () => {
    const need = 20
    expect(fitOf(need + OVERHEAD_GB + 1, need, 1)).toBe('tight')
  })
  it('says fits when there is room to spare, and counts overhead once per card', () => {
    expect(fitOf(80, 15, 3)).toBe('fits')
    expect(fitOf(24, 20, 2)).toBe('tight') // 24 - 2 x 1.5 = 21 GB, so 1 GB is left: under 15% of 20
    expect(fitOf(24, 21.5, 2)).toBe('no') // 21 GB is not enough for 21.5
  })
})
