import gpusHeld from '../data/parts/gpus-incomplete.json'
import boardsHeld from '../data/parts/boards-incomplete.json'
import psuHeld from '../data/parts/psu-incomplete.json'

type Held = {
  id: string; name: string; vram_gb?: number | null; tdp_w?: number | null; watts?: number | null; ram_slots?: number | null
  price?: number | null; price_low?: number | null; price_high?: number | null; checked_on?: string | null
  spec_unverified?: string[]; spec_source_url?: string; source_url?: string | null
}

const GPU_REQ: [string, string][] = [['vram_gb', 'memory'], ['tdp_w', 'power'], ['slot_width', 'slot width'], ['connector_count', 'power connectors'], ['cooling', 'cooling']]
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

function facts(h: Held, kind: 'GPU' | 'Board' | 'PSU'): string {
  const bits: string[] = []
  if (kind === 'GPU' && h.vram_gb) bits.push(`${h.vram_gb} GB`)
  if (kind === 'GPU' && h.tdp_w) bits.push(`${h.tdp_w} W`)
  if (kind === 'PSU' && h.watts) bits.push(`${h.watts} W`)
  if (kind === 'Board' && h.ram_slots) bits.push(`${h.ram_slots} DIMM slots`)
  const lo = h.price_low ?? h.price, hi = h.price_high ?? h.price
  if (lo) bits.push(`${lo === hi || !hi ? usd(lo) : `${usd(lo)}–${usd(hi)}`} asking, checked ${h.checked_on}`)
  return bits.join(' · ')
}

const LABEL: Record<string, string> = { vram_gb: 'memory', tdp_w: 'power', slot_width: 'slot width', connector_count: 'power connectors', power_connectors: 'power connectors', watts: 'power rating', pcie_8pin: 'PCIe connector count', has_12vhpwr: '12VHPWR connector', eps_8pin: 'CPU connectors', atx_version: 'ATX version', efficiency: 'efficiency rating', rails: 'rail layout', warranty_years: 'warranty' }

function missing(h: Held, kind: 'GPU' | 'Board' | 'PSU'): string {
  const m = new Set<string>()
  if (kind === 'GPU') for (const [k, label] of GPU_REQ) if ((h as Record<string, unknown>)[k] == null || (h as Record<string, unknown>)[k] === '') m.add(label)
  for (const u of h.spec_unverified ?? []) {
    const base = u.replace(/\s*\(.*$/, '').trim()
    if (base === 'price' || (kind === 'GPU' && base === 'arch')) continue // nothing on the page depends on it
    m.add(LABEL[base] ?? base)
  }
  if (!(h.price_low ?? h.price)) m.add('a US price')
  return [...m].join(', ')
}

/** Everything researched but not yet selectable, with what is missing for each. A part leaves this list only when every field the compatibility checks need is read from the maker and it has a dated price. */
export function HeldBack() {
  const groups: [string, 'GPU' | 'Board' | 'PSU', Held[]][] = [['Cards', 'GPU', gpusHeld as Held[]], ['Boards', 'Board', boardsHeld as Held[]], ['Power supplies', 'PSU', psuHeld as Held[]]]
  const total = groups.reduce((n, g) => n + g[2].length, 0)
  return (
    <details className="rounded border border-line bg-panel p-4">
      <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wide text-muted">Researched, not selectable yet ({total} parts)</summary>
      <p className="mt-2 text-xs text-muted">These are listed so nothing is hidden. Each is missing something the compatibility checks need, or a price I could read, and the line under it says what. They stay out of the builder, and out of every total, until that is filled in from the maker.</p>
      {groups.map(([title, kind, items]) => (
        <div key={title} className="mt-3">
          <h3 className="mb-1 text-sm font-semibold">{title} ({items.length})</h3>
          <ul className="space-y-1 text-xs">
            {items.map((h) => (
              <li key={h.id} className="rounded border border-line p-2">
                <span className="font-medium">{h.name}</span>{facts(h, kind) && <span className="text-subtle"> · {facts(h, kind)}</span>}
                <span className="block text-subtle">Missing: {missing(h, kind) || 'nothing the checks need; waiting to be moved'}.{h.spec_source_url && <> <a className="text-link underline" href={h.spec_source_url}>maker source</a></>}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  )
}
