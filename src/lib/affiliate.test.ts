import { describe, expect, it } from 'vitest'
import { active, anyActive, disclosure, shopLink } from './affiliate'

describe('affiliate (inactive until IDs are filled in)', () => {
  it('ships inactive: no IDs in the committed config', () => {
    expect(active.ebay).toBe(false)
    expect(active.amazon).toBe(false)
    expect(anyActive).toBe(false)
  })

  it('builds plain, untagged search links with no sponsored rel', () => {
    const e = shopLink('ebay', 'Tesla P40 24GB', 'tesla-p40')
    expect(e.href).toContain('ebay.com/sch/i.html?_nkw=Tesla+P40+24GB')
    expect(e.href).not.toContain('campid')
    expect(e.rel).not.toContain('sponsored')
    const a = shopLink('amazon', 'Tesla P40 24GB', 'tesla-p40')
    expect(a.href).not.toContain('tag=')
    expect(a.rel).not.toContain('sponsored')
  })

  it('does not claim a commission while inactive', () => {
    expect(disclosure()).toMatch(/No affiliate links are active/)
    expect(disclosure()).not.toMatch(/Amazon Associate/)
  })
})
