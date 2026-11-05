import casesData from '../data/parts/cases-catalogue.json'
import nvmeData from '../data/parts/nvme-catalogue.json'
import ramData from '../data/parts/ram-catalogue.json'
import type { Board } from './types'

type Part = { id: string; name: string; price: number | null; price_basis: string | null; checked_on: string; source_url: string }
type Drive = Part & { capacity_tb: number }
type Kit = Part & { type: string; capacity_gb: number; modules: number }
type Case = Part & { open_frame: boolean }

export type Item = { label: string; low: number; high: number; basis: string; name: string; checked_on: string; source_url: string; qty: number }
export type Rest = { items: Item[]; unpriced: string[]; low: number; high: number }

const priced = <T extends Part>(xs: T[]) => xs.filter((x) => (x.price ?? 0) > 0).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
const DRIVES = priced((nvmeData as unknown as Drive[]).filter((d) => d.capacity_tb === 2))
const KITS = priced((ramData as unknown as Kit[]).filter((k) => k.type === 'DDR4' && k.capacity_gb === 64 && k.modules === 2))
const CASES = priced(casesData as unknown as Case[])
// Market asking prices come first; a maker list price is used only when nothing else is priced, because the market is above it right now.
const cheapest = <T extends Part>(xs: T[]) => xs.filter((x) => x.price_basis !== 'msrp')[0] ?? xs[0]
const basisOf = (p: Part) => (p.price_basis === 'msrp' ? 'maker list price' : 'asking price')
const item = (label: string, p: Part, qty: number): Item => ({ label, name: p.name, low: (p.price as number) * qty, high: (p.price as number) * qty, basis: basisOf(p), checked_on: p.checked_on, source_url: p.source_url, qty })

/**
 * The parts the card picker does not model, priced from the site's own catalogues: the cheapest 2 TB drive for each drive wanted, and, when starting from scratch,
 * the board (if it has a price), a 64 GB two-stick DDR4 kit (DDR4 boards only) and the cheapest case that suits the frame. The CPU is never priced because the
 * catalogue has too few; anything missing is listed in `unpriced` so the total never pretends to be complete.
 */
export function restOfBox(o: { scratch: boolean; board: Board; nvme: number; openFrame: boolean }): Rest {
  const items: Item[] = []
  const unpriced: string[] = []
  const d = cheapest(DRIVES)
  if (o.nvme > 0) { if (d) items.push(item('2 TB NVMe drive', d, o.nvme)); else unpriced.push('2 TB NVMe drive') }
  if (o.scratch) {
    if (o.board.price_low) items.push({ label: 'Board', name: o.board.name, low: o.board.price_low, high: o.board.price_high ?? o.board.price_low, basis: 'used asking price', checked_on: o.board.checked_on, source_url: o.board.source_url, qty: 1 })
    else unpriced.push('board')
    const k = cheapest(KITS)
    if (o.board.ram_type === 'DDR4' && k) items.push(item('64 GB DDR4 (2 sticks)', k, 1)); else unpriced.push(o.board.ram_type === 'DDR4' ? '64 GB DDR4' : 'DDR5 memory')
    const c = cheapest(CASES.filter((x) => x.open_frame === o.openFrame))
    if (c) items.push(item(o.openFrame ? 'Open-frame case' : 'Case', c, 1)); else unpriced.push('case')
    unpriced.push('CPU')
  }
  return { items, unpriced, low: items.reduce((s, i) => s + i.low, 0), high: items.reduce((s, i) => s + i.high, 0) }
}
