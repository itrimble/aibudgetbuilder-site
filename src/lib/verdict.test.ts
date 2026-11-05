import { describe, expect, it } from 'vitest'
import gpuData from '../data/parts/gpus.json'
import type { Gpu } from './types'
import { cardVerdict } from './verdict'

const GPUS = (gpuData as unknown as Gpu[]).filter((g) => !g.owned_only)
const byId = (id: string) => GPUS.find((g) => g.id === id)!

describe('cardVerdict', () => {
  it('gives every buyable card a short, third-person verdict', () => {
    for (const g of GPUS) {
      const v = cardVerdict(g)
      expect(v.length, g.id).toBeGreaterThan(10)
      expect(v.length, g.id).toBeLessThan(160)
      expect(v, g.id).not.toMatch(/\b(I|my|we)\b/i)
    }
  })
  it('says passive exactly for passive cards', () => {
    for (const g of GPUS) expect(/Passive/.test(cardVerdict(g)), g.id).toBe(g.cooling === 'passive')
  })
  it('carries the known software caveats', () => {
    expect(cardVerdict(byId('tesla-p40'))).toMatch(/Pascal/)
    expect(cardVerdict(byId('instinct-mi50-32'))).toMatch(/ROCm dropped/)
    expect(cardVerdict(byId('radeon-pro-v620'))).toMatch(/Vulkan on Windows/)
    expect(cardVerdict(byId('arc-b580'))).toMatch(/Vulkan only/)
    expect(cardVerdict(byId('rtx-3090'))).toMatch(/CUDA/)
  })
})
