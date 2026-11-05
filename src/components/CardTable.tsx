import { useMemo, useState } from 'react'
import type { Gpu } from '../lib/types'
import { cardVerdict } from '../lib/verdict'
import { osSupport } from '../lib/osSupport'
import { shopLink } from '../lib/affiliate'
import { Logo, PartImage } from './Visual'
import { Sparkline } from './Sparkline'

const SPEC_LABELS: Record<string, string> = { vram_gb: 'memory', tdp_w: 'power', slot_width: 'slot width', connector_count: 'power connectors', cooling: 'cooling' }
const specLabel = (f: string) => SPEC_LABELS[f] ?? f
const btn = 'rounded border border-line bg-panel px-3 py-1 text-sm hover:bg-panel2'

type Key = 'pergb' | 'vram' | 'price' | 'power' | 'name'
const perGb = (g: Gpu) => (g.price_low > 0 ? g.price_low / g.vram_gb : Infinity) // an owned card has no price, so it sorts last
const VALUE: Record<Key, (g: Gpu) => number | string> = { pergb: perGb, vram: (g) => g.vram_gb, price: (g) => (g.price_low > 0 ? g.price_low : Infinity), power: (g) => g.tdp_w, name: (g) => g.name.toLowerCase() }

function Stacks({ g }: { g: Gpu }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {([['cuda', 'CUDA'], ['rocm', 'ROCm'], ['vulkan', 'Vulkan']] as const).filter(([k]) => g.stacks[k]).map(([k, label]) => (
        <span key={k} className="rounded-full border border-ok px-1.5 text-[11px] text-ok">{label}</span>
      ))}
    </span>
  )
}

function Cooling({ g }: { g: Gpu }) {
  return <span className={`rounded-full border px-1.5 text-[11px] ${g.cooling === 'passive' ? 'border-warn text-warn' : 'border-ok text-ok'}`}>{g.cooling === 'passive' ? 'passive' : 'fan'}</span>
}

const OS_WORD: Record<string, string> = { works: 'works', 'works with caveat': 'works, with a caveat', 'not supported': 'not supported', 'not researched': 'not researched' }

/** Where the card runs on each system, from the Windows, Linux, Mac tab's checked table. */
function OsLine({ g }: { g: Gpu }) {
  const o = osSupport(g)
  const cell = (name: string, c: { status: string; backend: string | null }) => `${name}: ${OS_WORD[c.status] ?? c.status}${c.backend && c.status !== 'not supported' ? ` (${c.backend})` : ''}`
  return (
    <p>
      <strong className="text-fg">Runs on:</strong> {cell('Windows', o.windows)}; {cell('Linux', o.linux)}; {cell('macOS', o.macos)}. {o.extra}{' '}
      <span className="text-subtle">Details for each system are in the Windows, Linux, Mac guide.</span>
    </p>
  )
}

function Details({ g, usdNote, rng }: { g: Gpu; usdNote: (l: number, h: number) => string; rng: (l: number, h: number) => string }) {
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer text-link underline">Details, sources and where to look</summary>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <PartImage id={g.id} name={g.name} brand={g.brand} />
        <div className="min-w-[14rem] flex-1 space-y-1">
          <p className="text-subtle">{g.note}</p>
          <p>
            Specs checked against the maker{g.spec_checked_on ? ` on ${g.spec_checked_on}` : ''}: {(g.spec_verified ?? []).map(specLabel).join(', ') || 'none'}.
            {(g.spec_unverified ?? []).length > 0 && <> <strong>Not verified:</strong> {(g.spec_unverified ?? []).map(specLabel).join(', ')}.</>}
            {g.spec_source_url && <> <a className="text-link underline" href={g.spec_source_url}>maker source</a></>}
          </p>
          {g.price_high > 0 && <p>{rng(g.price_low / g.vram_gb, g.price_high / g.vram_gb)} per GB{usdNote(g.price_low, g.price_high)}</p>}
          {g.bandwidth_gbs && <p>Memory bandwidth {g.bandwidth_gbs} GB/s: {g.bandwidth_basis}{g.bandwidth_source_url && <> (<a className="text-link underline" href={g.bandwidth_source_url}>source</a>, checked {g.bandwidth_checked_on})</>}.</p>}
          <OsLine g={g} />
          <Sparkline id={g.id} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a className="text-link underline" href={g.source_url}>price source, checked {g.checked_on}</a>
            {(['ebay', 'amazon'] as const).map((m) => {
              const l = shopLink(m, g.name.replace(/\(.*?\)/g, '').trim(), g.id)
              return <a key={m} className="text-link underline" href={l.href} rel={l.rel} target="_blank">search {m === 'ebay' ? 'eBay' : 'Amazon'}</a>
            })}
          </div>
        </div>
      </div>
    </details>
  )
}

function Qty({ g, n, setCount }: { g: Gpu; n: number; setCount: (id: string, d: number) => void }) {
  return (
    <div className="flex items-center gap-2 font-mono">
      <button aria-label={`Remove one ${g.name}`} onClick={() => setCount(g.id, -1)} className={`${btn} h-8 w-8 px-0`}>−</button>
      <span aria-live="polite" className="w-6 text-center">{n}</span>
      <button aria-label={`Add one ${g.name}`} onClick={() => setCount(g.id, 1)} className="h-8 w-8 whitespace-nowrap rounded border border-accent bg-accent px-0 text-onaccent hover:opacity-90">+</button>
    </div>
  )
}

/** The card list as a sortable, filterable table on wide screens and as compact cards on phones. The long research note sits behind a Details drawer. */
export function CardTable({ cards, counts, setCount, rng, usdNote }: { cards: Gpu[]; counts: Record<string, number>; setCount: (id: string, d: number) => void; rng: (l: number, h: number) => string; usdNote: (l: number, h: number) => string }) {
  const [q, setQ] = useState('')
  const [maxPerGb, setMaxPerGb] = useState(0)
  const [fanOnly, setFanOnly] = useState(false)
  const [bigOnly, setBigOnly] = useState(false)
  const [key, setKey] = useState<Key>('pergb')
  const [asc, setAsc] = useState(true)
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = cards.filter((g) => (counts[g.id] ?? 0) > 0 || (
      (!needle || g.name.toLowerCase().includes(needle)) && (!maxPerGb || perGb(g) <= maxPerGb) && (!fanOnly || g.cooling === 'active') && (!bigOnly || g.vram_gb >= 24)))
    const v = VALUE[key]
    return list.sort((a, b) => { const x = v(a), y = v(b); const c = x < y ? -1 : x > y ? 1 : 0; return asc ? c : -c })
  }, [cards, counts, q, maxPerGb, fanOnly, bigOnly, key, asc])
  const head = (k: Key, text: string, extra = '') => (
    <th scope="col" aria-sort={key === k ? (asc ? 'ascending' : 'descending') : 'none'} className={`px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted ${extra}`}>
      <button className="uppercase" onClick={() => { if (key === k) setAsc(!asc); else { setKey(k); setAsc(true) } }}>{text}{key === k ? (asc ? ' ▲' : ' ▼') : ''}</button>
    </th>
  )
  const price = (g: Gpu) => (g.price_high ? <>{rng(g.price_low, g.price_high)}<span className="block font-sans text-[11px] text-subtle">checked {g.checked_on}</span></> : 'owned')
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards" aria-label="Search cards" className="rounded border border-line bg-panel p-1" />
        <select value={maxPerGb} onChange={(e) => setMaxPerGb(Number(e.target.value))} aria-label="Price per GB limit" className="rounded border border-line bg-panel p-1">
          <option value={0}>Any price per GB</option><option value={30}>Up to $30 per GB (lowest price)</option><option value={60}>Up to $60 per GB</option><option value={120}>Up to $120 per GB</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={fanOnly} onChange={(e) => setFanOnly(e.target.checked)} /> Fan-cooled only</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={bigOnly} onChange={(e) => setBigOnly(e.target.checked)} /> 24 GB or more</label>
        <span className="text-muted">Cards you have picked always stay in the list. Showing {shown.length} of {cards.length}.</span>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-line">
            {head('name', 'Card')}{head('vram', 'VRAM')}{head('pergb', '$/GB')}{head('power', 'Power')}
            <th scope="col" className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Cooling</th>
            <th scope="col" className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Software</th>
            {head('price', 'Price')}
            <th scope="col" className="px-2 py-1"><span className="sr-only">Quantity</span></th>
          </tr></thead>
          {shown.map((g) => (
            <tbody key={g.id} className="border-b border-line">
              <tr className="align-top">
                <td className="px-2 py-2"><div className="flex items-center gap-1 font-semibold"><Logo brand={g.brand} size={16} /> <span>{g.name}</span></div><div className="text-[11px] text-subtle">{g.arch ?? ''}</div></td>
                <td className="px-2 py-2 font-mono">{g.vram_gb} GB</td>
                <td className="px-2 py-2 font-mono">{g.price_high ? `$${(g.price_low / g.vram_gb).toFixed(0)}` : '–'}</td>
                <td className="px-2 py-2 font-mono">{g.tdp_w} W</td>
                <td className="px-2 py-2"><Cooling g={g} /></td>
                <td className="px-2 py-2"><Stacks g={g} /></td>
                <td className="px-2 py-2 font-mono text-xs">{price(g)}</td>
                <td className="px-2 py-2"><Qty g={g} n={counts[g.id] ?? 0} setCount={setCount} /></td>
              </tr>
              <tr><td colSpan={8} className="px-2 pb-1 text-xs text-muted"><span className="font-semibold text-fg">What to know:</span> {cardVerdict(g)}</td></tr>
              <tr><td colSpan={8} className="px-2 pb-2"><Details g={g} usdNote={usdNote} rng={rng} /></td></tr>
            </tbody>
          ))}
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {shown.map((g) => (
          <li key={g.id} className="rounded border border-line bg-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="flex items-center gap-1 font-semibold"><Logo brand={g.brand} size={16} /> <span className="min-w-0">{g.name}</span></div></div>
              <div className="shrink-0 text-right font-mono text-sm">{price(g)}</div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
              <span className="rounded-full bg-panel2 px-2">{g.vram_gb} GB</span>
              {g.price_high > 0 && <span className="rounded-full bg-panel2 px-2">${(g.price_low / g.vram_gb).toFixed(0)}/GB</span>}
              <span className="rounded-full bg-panel2 px-2">{g.tdp_w} W</span><Cooling g={g} /><Stacks g={g} />
            </div>
            <p className="mt-1 text-xs text-muted">{cardVerdict(g)}</p>
            <div className="mt-2 flex items-center justify-between gap-2"><Details g={g} usdNote={usdNote} rng={rng} /><Qty g={g} n={counts[g.id] ?? 0} setCount={setCount} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
