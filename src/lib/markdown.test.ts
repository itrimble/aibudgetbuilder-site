import { describe, expect, it } from 'vitest'
import { toMarkdown } from './exportBuild'

const base = { title: 'AI Budget Build', date: '2026-11-05', vram: 56, cards: 3, watts: 810, findings: [{ severity: 'warn', message: 'A | B\nC' }], link: 'https://example.com/#x' }

describe('toMarkdown', () => {
  it('makes a parts table with dates and the subtotal', () => {
    const md = toMarkdown({ ...base, lines: [{ kind: 'GPU', name: 'Tesla P40 24GB', qty: 2, low: 280, high: 450, checked_on: '2026-11-05', source_url: 'https://x' }] })
    expect(md).toContain('| Tesla P40 24GB | 2 | $280 to $450 | 2026-11-05 |')
    expect(md).toContain('**Subtotal:** $560 to $900')
    expect(md).toContain('[Open this build](https://example.com/#x)')
  })
  it('escapes pipes and newlines so a message cannot break the table', () => {
    const md = toMarkdown({ ...base, lines: [] })
    expect(md).toContain('A \\| B C')
    expect(md).toContain('| nothing to buy | | | |')
  })
})
