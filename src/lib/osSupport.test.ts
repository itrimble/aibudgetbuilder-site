import { describe, expect, it } from 'vitest'
import gpuData from '../data/parts/gpus.json'
import { osSupport } from './osSupport'
import type { Gpu } from './types'

const GPUS = gpuData as unknown as Gpu[]
const by = (id: string) => GPUS.find((g) => g.id === id)!

describe('osSupport', () => {
  it('maps every card, including the owned examples, to a family row with a status for all three systems', () => {
    for (const g of GPUS) {
      const s = osSupport(g)
      expect(s.family, g.id).toBeTruthy()
      for (const k of ['windows', 'linux', 'macos'] as const) expect(['works', 'works with caveat', 'not supported', 'not researched'], `${g.id} ${k}`).toContain(s[k].status)
    }
  })
  it('follows the checked tables: RX 6000 is Vulkan-only on Windows, RX 7000 and 9000 work, MI50 is not supported on Windows', () => {
    expect(osSupport(by('rx-6800-xt')).windows.status).toBe('works with caveat')
    expect(osSupport(by('rx-6800-xt')).windows.backend).toMatch(/Vulkan/)
    expect(osSupport(by('rx-7900-xtx')).windows.status).toBe('works')
    expect(osSupport(by('instinct-mi50-32')).windows.status).toBe('not supported')
  })
  it('puts Pascal and Volta cards in the caveat family, and no NVIDIA or AMD card on macOS', () => {
    expect(osSupport(by('tesla-p40')).family).toMatch(/Pascal/)
    expect(osSupport(by('v100-32-sxm2')).family).toMatch(/Pascal/)
    for (const g of GPUS) expect(osSupport(g).macos.status, g.id).toBe('not supported')
  })
  it('warns that a passive NVIDIA data-centre card has no video output', () => {
    expect(osSupport(by('tesla-p40')).extra).toMatch(/no video output/)
    expect(osSupport(by('rtx-3090')).extra).toBeUndefined()
  })
})
