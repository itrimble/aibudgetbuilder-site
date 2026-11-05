import { describe, expect, it } from 'vitest'
import boards from '../data/parts/boards.json'
import gpus from '../data/parts/gpus.json'
import adapters from '../data/parts/adapters.json'
import psus from '../data/parts/psu.json'
import { checkBuild, fitsModel, placeCards, totals } from './compat'
import type { Adapter, Board, Build, Gpu, Psu } from './types'

const board = boards.find((b) => b.id === 'msi-x570-tomahawk') as unknown as Board
const g = (id: string) => gpus.find((x) => x.id === id) as unknown as Gpu
const a = (id: string) => adapters.find((x) => x.id === id) as unknown as Adapter
const p = (id: string) => psus.find((x) => x.id === id) as unknown as Psu
const base: Build = { boardId: board.id, gpuIds: [], adapterIds: [], psuId: 'msi-meg-ai1600t-pcie5', nvmeDrives: 1, caseOpenFrame: true, airflowForPassive: true }
const codes = (f: { code: string }[]) => f.map((x) => x.code)

describe('compat', () => {
  it('2 GPUs fit the Tomahawk real slots with no adapter', () => {
    const { placements } = placeCards(board, [g('radeon-pro-v620'), g('radeon-pro-v620')], [])
    expect(placements.map((x) => x.where)).toEqual(['PCI_E1', 'PCI_E3'])
    expect(placements[1].lanes).toBe(4)
  })

  it('a 3rd and 4th card need an adapter or riser', () => {
    const cards = Array(4).fill(g('tesla-p40'))
    const noAdapter = placeCards(board, cards, []).placements.map((x) => x.where)
    expect(noAdapter[2]).toContain('riser')
    const withM2 = placeCards(board, cards, [a('adt-r43sf-m2-x16-gen3'), a('adt-r43sf-m2-x16-gen3')])
    expect(withM2.usedM2).toBe(2)
  })

  it('M.2 adapters remove NVMe slots and conflict with the 2 TB drive when none remain', () => {
    const cards = Array(4).fill(g('tesla-p40'))
    const f = checkBuild({ ...base, nvmeDrives: 1 }, board, cards, [a('adt-r43sf-m2-x16-gen3'), a('adt-r43sf-m2-x16-gen3')], p('msi-meg-ai1600t-pcie5'))
    expect(codes(f)).toContain('m2-conflict')
  })

  it('flags a PSU that is too small', () => {
    const cards = Array(4).fill(g('radeon-pro-v620'))
    const f = checkBuild(base, board, cards, [], p('corsair-rm1000x-shift'))
    expect(codes(f)).toContain('psu-watts')
    expect(codes(f)).toContain('psu-connectors')
  })

  it('flags passive cards without airflow', () => {
    const f = checkBuild({ ...base, airflowForPassive: false }, board, [g('tesla-p40')], [], p('corsair-rm1000x-shift'))
    expect(codes(f)).toContain('passive-no-airflow')
  })

  it('warns that MI50 has no ROCm and mixed vendors need Vulkan', () => {
    const f = checkBuild(base, board, [g('instinct-mi50-32'), g('tesla-p40')], [], p('msi-meg-ai1600t-pcie5'))
    expect(codes(f)).toContain('no-rocm')
    expect(codes(f)).toContain('mixed-vendor')
  })

  it('3+ double-slot cards need an open frame', () => {
    const f = checkBuild({ ...base, caseOpenFrame: false }, board, Array(3).fill(g('tesla-p40')), [], p('msi-meg-ai1600t-pcie5'))
    expect(codes(f)).toContain('no-room')
  })

  it('totals add up and 6x P40 reach 144 GB', () => {
    const t = totals(Array(6).fill(g('tesla-p40')), [], undefined)
    expect(t.vram).toBe(144)
    expect(t.priceLow).toBe(6 * g('tesla-p40').price_low)
  })

  it('model fit accounts for per-card overhead', () => {
    expect(fitsModel(128, 120, 1, 4)).toBe(true)
    expect(fitsModel(128, 126, 1, 4)).toBe(false)
  })
})

describe('compat: honesty fixes', () => {
  it('reports each driver warning once per model, not once per card', () => {
    const f = checkBuild(base, board, Array(3).fill(g('tesla-p40')), [], p('msi-meg-ai1600t-pcie5'))
    expect(f.filter((x) => x.code === 'old-arch')).toHaveLength(1)
  })
})

describe('compat: mains limit', () => {
  const psu = p('msi-meg-ai1600t-pcie5')
  it('warns when estimated draw from the wall passes what a 120 V, 15 A circuit is held to', () => {
    // 6 x P40 = 1500 W + 150 W base = 1650 W DC, about 1833 W from the wall
    expect(codes(checkBuild(base, board, Array(6).fill(g('tesla-p40')), [], psu))).toContain('mains-120v')
  })
  it('does not warn for a modest build', () => {
    // 3 x P40 = 750 + 150 = 900 W DC, about 1000 W from the wall
    expect(codes(checkBuild(base, board, Array(3).fill(g('tesla-p40')), [], psu))).not.toContain('mains-120v')
  })
  it('sits exactly on the limit boundary the way the constants say', () => {
    // 5 x P40 = 1250 + 150 = 1400 W DC; 1400 / 0.9 = 1556 W, over 1440
    expect(codes(checkBuild(base, board, Array(5).fill(g('tesla-p40')), [], psu))).toContain('mains-120v')
    // 4 x P40 = 1000 + 150 = 1150 W DC; 1150 / 0.9 = 1278 W, under 1440
    expect(codes(checkBuild(base, board, Array(4).fill(g('tesla-p40')), [], psu))).not.toContain('mains-120v')
  })
})
