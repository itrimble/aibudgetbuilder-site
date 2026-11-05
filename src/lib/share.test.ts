import { describe, expect, it } from 'vitest'
import { decodeBuild, encodeBuild, type BuildState, type Known } from './share'
import { csvCell, toCsv, toText } from './exportBuild'

const known: Known = {
  pcs: { omarchy: { hasPsu: false }, gamer: { hasPsu: true } },
  boards: ['msi-x570-tomahawk', 'hp-z4-g4'],
  gpus: ['tesla-p40', 'radeon-pro-v620'],
  adapters: ['adt-r13-x1-x16-extender'],
  psus: ['msi-meg-ai1600t-pcie5'],
}
const state: BuildState = { pcId: 'omarchy', boardId: 'msi-x570-tomahawk', counts: { 'tesla-p40': 4, 'radeon-pro-v620': 1 }, adapterIds: ['adt-r13-x1-x16-extender', 'adt-r13-x1-x16-extender'], psuId: 'msi-meg-ai1600t-pcie5', nvme: 1, openFrame: true, airflow: false, keepOwned: true }

describe('share links', () => {
  it('remembers a pulled card, treats a missing flag as keep, and rejects any other value', () => {
    const pulled = { ...state, keepOwned: false }
    expect(decodeBuild(encodeBuild(pulled), known)).toEqual(pulled)
    expect(encodeBuild(state)).not.toContain('ko=')
    expect(decodeBuild(encodeBuild(state) + '&ko=1', known)).toBeNull()
  })
  it('round-trips a build exactly', () => {
    expect(decodeBuild(encodeBuild(state), known)).toEqual(state)
    expect(decodeBuild('#' + encodeBuild(state), known)).toEqual(state)
  })
  it('drops zero counts and is stable regardless of key order', () => {
    const a = encodeBuild({ ...state, counts: { 'tesla-p40': 4, 'radeon-pro-v620': 0 } })
    const b = encodeBuild({ ...state, counts: { 'radeon-pro-v620': 0, 'tesla-p40': 4 } })
    expect(a).toBe(b)
    expect(a).not.toContain('radeon')
  })
  it('rejects the whole link for any unknown id, never a partial build', () => {
    const q = (patch: Record<string, string>) => { const p = new URLSearchParams(encodeBuild(state)); for (const [k, v] of Object.entries(patch)) p.set(k, v); return p.toString() }
    expect(decodeBuild(q({ pc: 'nobody' }), known)).toBeNull()
    expect(decodeBuild(q({ b: 'fake-board' }), known)).toBeNull()
    expect(decodeBuild(q({ g: 'tesla-p40:2,fake-card:1' }), known)).toBeNull()
    expect(decodeBuild(q({ a: 'fake-adapter' }), known)).toBeNull()
    expect(decodeBuild(q({ p: 'fake-psu' }), known)).toBeNull()
  })
  it('rejects out-of-range or malformed numbers and flags', () => {
    const q = (patch: Record<string, string>) => { const p = new URLSearchParams(encodeBuild(state)); for (const [k, v] of Object.entries(patch)) p.set(k, v); return p.toString() }
    for (const g of ['tesla-p40:0', 'tesla-p40:17', 'tesla-p40:-1', 'tesla-p40:1.5', 'tesla-p40:x', 'tesla-p40:2:3', 'tesla-p40:1,tesla-p40:2']) expect(decodeBuild(q({ g }), known), g).toBeNull()
    expect(decodeBuild(q({ n: '5' }), known)).toBeNull()
    expect(decodeBuild(q({ n: '-1' }), known)).toBeNull()
    expect(decodeBuild(q({ of: '2' }), known)).toBeNull()
    expect(decodeBuild(q({ af: 'yes' }), known)).toBeNull()
    expect(decodeBuild(q({ a: Array(33).fill('adt-r13-x1-x16-extender').join(',') }), known)).toBeNull()
  })
  it('accepts the owned PSU only for a PC that has one', () => {
    expect(decodeBuild(encodeBuild({ ...state, pcId: 'gamer', psuId: 'owned' }), known)?.psuId).toBe('owned')
    expect(decodeBuild(encodeBuild({ ...state, pcId: 'omarchy', psuId: 'owned' }), known)).toBeNull()
  })
  it('returns null for empty or junk input', () => {
    expect(decodeBuild('', known)).toBeNull()
    expect(decodeBuild('#view=models', known)).toBeNull()
    expect(decodeBuild('%%%', known)).toBeNull()
  })
})

describe('export', () => {
  const lines = [
    { kind: 'GPU', name: 'Tesla P40, 24 GB', qty: 4, low: 240, high: 315, checked_on: '2026-11-03', source_url: 'https://example.com/a?x=1&y=2' },
    { kind: 'PSU', name: 'MSI "MEG" Ai1600T', qty: 1, low: 622.96, high: 622.96, checked_on: '2026-11-03', source_url: 'https://example.com/b' },
  ]
  it('quotes commas, quotes and newlines, and defuses spreadsheet formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`)
    expect(csvCell(-5)).toBe('-5')
    expect(csvCell('plain')).toBe('plain')
  })
  it('writes a header, one row per part, and CRLF line ends', () => {
    const csv = toCsv(lines)
    const rows = csv.trimEnd().split('\r\n')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toBe('Part type,Name,Quantity,Price low each (USD),Price high each (USD),Price checked,Source')
    expect(rows[1]).toBe('GPU,"Tesla P40, 24 GB",4,240,315,2026-11-03,https://example.com/a?x=1&y=2')
    expect(rows[2]).toContain('"MSI ""MEG"" Ai1600T"')
  })
  it('text summary adds up the subtotal and keeps the dates and the caveat', () => {
    const t = toText({ title: 'My build', date: '2026-11-04', lines, vram: 96, cards: 4, watts: 1150, findings: [{ severity: 'warn', message: 'x' }], link: 'http://l/#b' })
    expect(t).toContain('Subtotal: $1,583 to $1,883')
    expect(t).toContain('4 x Tesla P40, 24 GB: $240 to $315 each (checked 2026-11-03)')
    expect(t).toContain('[WARN] x')
    expect(t).toContain('not quotes')
    expect(t).toContain('Open this build: http://l/#b')
  })
  it('an empty build says so and does not invent a total', () => {
    const t = toText({ title: 'Empty', date: '2026-11-04', lines: [], vram: 0, cards: 0, watts: 150, findings: [] })
    expect(t).toContain('- nothing')
    expect(t).toContain('Subtotal: $0.')
    expect(t).toContain('- none yet')
  })
})
