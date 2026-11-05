import { describe, expect, it } from 'vitest'
import gpuData from '../data/parts/gpus.json'
import { compatFlags } from './flags'
import type { Finding, Gpu } from './types'

const GPUS = gpuData as unknown as Gpu[]
const p40 = GPUS.find((g) => g.id === 'tesla-p40')!
const r3090 = GPUS.find((g) => g.id === 'rtx-3090')!
const f = (code: string, severity: Finding['severity'] = 'warn'): Finding => ({ code, severity, message: code })
const level = (fl: ReturnType<typeof compatFlags>, id: string) => fl.find((x) => x.id === id)!.level

describe('compatFlags', () => {
  it('is all ok, with a prompt, when there are no cards', () => {
    const fl = compatFlags([], [])
    expect(fl.every((x) => x.level === 'ok')).toBe(true)
    expect(fl[0].detail).toMatch(/add a card/)
  })
  it('turns red for a missing slot, a too-small supply and passive cards without airflow', () => {
    const fl = compatFlags([f('no-slot', 'error'), f('psu-watts', 'error'), f('passive-no-airflow', 'error')], [p40])
    expect(level(fl, 'slots')).toBe('err'); expect(level(fl, 'power')).toBe('err'); expect(level(fl, 'cooling')).toBe('err')
  })
  it('turns amber for x1 links, passive cards with airflow, mains limits and software gaps', () => {
    const fl = compatFlags([f('x1-link'), f('mains-120v'), f('old-arch'), f('mixed-vendor', 'info')], [p40, r3090])
    expect(level(fl, 'slots')).toBe('warn'); expect(level(fl, 'power')).toBe('warn'); expect(level(fl, 'cooling')).toBe('warn'); expect(level(fl, 'software')).toBe('warn')
  })
  it('stays green for a fan-cooled card with no findings', () => {
    expect(compatFlags([], [r3090]).every((x) => x.level === 'ok')).toBe(true)
  })
})
