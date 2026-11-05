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

import more from '../data/builds/more-hardware.json'
describe('more-hardware data', () => {
  it('dates every price and names a price basis and a source for every route', () => {
    for (const r of more.routes) {
      expect(r.price_date, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.price_kind.length, r.id).toBeGreaterThan(3)
      expect(r.price_source.length, r.id).toBeGreaterThan(20)
      expect(r.catches.length, r.id).toBeGreaterThan(0)
      expect(r.sources.length, r.id).toBeGreaterThan(0)
      for (const s of r.sources) {
        expect(s.url, r.id).toMatch(/^https:\/\//)
        expect(s.how_seen, `${r.id} ${s.url}`).toBeTruthy()
      }
    }
  })
  it('gives every cluster result and claim check a real https source and how it was seen', () => {
    for (const c of [...more.mac_clusters, ...more.claim_checks]) {
      expect(c.source.url).toMatch(/^https:\/\//)
      expect(c.source.how_seen).toBeTruthy()
    }
  })
  it('keeps every eGPU build total equal to its listed parts, and cites a page that was read', () => {
    for (const b of more.egpu.builds) {
      const sum = (b.parts.match(/\$[\d.]+/g) ?? []).reduce((n, x) => n + Number(x.slice(1)), 0)
      expect(Math.round(sum * 100) / 100, b.name).toBe(b.total)
    }
    expect(more.egpu.source.url).toMatch(/^https:\/\//)
    expect(more.egpu.source.how_seen).toMatch(/read/)
  })
  it('says how every expanded eGPU source was seen, and keeps the Apple Silicon conflict on the page', () => {
    for (const s of [...more.egpu.links.flatMap((l) => l.sources), ...more.egpu.more_docks.flatMap((d) => d.sources), ...more.egpu.others_measured.map((m) => m.source), ...more.egpu.multi.map((m) => m.source)]) {
      expect(s.how_seen, s.url ?? s.label).toBeTruthy()
      expect(s.url ?? '', s.label).toMatch(/^https:\/\//)
    }
    expect(more.egpu.conflict.text).toMatch(/Apple Silicon/)
    for (const r of more.egpu.cost_per_gb.rows) expect(r.egpu_total_usd, r.card).toBeCloseTo(r.card_usd + 177.96, 1)
  })
})

import os from '../data/builds/os-support.json'
describe('os-support data', () => {
  it('has a valid status for all three systems on every row and a source for every operating system', () => {
    for (const r of os.matrix) for (const k of ['windows', 'linux', 'macos'] as const) expect(['works', 'works with caveat', 'not supported', 'not researched'], `${r.family} ${k}`).toContain(r[k].status)
    for (const o of os.os) expect(o.sources.length, o.os).toBeGreaterThan(0)
    expect(os.os.map((o) => o.os).sort()).toEqual(['Linux', 'Windows', 'macOS'])
  })
  it('keeps the two facts we checked ourselves tied to a page we read', () => {
    expect(os.verified_by_us.length).toBe(2)
    for (const v of os.verified_by_us) { expect(v.source.url).toMatch(/^https:\/\//); expect(v.source.how_seen).toMatch(/read/) }
  })
  it('makes no claim about Windows or Linux on Apple silicon', () => {
    const apple = os.matrix.find((r) => r.family.startsWith('Apple'))!
    expect(apple.windows.status).toBe('not researched')
    expect(apple.linux.status).toBe('not researched')
  })
})
