import { useState, type ReactNode } from 'react'
import type { Flag } from '../lib/flags'
import type { Rest } from '../lib/restOfBox'
import type { Finding, Gpu } from '../lib/types'
import type { Totals } from '../lib/compat'
import { Icon } from './Visual'

const label = 'mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted'
const tone = { error: 'text-err', warn: 'text-warn', info: 'text-info' } as const
const DOT = { ok: 'bg-ok', warn: 'bg-warn', err: 'bg-err' } as const

export type SummaryProps = {
  t: Totals; spend: Totals; newVram: number; ownedVram: number; flags: Flag[]; findings: Finding[]
  placements: { gpu: Gpu; where: string; lanes: number }[]
  rng: (l: number, h: number) => string; money: (n: number) => string; currency: string; usd: (l: number, h: number) => string
  fullBuild: boolean; rest: Rest; children?: ReactNode
}

/** The build summary: memory split into new and owned, cost, four compatibility flags, then the tools, placement and the full Checks list. */
export function Summary(p: SummaryProps) {
  const errors = p.findings.filter((f) => f.severity === 'error').length
  const total = p.fullBuild ? { low: p.spend.priceLow + p.rest.low, high: p.spend.priceHigh + p.rest.high } : { low: p.spend.priceLow, high: p.spend.priceHigh }
  return (
    <div className="space-y-4">
      <div className="rounded border border-accent bg-panel p-4">
        <div className="font-mono text-3xl font-bold text-accent">{p.t.vram} GB</div>
        <div className="text-sm text-muted">
          total VRAM · {p.t.cards} card(s){p.ownedVram > 0 && <span className="block text-xs text-subtle">{p.newVram} GB new + {p.ownedVram} GB you own</span>}
        </div>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-2"><dt>{p.fullBuild ? 'Full build' : 'You would buy'}</dt><dd className="text-right">{p.rng(total.low, total.high)}{p.currency !== 'USD' && <span className="block text-xs text-subtle">{p.usd(total.low, total.high)} USD</span>}</dd></div>
          {p.fullBuild && (
            <>
              <div className="flex justify-between gap-2 text-xs text-subtle"><dt>of which cards, adapters, PSU</dt><dd>{p.rng(p.spend.priceLow, p.spend.priceHigh)}</dd></div>
              {p.rest.items.map((i) => (
                <div key={i.label} className="flex justify-between gap-2 text-xs text-subtle"><dt>{i.qty > 1 ? `${i.qty} x ` : ''}{i.label}</dt><dd className="text-right">{p.money(i.low)}<span className="block"><a className="text-link underline" href={i.source_url}>{i.basis}, {i.checked_on}</a></span></dd></div>
              ))}
              {p.rest.unpriced.length > 0 && <div className="flex justify-between gap-2 text-xs text-warn"><dt>Not priced</dt><dd className="text-right">{p.rest.unpriced.join(', ')}</dd></div>}
            </>
          )}
          <div className="flex justify-between gap-2"><dt>Est. draw</dt><dd>{p.t.watts} W</dd></div>
        </dl>
        <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm" aria-label="Compatibility flags">
          {p.flags.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[f.level]}`} />{f.label}</span><span className={`text-right text-xs ${f.level === 'err' ? 'text-err' : f.level === 'warn' ? 'text-warn' : 'text-subtle'}`}><span className="sr-only">{f.level === 'ok' ? 'ok: ' : f.level === 'warn' ? 'warning: ' : 'problem: '}</span>{f.detail}</span></li>
          ))}
        </ul>
        {errors > 0 && <p className="mt-2 text-xs text-err">{errors} problem(s) to fix. See Checks below.</p>}
      </div>
      {p.children}
      <div className="rounded border border-line bg-panel p-4">
        <h2 className={label}>Placement</h2>
        <ol className="space-y-1 text-sm">
          {p.placements.map((x, i) => <li key={i}>{x.gpu.name.replace(/\(.*?\)/g, '').replace(/^(NVIDIA|AMD) /, '').trim()} → {x.where}{x.lanes ? ` (x${x.lanes})` : ''}</li>)}
          {!p.placements.length && <li className="text-subtle">No cards yet.</li>}
        </ol>
      </div>
      <div className="rounded border border-line bg-panel p-4">
        <h2 className={label}>Checks</h2>
        <ul className="space-y-2 text-sm">
          {p.findings.map((f, i) => <li key={i} className={`flex gap-2 ${tone[f.severity]}`}><Icon name={f.severity === 'info' ? 'mdi-information-outline' : 'mdi-alert-circle-outline'} size={18} className="mt-0.5" /><span><span className="font-mono text-xs font-semibold uppercase">{f.severity}</span> {f.message}</span></li>)}
          {!p.findings.length && <li className="text-subtle">Add cards to see checks.</li>}
        </ul>
      </div>
    </div>
  )
}

/** On phones the summary collapses into a bar fixed to the bottom of the screen that opens into a sheet. */
export function MobileBar({ vram, newVram, ownedVram, rng, low, high, problems, warnings, children }: { vram: number; newVram: number; ownedVram: number; rng: (l: number, h: number) => string; low: number; high: number; problems: number; warnings: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="md:hidden">
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto rounded-t-2xl border-t border-line bg-bg p-4 shadow-2xl" role="dialog" aria-label="Build summary">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-mono text-lg text-accent">Your build</h2><button className="rounded border border-line bg-panel px-3 py-1 text-sm" onClick={() => setOpen(false)}>Close</button></div>
          {children}
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-panel px-4 py-3 text-left shadow-[0_-4px_14px_rgba(0,0,0,.12)]">
        <span className="min-w-0"><span className="font-mono text-lg font-bold text-accent">{vram} GB</span><span className="block text-[11px] leading-tight text-subtle">{ownedVram > 0 ? `${newVram} new + ${ownedVram} owned` : 'total'}</span></span>
        <span className="whitespace-nowrap font-mono text-sm">{rng(low, high)}</span>
        <span className={`whitespace-nowrap rounded-full border px-2 text-xs ${problems ? 'border-err text-err' : warnings ? 'border-warn text-warn' : 'border-ok text-ok'}`}>{problems ? `${problems} problem${problems > 1 ? 's' : ''}` : warnings ? `${warnings} warning${warnings > 1 ? 's' : ''}` : 'ok'} {open ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
