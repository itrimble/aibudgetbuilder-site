import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JavaScript module with no type declarations
import { classify, collectUrls, skipped } from '../../scripts/check-links.mjs'

describe('link check helpers', () => {
  it('finds https links and trims trailing punctuation', () => {
    expect(collectUrls('See https://example.com/a. And "https://example.org/b?x=1", done')).toEqual(['https://example.com/a', 'https://example.org/b?x=1'])
  })
  it('keeps brackets that belong to the link and drops ones that do not', () => {
    expect(collectUrls('x https://commons.wikimedia.org/wiki/File:A_(1).jpg y')).toEqual(['https://commons.wikimedia.org/wiki/File:A_(1).jpg'])
    expect(collectUrls('(see https://example.com/a)')).toEqual(['https://example.com/a'])
  })
  it('skips hosts that block scripts and Hugging Face', () => {
    expect(skipped('https://www.ebay.com/itm/1')).toBe(true)
    expect(skipped('https://huggingface.co/a/b')).toBe(true)
    expect(skipped('https://www.nvidia.com/x')).toBe(false)
  })
  it('classifies statuses', () => {
    expect(classify(200).kind).toBe('ok')
    expect(classify(301, 'https://new').kind).toBe('moved')
    expect(classify(302, 'https://new').kind).toBe('ok')
    expect(classify(404).kind).toBe('dead')
    expect(classify(403).kind).toBe('blocked')
    expect(classify(500).kind).toBe('error')
  })
})
