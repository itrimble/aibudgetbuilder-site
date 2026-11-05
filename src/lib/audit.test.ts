import { describe, expect, it } from 'vitest'
import { auditAll, summarise, tier, type AuditInput } from './audit'
import { liveAuditInput } from './auditData'
import ratesData from '../data/rates.json'
import linksData from '../data/models/links.json'

// The data refreshes itself daily, so the pinned date must never be earlier than the newest snapshot (a snapshot from "the future" is an audit error).
const PINNED = [ratesData.fetched_on, ratesData.published, linksData.checked_on, '2026-11-05'].sort().pop()!
const live = () => liveAuditInput(PINNED)
const ruleHits = (i: AuditInput, rule: string) => auditAll(i).filter((f) => f.rule === rule)

describe('methodology audit on the live data', () => {
  it('has no errors (warnings are allowed, and are listed in METHODOLOGY.md)', () => {
    const f = auditAll(live())
    const errors = f.filter((x) => x.severity === 'error')
    expect(errors, errors.map((e) => `${e.rule} ${e.id}: ${e.message}`).join('\n')).toEqual([])
    const s = summarise(f)
    console.log(`audit: ${s.errors} errors, ${s.warns} warnings, ${s.infos} info`)
  })

  it('flags prices once they go stale, and refuses them after 30 days', () => {
    expect(ruleHits({ ...live(), today: '2026-11-20' }, 'R04').length).toBeGreaterThan(0)
    expect(ruleHits({ ...live(), today: '2026-12-15' }, 'R05').length).toBeGreaterThan(0)
  })

  it('holds the drive prices shown on the page to the same freshness rules', () => {
    expect(ruleHits({ ...live(), today: '2026-12-15' }, 'R05').some((f) => f.id.startsWith('drive:'))).toBe(true)
    expect(ruleHits({ ...live(), today: '2026-11-04' }, 'R05').some((f) => f.id.startsWith('drive:'))).toBe(false)
  })
})

describe('each logic check actually fires on bad data', () => {
  it('R01/R03: missing source, inverted price', () => {
    const i = live(); i.gpus = [{ ...i.gpus[0], source_url: '', price_low: 500, price_high: 100 }]
    expect(ruleHits(i, 'R01').length).toBe(1)
    expect(ruleHits(i, 'R03').length).toBe(1)
  })
  it('R02: future date', () => {
    const i = live(); i.gpus = [{ ...i.gpus[0], checked_on: '2030-01-01' }]
    expect(ruleHits(i, 'R02').length).toBe(1)
  })
  it('R06: card name disagrees with vram_gb', () => {
    const i = live(); i.gpus = [{ ...i.gpus[0], name: 'Tesla P40 48GB', vram_gb: 24 }]
    expect(ruleHits(i, 'R06').length).toBe(1)
  })
  it('R07: impossible spec', () => {
    const i = live(); i.gpus = [{ ...i.gpus[0], tdp_w: 0 }]
    expect(ruleHits(i, 'R07').length).toBe(1)
    for (const w of [1, 2, 2.5, 3]) expect(ruleHits({ ...live(), gpus: [{ ...live().gpus[0], slot_width: w }] }, 'R07').length).toBe(0)
    for (const w of [0, 0.5, 2.3, 4.5, -2]) expect(ruleHits({ ...live(), gpus: [{ ...live().gpus[0], slot_width: w }] }, 'R07').length).toBe(1)
  })
  it('R10: preset points at a card that does not exist', () => {
    const i = live(); i.presets = [{ name: 'x (24 GB)', counts: { nope: 1 }, adapters: [], psu: 'corsair-rm1000x-shift' }]
    expect(ruleHits(i, 'R10').length).toBeGreaterThan(0)
  })
  it('R11: preset name claims memory its cards do not add up to', () => {
    const i = live(); i.presets = [{ name: '4x V100 (999 GB)', counts: { 'v100-32-sxm2': 4 }, adapters: [], psu: 'corsair-rm1000x-shift' }]
    expect(ruleHits(i, 'R11').length).toBe(1)
  })
  it('R12 uses the stated quantisation when there is one', () => {
    const base = { params_b: 100, vram_basis: 'arithmetic', source_url: 'https://huggingface.co/x', checked_on: '2026-11-03' }
    const ok = live(); ok.tasks = [{ task: 't', models: [{ ...base, name: 'a', quant_suggested: 'Q4_K_M', vram_gb_estimate: 63 }] }]
    expect(ruleHits(ok, 'R12').length).toBe(0)
    const bad = live(); bad.tasks = [{ task: 't', models: [{ ...base, name: 'b', quant_suggested: 'Q4_K_M', vram_gb_estimate: 30 }] }]
    expect(ruleHits(bad, 'R12').length).toBe(1)
    const low = live(); low.tasks = [{ task: 't', models: [{ ...base, name: 'c', quant_suggested: '~2.4 bit mixed', vram_gb_estimate: 40 }] }]
    expect(ruleHits(low, 'R12').length).toBe(0)
  })
  it('R12/R13: model memory far from its parameter count, and unlabelled estimate', () => {
    const i = live(); i.tasks = [{ task: 't', models: [{ name: 'm', params_b: 70, vram_gb_estimate: 5, vram_basis: 'trust me', source_url: 'https://huggingface.co/x', checked_on: '2026-11-03' }] }]
    expect(ruleHits(i, 'R12').length).toBe(1)
    expect(ruleHits(i, 'R13').length).toBe(1)
  })
  it('R15/R16: unsourced zero speed, and prompt slower than generation', () => {
    const i = live(); i.benchmarks = { checked_on: '2026-11-03', rows: [{ gpu: 'g', model: 'm', tg128: 0 }, { gpu: 'g', model: 'n', tg128: 50, pp512: 10, source: 's' }] }
    expect(ruleHits(i, 'R01').length).toBe(1)
    expect(ruleHits(i, 'R15').length).toBe(1)
    expect(ruleHits(i, 'R16').length).toBe(1)
  })
  it('R22/R23/R24: rates must be complete, and go stale then unshippable', () => {
    const i = live(); i.rates = { ...i.rates, rates: { ...i.rates.rates, GBP: 0 } }
    expect(ruleHits(i, 'R22').length).toBe(1)
    const fixed = { ...live(), rates: { ...live().rates, published: '2026-11-03' } }
    expect(ruleHits({ ...fixed, today: '2026-11-12' }, 'R23').length).toBe(1)
    expect(ruleHits({ ...fixed, today: '2026-12-10' }, 'R24').length).toBe(1)
  })
  it('R25: budget tiers out of order or duplicated', () => {
    const i = live(); i.budgets = [{ id: 'a', name: 'A', usd: 1000 }, { id: 'b', name: 'B', usd: 500 }, { id: 'a', name: 'C', usd: 2000 }]
    expect(ruleHits(i, 'R25').length).toBe(2)
    const j = live(); j.budgets = [{ id: 'a', name: 'A', usd: 500, blurb: 'Reach 100+ GB with older cards.' }]
    expect(ruleHits(j, 'R25').length).toBe(1)
  })
  it('R26: unformattable or duplicate currency, and missing USD', () => {
    const i = live(); i.currencies = [{ code: 'EUR', locale: 'en-IE' }, { code: 'EUR', locale: 'en-IE' }, { code: 'XX', locale: 'en' }]
    expect(ruleHits(i, 'R26').length).toBeGreaterThanOrEqual(3)
  })
  it('R28: MoE active above total, wrong bytes, and an implausible quant size', () => {
    const base = { id: 'x', total_params_b: 100, active_params_b: 10, source_url: 'https://huggingface.co/x', checked_on: '2026-11-04', gguf: { quants: [{ quant: 'Q4_K_M', bytes: 60e9, gb: 60 }] } }
    expect(ruleHits({ ...live(), moe: [base] }, 'R28').length).toBe(0)
    expect(ruleHits({ ...live(), moe: [{ ...base, active_params_b: 120 }] }, 'R28').length).toBe(1)
    expect(ruleHits({ ...live(), moe: [{ ...base, gguf: { quants: [{ quant: 'Q4_K_M', bytes: 60e9, gb: 75 }] } }] }, 'R28').length).toBeGreaterThan(0)
    expect(ruleHits({ ...live(), moe: [{ ...base, gguf: { quants: [{ quant: 'Q4_K_M', bytes: 5e9, gb: 5 }] } }] }, 'R28').length).toBe(1)
  })
  it('R29: game model without a licence verdict, or VRAM with no quote', () => {
    const base = { id: 'g', licence: 'mit', commercial_use: 'yes', weights_gb: 3, source_url: 'https://huggingface.co/g', checked_on: '2026-11-04' }
    expect(ruleHits({ ...live(), gamedev: [base] }, 'R29').length).toBe(0)
    expect(ruleHits({ ...live(), gamedev: [{ ...base, commercial_use: undefined }] }, 'R29').length).toBe(1)
    expect(ruleHits({ ...live(), gamedev: [{ ...base, stated_vram_gb: 12 }] }, 'R29').length).toBe(1)
  })
  it('R30/R31: video claim without a timestamp, price without its note, and prices reported as historical', () => {
    const v = (live().videos as unknown as { videos: Record<string, unknown>[] }).videos[0]
    const withClaims = (claims: Record<string, unknown>[]) => ({ ...live(), videos: { videos: [{ ...v, claims }] } }) as unknown as AuditInput
    const ok = { kind: 'software', at: '00:01:02', text: 'x' }
    expect(ruleHits(withClaims([ok]), 'R30').length).toBe(0)
    expect(ruleHits(withClaims([{ ...ok, at: '1:02' }]), 'R30').length).toBe(1)
    expect(ruleHits(withClaims([{ kind: 'price', at: '00:01:02', text: 'x', gpu: 'g', price_usd: 300 }]), 'R30').length).toBe(1)
    expect(ruleHits(withClaims([{ kind: 'price', at: '00:01:02', text: 'x', gpu: 'g', price_usd: 300, price_note: 'n' }]), 'R31').length).toBe(1)
    expect(ruleHits({ ...live(), videos: { videos: [{ ...v, url: 'https://example.com/x' }] } } as unknown as AuditInput, 'R30').length).toBe(1)
  })
  it('R32: a preset whose power supply cannot carry its cards, or has too few connectors', () => {
    const i = live()
    const ok = { name: '1x P40 (24 GB)', counts: { 'tesla-p40': 1 }, adapters: [], psu: i.psus[0].id }
    expect(ruleHits({ ...i, presets: [ok] }, 'R32').length).toBe(0)
    expect(ruleHits({ ...i, presets: [{ ...ok, name: '9x P40 (216 GB)', counts: { 'tesla-p40': 9 } }] }, 'R32').length).toBeGreaterThan(0)
  })
  it('R32: counts the cards a sample PC already owns, so a preset that fits bare but not on that PC is flagged', () => {
    const i = live()
    const big = i.psus.find((x) => x.id === 'asrock-taichi-tc-1650t')!
    const preset = { name: '4x V620 (128 GB)', counts: { 'radeon-pro-v620': 4 }, adapters: [], psu: big.id }
    const bare = { ...i, presets: [preset], pcs: [] } as unknown as AuditInput
    expect(ruleHits(bare, 'R32').length).toBe(0)
    const owned = { ...i, presets: [preset], pcs: [{ name: 'Test PC', owned_gpus: ['rx-6600xt'] }] } as unknown as AuditInput
    expect(ruleHits(owned, 'R32').length).toBeGreaterThan(0)
  })
  it('R37/R38/R39: a note that contradicts its range, has a formatting slip, or speaks in first person', () => {
    const base = live()
    const withNote = (note: string, lo = 489, hi = 555) => ({ ...base, gpus: base.gpus.map((g, i) => (i === 0 ? { ...g, note, price_low: lo, price_high: hi } : g)) }) as AuditInput
    expect(ruleHits(withNote('Dealers list $1,500 and $1,750.'), 'R37').length).toBe(1)
    expect(ruleHits(withNote('Dealers list $1,500 and $1,750. Why the range and the dealer figures differ: they are new.'), 'R37').length).toBe(0)
    expect(ruleHits(withNote('Used asking $520.'), 'R37').length).toBe(0)
    expect(ruleHits(withNote('Its 12-month average is $138,.'), 'R38').length).toBe(1)
    expect(ruleHits(withNote('Lowest asking price (5,999), not an average.'), 'R38').length).toBe(1)
    expect(ruleHits(withNote("The low end is the tracker's 12-month average."), 'R38').length).toBe(1)
    expect(ruleHits(withNote('Price is my sum.'), 'R39').length).toBe(1)
    expect(ruleHits(withNote('Price is our sum.'), 'R39').length).toBe(0)
  })
  it('R40/R41: a bandwidth figure needs a source, a date and a basis, and weaker evidence is listed', () => {
    const base = live()
    const withBw = (bw: Record<string, unknown>) => ({ ...base, gpus: base.gpus.map((g, i) => (i === 0 ? { ...g, ...bw } : g)) }) as AuditInput
    const good = { bandwidth_gbs: 346, bandwidth_source_url: 'https://images.nvidia.com/x.pdf', bandwidth_checked_on: '2026-11-05', bandwidth_basis: 'maker page, read' }
    expect(ruleHits(withBw(good), 'R40').length).toBe(0)
    expect(ruleHits(withBw({ ...good, bandwidth_source_url: 'http://x' }), 'R40').length).toBe(1)
    expect(ruleHits(withBw({ ...good, bandwidth_gbs: 99999 }), 'R40').length).toBe(1)
    expect(ruleHits(withBw({ ...good, bandwidth_basis: undefined }), 'R40').length).toBe(1)
    expect(ruleHits(withBw({ ...good, bandwidth_basis: 'third-party page (not the maker)' }), 'R41').length).toBeGreaterThanOrEqual(1)
  })
  it('R34/R35/R36: untrusted model links, missing, moved or stale link checks, and torrents that are not the maker\'s', () => {
    const i = live()
    const link = (extra: object) => ({ checked_on: '2026-11-04', status: 'ok', ...extra })
    const repo = 'Qwen/Qwen3-Coder-Next'
    const base = { ...i, tasks: [{ task: 't', models: [{ name: 'x', source_url: `https://huggingface.co/${repo}`, checked_on: '2026-11-04' }] }], moe: [], gamedev: [], torrents: [], today: '2026-11-05' } as unknown as AuditInput
    const withLinks = (repos: object, checked_on = '2026-11-04') => ({ ...base, modelLinks: { checked_on, repos } }) as unknown as AuditInput
    expect(ruleHits(withLinks({ [repo]: link({}) }), 'R34').length).toBe(0)
    expect(ruleHits(withLinks({}), 'R34').length).toBe(1)
    const bad = { ...withLinks({ [repo]: link({}) }), tasks: [{ task: 't', models: [{ name: 'x', source_url: 'https://huggingface.co.evil.example/a/b', checked_on: '2026-11-04' }] }] } as unknown as AuditInput
    expect(ruleHits(bad, 'R34').length).toBeGreaterThan(0)
    expect(ruleHits(withLinks({ [repo]: link({ moved_to: 'a/b' }) }), 'R35').length).toBe(1)
    expect(ruleHits(withLinks({ [repo]: link({ status: 'not_found' }) }), 'R35').length).toBe(1)
    expect(ruleHits(withLinks({ [repo]: link({}) }, '2026-09-01'), 'R35').length).toBe(1)
    const t = { model: 'mixtral-8x7b', infohash: '5546272da9065eddeb6fcd7ffddeef5b75be79a7', magnet: 'magnet:?xt=urn:btih:5546272da9065eddeb6fcd7ffddeef5b75be79a7&dn=m', published_by: 'Mistral AI', published_at: 'https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1', checked_on: '2026-11-04' }
    const withT = (x: object) => ({ ...base, moe: [{ id: 'mixtral-8x7b' }], torrents: [{ ...t, ...x }] }) as unknown as AuditInput
    expect(ruleHits(withT({}), 'R36').length).toBe(0)
    expect(ruleHits(withT({ infohash: 'deadbeef' }), 'R36').length).toBeGreaterThan(0)
    expect(ruleHits(withT({ infohash: 'a'.repeat(40) }), 'R36').length).toBeGreaterThan(0)
    expect(ruleHits(withT({ published_by: '' }), 'R36').length).toBeGreaterThan(0)
    expect(ruleHits(withT({ published_at: 'https://torrents.example.com/x' }), 'R36').length).toBeGreaterThan(0)
    expect(ruleHits(withT({ model: 'not-listed' }), 'R36').length).toBeGreaterThan(0)
  })
  it('R33: a complete card left in the held-back file is flagged, an incomplete one is not', () => {
    const full = { id: 'x', vram_gb: 16, tdp_w: 200, slot_width: 2, connector_count: 1, cooling: 'active', price_low: 300, price_high: 350 }
    expect(ruleHits({ ...live(), heldGpus: [full] }, 'R33').length).toBe(1)
    expect(ruleHits({ ...live(), heldGpus: [{ ...full, price_low: null, price_high: null }] }, 'R33').length).toBe(0)
    expect(ruleHits({ ...live(), heldGpus: [{ ...full, cooling: null }] }, 'R33').length).toBe(0)
    expect(ruleHits(live(), 'R33').length).toBe(0)
  })
  it('R27: placeholder prices are published as warnings', () => {
    const i = live()
    const placeholders = [...i.adapters, ...i.psus].filter((r) => r.placeholder).length
    expect(ruleHits(i, 'R27').length).toBe(placeholders)
    expect(ruleHits({ ...i, psus: [...i.psus, { ...i.psus[0], id: 'fake', placeholder: true }] }, 'R27').length).toBe(placeholders + 1)
  })
  it('R21: a spec field left out of both lists, or listed twice', () => {
    const i = live(); i.gpus = [{ ...i.gpus[0], spec_verified: ['vram_gb'], spec_unverified: ['tdp_w', 'cooling'] }]
    expect(ruleHits(i, 'R21').length).toBe(1)
    const j = live(); j.gpus = [{ ...j.gpus[0], spec_verified: ['vram_gb', 'tdp_w'], spec_unverified: ['tdp_w', 'slot_width', 'connector_count', 'cooling'] }]
    expect(ruleHits(j, 'R21').length).toBe(1)
  })
  it('R08: a card with no maker source is flagged', () => {
    const i = live(); i.gpus = [{ ...i.gpus[0], spec_source_url: 'https://www.ebay.com/itm/1' }]
    expect(ruleHits(i, 'R08').length).toBe(1)
  })
  it('R18: image without a free licence', () => {
    const i = live(); i.images = { 'tesla-p40': { status: 'ok', license: 'All rights reserved', author: 'x', source: 'y' } }
    expect(ruleHits(i, 'R18').length).toBeGreaterThan(0)
  })
  it('R19: commission claimed with no affiliate ID, and the reverse', () => {
    expect(ruleHits({ ...live(), disclosureText: 'I may earn a commission.' }, 'R19').length).toBe(1)
    expect(ruleHits({ ...live(), affiliate: { ebay: { campid: '123' }, amazon: { tag: '' } }, disclosureText: 'No affiliate links.' }, 'R19').length).toBe(1)
  })
  it('source tiers', () => {
    expect(tier('https://www.msi.com/x')).toBe('A')
    expect(tier('https://blog.lon.tv/x')).toBe('B')
    expect(tier('https://www.ebay.com/itm/1')).toBe('C')
    expect(tier('https://www.reddit.com/r/x')).toBe('D')
    expect(tier('not a url')).toBe('unknown')
  })
})
