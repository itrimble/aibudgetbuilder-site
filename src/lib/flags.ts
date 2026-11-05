import type { Finding, Gpu } from './types'

export type Level = 'ok' | 'warn' | 'err'
export type Flag = { id: 'slots' | 'power' | 'cooling' | 'software'; label: string; level: Level; detail: string }

const has = (f: Finding[], code: string, sev?: Finding['severity']) => f.some((x) => x.code === code && (!sev || x.severity === sev))

/** Four at-a-glance flags derived from the compatibility findings, so the summary never disagrees with the Checks list. */
export function compatFlags(findings: Finding[], cards: Gpu[]): Flag[] {
  if (cards.length === 0) {
    return (['slots', 'power', 'cooling', 'software'] as const).map((id) => ({ id, label: LABEL[id], level: 'ok' as Level, detail: 'add a card to check' }))
  }
  const slots: Flag =
    has(findings, 'no-slot') || has(findings, 'no-room') || has(findings, 'm2-conflict')
      ? { id: 'slots', label: LABEL.slots, level: 'err', detail: 'a card has no place to go' }
      : has(findings, 'x1-link')
        ? { id: 'slots', label: LABEL.slots, level: 'warn', detail: `${findings.filter((f) => f.code === 'x1-link').length} card(s) on x1: slow to load` }
        : { id: 'slots', label: LABEL.slots, level: 'ok', detail: `${cards.length} card(s) placed` }

  const power: Flag =
    has(findings, 'psu-watts', 'error') || has(findings, 'psu-connectors', 'error')
      ? { id: 'power', label: LABEL.power, level: 'err', detail: 'the power supply is too small' }
      : has(findings, 'mains-120v')
        ? { id: 'power', label: LABEL.power, level: 'warn', detail: 'more than a 120 V outlet can carry' }
        : { id: 'power', label: LABEL.power, level: 'ok', detail: 'the supply can carry it' }

  const passive = cards.filter((c) => c.cooling === 'passive').length
  const cooling: Flag = has(findings, 'passive-no-airflow')
    ? { id: 'cooling', label: LABEL.cooling, level: 'err', detail: 'passive cards need airflow' }
    : passive > 0
      ? { id: 'cooling', label: LABEL.cooling, level: 'warn', detail: `${passive} passive card(s) need forced airflow` }
      : { id: 'cooling', label: LABEL.cooling, level: 'ok', detail: 'cards have their own fans' }

  const soft: string[] = []
  if (has(findings, 'mixed-vendor')) soft.push('mixed vendors: Vulkan only')
  if (has(findings, 'no-rocm')) soft.push('a card without ROCm')
  if (has(findings, 'old-arch')) soft.push('an old architecture')
  const software: Flag = soft.length
    ? { id: 'software', label: LABEL.software, level: 'warn', detail: soft.join(', ') }
    : { id: 'software', label: LABEL.software, level: 'ok', detail: 'no known software gaps' }

  return [slots, power, cooling, software]
}

const LABEL = { slots: 'Slots and lanes', power: 'Power', cooling: 'Cooling', software: 'Software' } as const
