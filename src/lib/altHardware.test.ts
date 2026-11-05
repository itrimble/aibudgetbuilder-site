import { describe, expect, it } from 'vitest'
import data from '../data/builds/alt-hardware.json'

describe('alt-hardware data', () => {
  it('gives every option a dated price, a https price source, and at least two read sources', () => {
    for (const o of data.options) {
      expect(o.price_checked_on, o.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(o.price_source, o.id).toMatch(/^https:\/\//)
      expect(o.sources.length, o.id).toBeGreaterThanOrEqual(2)
      for (const s of o.sources) expect(s.url).toMatch(/^https:\/\//)
      expect(o.catches.length, o.id).toBeGreaterThan(0)
    }
  })
  it('does not claim any measurement we did not make', () => {
    expect(data.our_measurements.every((m) => /6600 XT/.test(m.what))).toBe(true)
  })
})

import uses from '../data/builds/use-cases.json'
describe('use-cases data', () => {
  it('gives every use case a description and at least one https source', () => {
    for (const u of uses.use_cases) {
      expect(u.description.length, u.name).toBeGreaterThan(20)
      expect(u.sources.length, u.name).toBeGreaterThan(0)
      for (const s of u.sources) expect(s.url, u.name).toMatch(/^https:\/\//)
    }
  })
  it('never claims more than a search excerpt without saying so', () => {
    for (const u of uses.use_cases) expect(u.confidence, u.name).toMatch(/excerpt/)
  })
})
