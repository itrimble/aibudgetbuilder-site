import { describe, expect, it } from 'vitest'
import { MAGNET_RE, ageDays, cautions, hostOk, repoFromUrl } from './modelLinks'

describe('model links', () => {
  it('reads the repo out of a Hugging Face URL and nothing else', () => {
    expect(repoFromUrl('https://huggingface.co/Qwen/Qwen3-Coder-Next')).toBe('Qwen/Qwen3-Coder-Next')
    expect(repoFromUrl('https://huggingface.co/Qwen/Qwen3-Coder-Next/tree/main')).toBe('Qwen/Qwen3-Coder-Next')
    expect(repoFromUrl('https://example.com/Qwen/Qwen3-Coder-Next')).toBeNull()
    expect(repoFromUrl(undefined)).toBeNull()
  })
  it('accepts trusted hosts and subdomains, and rejects look-alikes', () => {
    expect(hostOk('https://huggingface.co/a/b')).toBe(true)
    expect(hostOk('https://www.modelscope.cn/models/x')).toBe(true)
    expect(hostOk('https://huggingface.co.evil.example/a/b')).toBe(false)
    expect(hostOk('https://evilhuggingface.co/a/b')).toBe(false)
    expect(hostOk('not a url')).toBe(false)
  })
  it('turns a repo check into plain cautions', () => {
    expect(cautions({ checked_on: '2026-11-04', status: 'ok', gated: false, safetensors: true })).toEqual([])
    expect(cautions({ checked_on: '2026-11-04', status: 'ok', gated: 'manual' }).join(' ')).toMatch(/accept the maker/)
    expect(cautions({ checked_on: '2026-11-04', status: 'ok', pickle_only: true }).join(' ')).toMatch(/pickle/)
    expect(cautions({ checked_on: '2026-11-04', status: 'ok', moved_to: 'a/b' }).join(' ')).toMatch(/moved to a\/b/)
    expect(cautions({ checked_on: '2026-11-04', status: 'not_found' }).join(' ')).toMatch(/no longer finds/)
    expect(cautions(undefined).join(' ')).toMatch(/No link check/)
  })
  it('validates magnet links strictly and counts link age in days', () => {
    expect(MAGNET_RE.test('magnet:?xt=urn:btih:5546272da9065eddeb6fcd7ffddeef5b75be79a7&dn=mixtral-8x7b-32kseqlen')).toBe(true)
    expect(MAGNET_RE.test('magnet:?xt=urn:btih:xyz')).toBe(false)
    expect(MAGNET_RE.test('https://example.com/file.torrent')).toBe(false)
    expect(ageDays('2026-10-01', new Date('2026-11-04T00:00:00Z'))).toBe(34)
    expect(ageDays('nonsense')).toBe(Infinity)
  })
})
