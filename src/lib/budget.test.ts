import { describe, expect, it } from 'vitest'
import boards from '../data/parts/boards.json'
import gpus from '../data/parts/gpus.json'
import adapters from '../data/parts/adapters.json'
import psus from '../data/parts/psu.json'
import { TIERS, recommend } from './budget'
import type { Adapter, Board, Gpu, Psu } from './types'

const board = boards.find((b) => b.id === 'msi-x570-tomahawk') as unknown as Board
const G = gpus as unknown as Gpu[]
const owned = [G.find((g) => g.id === 'rx-6600xt')!]
const base = { board, owned, gpus: G, adapters: adapters as unknown as Adapter[], psus: psus as unknown as Psu[] }
const best = (usd: number) => recommend({ ...base, budgetUsd: usd }).options[0]

describe('budget recommender', () => {
  it('never recommends anything whose top price is over the budget', () => {
    for (const t of TIERS) for (const o of recommend({ ...base, budgetUsd: t.usd }).options) expect(o.costHigh).toBeLessThanOrEqual(t.usd)
  })

  it('never recommends a build that has an error finding', () => {
    for (const o of recommend({ ...base, budgetUsd: 10000 }).options) expect(o.findings.filter((f) => f.severity === 'error')).toEqual([])
  })

  it('more money never gives less memory', () => {
    let prev = 0
    for (const t of TIERS) { const v = best(t.usd)?.vram ?? 0; expect(v).toBeGreaterThanOrEqual(prev); prev = v }
  })

  it('sorts options by memory, most first', () => {
    const v = recommend({ ...base, budgetUsd: 10000 }).options.map((o) => o.vram)
    expect(v).toEqual([...v].sort((a, b) => b - a))
  })

  it('when nothing fits, says so and still reports the cheapest buildable option', () => {
    const r = recommend({ ...base, budgetUsd: 50 })
    expect(r.options).toEqual([])
    expect(r.cheapest).not.toBeNull()
    expect(r.cheapest!.costLow).toBeGreaterThan(50)
  })

  it('counts owned memory and does not charge for the owned card', () => {
    const o = recommend({ ...base, budgetUsd: 10000 }).options[0]
    expect(o.vram).toBe(8 + o.n * o.gpu.vram_gb)
    expect(o.costLow).toBeGreaterThanOrEqual(o.n * o.gpu.price_low)
  })

  it('uses a PSU you already own when it is big enough, and charges nothing for it', () => {
    const own: Psu = { id: 'owned', name: 'Own', watts: 1600, pcie_8pin: 8, price: 0, source_url: '', checked_on: '' }
    const o = recommend({ ...base, psus: [own], budgetUsd: 10000 }).options[0]
    expect(o.buyPsu).toBe(false)
    expect(o.needs).not.toContain('a new PSU')
  })

  it('does not invent a PSU: with only a small PSU available, large builds are dropped', () => {
    const small: Psu = { id: 'small', name: 'Small', watts: 500, pcie_8pin: 1, price: 0, source_url: '', checked_on: '' }
    const r = recommend({ ...base, psus: [small], budgetUsd: 10000 })
    for (const o of r.options) expect(o.psu.id).toBe('small')
    expect(r.options.every((o) => o.n <= 1)).toBe(true)
  })

  it('flags placeholder prices it relied on', () => {
    // The live data no longer has placeholders, so inject them: the cheapest riser and M.2 adapter are stand-ins here.
    const fake = (kind: string, id: string) => ({ ...(base.adapters.find((a) => a.kind === kind) as Adapter), id, price: 1, placeholder: true }) as Adapter
    const withPlaceholders = { ...base, adapters: [...base.adapters, fake('riser', 'fake-riser'), fake('m2-to-pcie', 'fake-m2')] }
    const options = recommend({ ...withPlaceholders, budgetUsd: 10000 }).options
    expect(options.some((o) => o.placeholders.includes('risers'))).toBe(true)
    expect(options.some((o) => o.placeholders.includes('M.2 adapters'))).toBe(true)
    // and with the live data, nothing leans on a placeholder
    expect(recommend({ ...base, budgetUsd: 10000 }).options.every((o) => !o.placeholders.includes('risers') && !o.placeholders.includes('M.2 adapters'))).toBe(true)
  })

  it('tiers are ascending', () => { for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].usd).toBeGreaterThan(TIERS[i - 1].usd) })
})
