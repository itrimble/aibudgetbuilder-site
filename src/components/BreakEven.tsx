import rental from '../data/builds/rental.json'
import { breakEven } from '../lib/breakeven'

const label = 'mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted'

/** Cloud versus local, in hours of renting: one provider's dated on-demand price, with the caveats that matter. */
export function BreakEven({ vramGb, low, high, money }: { vramGb: number; low: number; high: number; money: (n: number) => string }) {
  const r = breakEven(vramGb, low, high)
  if (!r) return null
  const h = (n: number) => Math.round(n).toLocaleString('en-US')
  return (
    <div className="rounded border border-line bg-panel p-4 text-sm">
      <h2 className={label}>Rent instead?</h2>
      <p>
        Renting {r.units > 1 ? `${r.units} x ` : ''}one {r.tier.vram_gb} GB {r.tier.gpu} costs about ${(r.tier.usd_per_hour * r.units).toFixed(2)} an hour (US dollars). What you would buy ({money(low)}{high !== low ? `–${money(high)}` : ''}) equals about {h(r.hoursLow)}{r.hoursHigh !== r.hoursLow ? `–${h(r.hoursHigh)}` : ''} hours of renting.
      </p>
      <p className="mt-1 text-xs text-subtle">
        <a className="text-link underline" href={rental.source.url}>{rental.source.label}</a>, {rental.billing} price read {rental.source.date}. {rental.caveats.join(' ')}
      </p>
    </div>
  )
}
