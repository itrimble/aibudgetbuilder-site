import { describe, expect, it } from 'vitest'
import { priceSeries } from './priceHistory'

describe('priceSeries', () => {
  const days = { '2026-11-03': { a: [10, 20] as [number, number] }, '2026-11-05': { a: [12, 22] as [number, number], b: [5, 6] as [number, number] }, '2026-11-04': { b: [4, 6] as [number, number] } }
  it('returns the lowest price per recorded day, oldest first, skipping days a card is missing', () => {
    expect(priceSeries('a', days)).toEqual([{ date: '2026-11-03', low: 10 }, { date: '2026-11-05', low: 12 }])
    expect(priceSeries('b', days).map((p) => p.date)).toEqual(['2026-11-04', '2026-11-05'])
    expect(priceSeries('zzz', days)).toEqual([])
  })
})
