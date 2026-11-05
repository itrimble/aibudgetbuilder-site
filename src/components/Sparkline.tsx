import { priceSeries } from '../lib/priceHistory'

/** A small price-history line for a card, drawn only once there are at least three recorded days (anything shorter would be a decoration, not data). */
export function Sparkline({ id }: { id: string }) {
  const s = priceSeries(id)
  if (s.length < 3) return null
  const lo = Math.min(...s.map((p) => p.low)), hi = Math.max(...s.map((p) => p.low)), span = hi - lo || 1
  const pts = s.map((p, i) => `${(i / (s.length - 1)) * 118 + 1},${26 - ((p.low - lo) / span) * 24}`).join(' ')
  return (
    <p className="flex items-center gap-2">
      <svg role="img" aria-label={`Lowest asking price over ${s.length} days, from $${s[0].low} to $${s[s.length - 1].low}`} width="120" height="28" className="text-accent"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      <span>Lowest asking price, {s[0].date} to {s[s.length - 1].date}: ${s[0].low} to ${s[s.length - 1].low}.</span>
    </p>
  )
}
