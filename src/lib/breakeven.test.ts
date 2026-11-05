import { describe, expect, it } from 'vitest'
import { breakEven } from './breakeven'

describe('breakEven', () => {
  it('picks the smallest rental tier that holds the build and divides cost by the hourly rate', () => {
    const r = breakEven(24, 500, 1000)!
    expect(r.tier.vram_gb).toBe(24); expect(r.units).toBe(1)
    expect(r.hoursLow).toBeCloseTo(500 / r.tier.usd_per_hour, 6)
    expect(breakEven(40, 800, 800)!.tier.vram_gb).toBe(48)
  })
  it('rents several of the largest tier for a build bigger than it', () => {
    const r = breakEven(160, 4000, 5000)!
    expect(r.tier.vram_gb).toBe(80); expect(r.units).toBe(2)
    expect(r.hoursHigh).toBeCloseTo(5000 / (r.tier.usd_per_hour * 2), 6)
  })
  it('says nothing when there is nothing to compare', () => {
    expect(breakEven(0, 0, 0)).toBeNull()
    expect(breakEven(24, 0, 0)).toBeNull()
  })
})
