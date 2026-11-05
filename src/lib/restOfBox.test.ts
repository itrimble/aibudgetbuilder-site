import { describe, expect, it } from 'vitest'
import boards from '../data/parts/boards.json'
import { restOfBox } from './restOfBox'
import type { Board } from './types'

const BOARDS = boards as unknown as Board[]
const tomahawk = BOARDS.find((b) => b.id === 'msi-x570-tomahawk')!

describe('restOfBox', () => {
  it('prices only the drive for a PC you already own', () => {
    const r = restOfBox({ scratch: false, board: tomahawk, nvme: 1, openFrame: true })
    expect(r.items.map((i) => i.label)).toEqual(['2 TB NVMe drive'])
    expect(r.unpriced).toEqual([])
    expect(r.low).toBeGreaterThan(100)
  })
  it('multiplies the drive by the number wanted and adds nothing for zero drives', () => {
    const one = restOfBox({ scratch: false, board: tomahawk, nvme: 1, openFrame: true }).low
    expect(restOfBox({ scratch: false, board: tomahawk, nvme: 2, openFrame: true }).low).toBeCloseTo(one * 2, 2)
    expect(restOfBox({ scratch: false, board: tomahawk, nvme: 0, openFrame: true }).items).toEqual([])
  })
  it('adds memory and a case when starting from scratch, and always says the CPU is not priced', () => {
    const r = restOfBox({ scratch: true, board: tomahawk, nvme: 1, openFrame: true })
    expect(r.items.some((i) => /DDR4/.test(i.label))).toBe(true)
    expect(r.items.some((i) => /Open-frame/.test(i.label))).toBe(true)
    expect(r.unpriced).toContain('CPU')
  })
  it('lists a board with no price as not priced instead of guessing', () => {
    const unpricedBoard = BOARDS.find((b) => !b.price_low)!
    expect(restOfBox({ scratch: true, board: unpricedBoard, nvme: 1, openFrame: false }).unpriced).toContain('board')
  })
  it('gives every priced line a basis, a date and a source', () => {
    for (const i of restOfBox({ scratch: true, board: tomahawk, nvme: 1, openFrame: false }).items) {
      expect(i.basis.length).toBeGreaterThan(3)
      expect(i.checked_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
