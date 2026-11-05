import { describe, expect, it } from 'vitest'
import { needGb, weightsGb } from './quant'
import { speedBound } from './speed'

describe('quant and speed', () => {
  it('keeps the stored estimate unless a quantisation is chosen', () => {
    expect(needGb({ params_b: 79.7, vram_gb_estimate: 52 }, '')).toBe(52)
    expect(needGb({ params_b: null, vram_gb_estimate: 30 }, 'Q8_0')).toBe(30)
  })
  it('scales weights with bits per weight and adds the context allowance', () => {
    expect(weightsGb(8, 'Q8_0')).toBeCloseTo(8.5, 5)
    expect(needGb({ params_b: 27, vram_gb_estimate: 21 }, 'Q4_K_M')).toBe(Math.round((27 * 4.85) / 8 + 4))
    expect(needGb({ params_b: 27, vram_gb_estimate: 21 }, 'Q8_0')).toBeGreaterThan(needGb({ params_b: 27, vram_gb_estimate: 21 }, 'Q4_K_M'))
  })
  it('gives bandwidth divided by model bytes for one card', () => {
    const s = speedBound([{ id: 'a', vram_gb: 24, bandwidth_gbs: 400 }], 8, 'Q8_0')
    expect('tokPerSec' in s && s.tokPerSec).toBeCloseTo(400 / 8.5, 3)
  })
  it('adds the time on each card for a split model', () => {
    const s = speedBound([{ id: 'a', vram_gb: 16, bandwidth_gbs: 400 }, { id: 'b', vram_gb: 16, bandwidth_gbs: 200 }], 16, 'Q8_0')
    // 17 GB of weights, half on each: 8.5/400 + 8.5/200 seconds per token
    expect('tokPerSec' in s && s.tokPerSec).toBeCloseTo(1 / (8.5 / 400 + 8.5 / 200), 3)
  })
  it('refuses to estimate when any card has no sourced bandwidth', () => {
    const s = speedBound([{ id: 'a', vram_gb: 16, bandwidth_gbs: 400 }, { id: 'b', vram_gb: 16 }], 8, 'Q4_K_M')
    expect(s).toEqual({ missing: ['b'] })
    expect(speedBound([], 8, 'Q4_K_M')).toEqual({ missing: ['no cards'] })
  })
})
