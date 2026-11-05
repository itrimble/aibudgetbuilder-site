import budgets from '../data/builds/budgets.json'
import { checkBuild, PSU_HEADROOM, SYSTEM_BASE_W, totals } from './compat'
import type { Adapter, Board, Build, Finding, Gpu, Psu } from './types'

// Budget logic. A budget covers only what the site prices: cards, adapters and risers, and a PSU if the one you have cannot carry the build.
// It does NOT cover board, CPU, RAM, storage or case, and the UI says so beside every result. Options are filtered on the TOP of each
// price range, so a result stays inside the budget even if you pay the highest asking price.

export type Tier = { id: string; name: string; usd: number; blurb: string }
export const TIERS = budgets as Tier[]

export type Option = {
  gpu: Gpu; n: number; vram: number
  costLow: number; costHigh: number; perGbLow: number; perGbHigh: number
  m2Adapters: Adapter[]; risers: number; psu: Psu; buyPsu: boolean
  needs: string[]; findings: Finding[]; placeholders: string[]
}

export type RecommendInput = {
  board: Board; owned: Gpu[]; gpus: Gpu[]; adapters: Adapter[]; psus: Psu[]
  budgetUsd: number; nvme?: number; maxCards?: number
}

function plan(i: RecommendInput, g: Gpu, n: number): Option | null {
  const nvme = i.nvme ?? 1
  const cards = [...i.owned, ...Array(n).fill(g)] as Gpu[]
  const real = i.board.gpu_slots.filter((s) => s.lanes >= 4).length
  const x1 = i.board.gpu_slots.filter((s) => s.lanes < 4).length
  const extra = Math.max(0, cards.length - real)
  const m2Free = Math.max(0, i.board.m2_slots.length - nvme)
  const m2Adapter = i.adapters.filter((a) => a.kind === 'm2-to-pcie').sort((a, b) => a.price - b.price)[0]
  const riser = i.adapters.filter((a) => a.kind === 'riser').sort((a, b) => a.price - b.price)[0]
  const useM2 = m2Adapter ? Math.min(extra, m2Free) : 0
  const useRiser = Math.min(extra - useM2, x1)
  if (extra - useM2 - useRiser > 0) return null // not enough places to put the cards
  if (useRiser > 0 && !riser) return null
  const m2Adapters = Array(useM2).fill(m2Adapter) as Adapter[]

  // cheapest PSU that clears the watts (with headroom) and the 8-pin count
  const watts = totals(cards, [], undefined).watts
  const connectors = cards.reduce((s, c) => s + c.connector_count, 0)
  const psu = [...i.psus].sort((a, b) => a.price - b.price || a.watts - b.watts).find((p) => watts * PSU_HEADROOM <= p.watts && connectors <= p.pcie_8pin)
  if (!psu) return null

  const build: Build = { boardId: i.board.id, gpuIds: cards.map((c) => c.id), adapterIds: [], psuId: psu.id, nvmeDrives: nvme, caseOpenFrame: true, airflowForPassive: true }
  const findings = checkBuild(build, i.board, cards, m2Adapters, psu)
  if (findings.some((f) => f.severity === 'error')) return null

  const adapterCost = m2Adapters.reduce((s, a) => s + a.price, 0) + useRiser * (riser?.price ?? 0)
  const costLow = n * g.price_low + adapterCost + psu.price
  const costHigh = n * g.price_high + adapterCost + psu.price
  const vram = cards.reduce((s, c) => s + c.vram_gb, 0)
  const bought = n * g.vram_gb
  const needs: string[] = []
  if (psu.price > 0) needs.push('a new PSU')
  if (cards.filter((c) => c.slot_width >= 2).length > 2) needs.push('an open frame')
  if (useM2) needs.push(`${useM2} M.2 adapter${useM2 > 1 ? 's' : ''}`)
  if (useRiser) needs.push(`${useRiser} x1 riser${useRiser > 1 ? 's' : ''}`)
  if (g.cooling === 'passive') needs.push('fan shroud or forced airflow')
  const placeholders = [psu.price > 0 && psu.placeholder ? 'PSU' : '', useM2 && m2Adapter?.placeholder ? 'M.2 adapters' : '', useRiser && riser?.placeholder ? 'risers' : ''].filter(Boolean)
  return { gpu: g, n, vram, costLow, costHigh, perGbLow: costLow / bought, perGbHigh: costHigh / bought, m2Adapters, risers: useRiser, psu, buyPsu: psu.price > 0, needs, findings, placeholders }
}

/** The best build per card model that stays inside the budget (top of the price range), most memory first, plus the cheapest buildable option for when nothing fits. */
export function recommend(i: RecommendInput): { options: Option[]; cheapest: Option | null } {
  const max = i.maxCards ?? 8
  const all: Option[] = []
  for (const g of i.gpus.filter((x) => !x.owned_only && x.price_high > 0))
    for (let n = 1; n <= max; n++) { const o = plan(i, g, n); if (o) all.push(o) }
  const within = all.filter((o) => o.costHigh <= i.budgetUsd)
  const bestPerCard = new Map<string, Option>()
  for (const o of within) { const b = bestPerCard.get(o.gpu.id); if (!b || o.vram > b.vram) bestPerCard.set(o.gpu.id, o) }
  const options = [...bestPerCard.values()].sort((a, b) => b.vram - a.vram || a.costLow - b.costLow)
  const cheapest = [...all].sort((a, b) => a.costLow - b.costLow)[0] ?? null
  return { options, cheapest }
}

export { SYSTEM_BASE_W }
