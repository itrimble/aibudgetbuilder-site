import data from '../data/builds/alt-hardware.json'
import { MAINS_120V_LIMIT_W } from '../lib/compat'
import { MoreHardware } from './MoreHardware'

type Src = { label: string; url: string }
type Opt = {
  id: string; name: string; units: number; gb_per_unit: number; unit_price_usd?: number; unit_price_usd_low?: number; unit_price_usd_high?: number
  unit_price_note: string; price_source: string; price_checked_on: string; watts_each_low: number | null; watts_each_high: number | null; watts_rated_max?: number
  price_kind: string; network: string; verdict: string; catches: string[]; sources: Src[]
}
const OPTS = data.options as unknown as Opt[]
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const total = (o: Opt) => (o.unit_price_usd != null ? usd(o.unit_price_usd * o.units) : `${usd((o.unit_price_usd_low ?? 0) * o.units)}–${usd((o.unit_price_usd_high ?? 0) * o.units)}`)
const power = (o: Opt) => {
  if (o.watts_each_low == null || o.watts_each_high == null) return 'not measured'
  const lo = o.watts_each_low * o.units, hi = o.watts_each_high * o.units
  const over = o.watts_rated_max && o.watts_rated_max * o.units > MAINS_120V_LIMIT_W
  return `${lo}–${hi} W measured (by the guide's author)${over ? `; ${o.watts_rated_max! * o.units} W at the rated maximum, over the ${MAINS_120V_LIMIT_W} W a 120 V outlet can carry` : ''}`
}

/** PS5 consoles, the BC-250 board and a 128 GB mini PC as alternatives to a card-based build. Every figure carries its source and date; only the RX 6600 XT line was run by us. */
export function OtherHardware() {
  const b = data.bc250_benchmarks
  return (
    <div className="space-y-8">
      <section aria-label="About this page" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-lg text-accent">Consoles, Macs and other hardware</h2>
        <p>
          Could a shelf of used PS5s, a stack of Mac minis, a Raspberry Pi with a big GPU or a modified card reach 128 GB cheaply? The first three sections cover the PS5 idea and its bare-board cousin; the rest cover Macs, small boxes and odd hardware. On paper yes: 8 x 16 GB. In practice the plan runs
          into locked firmware, gigabit network links and memory that is not one pool. <strong className="text-fg">We have not built or run any of this.</strong>{' '}
          Everything below is other people&apos;s work, read and dated, apart from one line we measured on our own card. Prices checked {data.checked_on}{' '}
          unless a row says otherwise.
        </p>
      </section>

      <section aria-label="Options side by side">
        <h2 className="mb-2 font-mono text-lg text-accent">Three ways to 128 GB, side by side</h2>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr><th className="py-1 pr-3">Option</th><th className="pr-3">Memory</th><th className="pr-3">Cost of the units</th><th className="pr-3">Power</th><th>Our read</th></tr>
            </thead>
            <tbody>
              {OPTS.map((o) => (
                <tr key={o.id} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{o.name}</td>
                  <td className="pr-3 font-mono">{o.units} x {o.gb_per_unit} GB{o.units > 1 ? ' (not one pool)' : ''}</td>
                  <td className="pr-3 font-mono">{total(o)}<div className="font-sans text-xs text-subtle">{o.price_kind}, checked {o.price_checked_on}</div></td>
                  <td className="pr-3 text-xs">{power(o)}</td>
                  <td className="font-semibold">{o.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-subtle">The cost column covers the units only. Boards also need power supplies, cooling, a frame and network ports; we have no priced total for that.</p>
      </section>

      {OPTS.map((o) => (
        <section key={o.id} aria-label={o.name} className="rounded border border-line bg-panel p-3">
          <h3 className="font-mono text-base text-accent">{o.name}</h3>
          <p className="mt-1 text-xs text-subtle">
            Price basis: {o.unit_price_note} <a className="text-link underline" href={o.price_source}>source</a> · network: {o.network}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {o.catches.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p className="mt-2 text-xs text-subtle">
            Read: {o.sources.map((s, i) => <span key={s.url}>{i > 0 && ' · '}<a className="text-link underline" href={s.url}>{s.label}</a></span>)}
          </p>
        </section>
      ))}

      <section aria-label="BC-250 benchmarks">
        <h2 className="mb-1 font-mono text-lg text-accent">What one BC-250 does, as its guide reports</h2>
        <p className="mb-2 text-xs text-subtle">
          From <a className="text-link underline" href={b.source_url}>akandr/bc250</a>, read {b.checked_on}. Generation speed in tokens per second. Median draw {b.median_watts['24cu']} W
          (24 compute units) and {b.median_watts['40cu']} W (40).
        </p>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Model</th><th className="pr-3 text-right">24-unit board</th><th className="text-right">40-unit board</th></tr></thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.model} className="border-t border-line">
                  <td className="py-1 pr-3">{r.model}</td>
                  <td className="pr-3 text-right font-mono">{r.tg_24cu}</td>
                  <td className="text-right font-mono">{r.tg_40cu ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-subtle">{b.caveat}</p>
        {data.our_measurements.map((m) => (
          <p key={m.what} className="mt-2 rounded border border-line p-2 text-xs text-muted">
            <strong className="text-fg">For scale, measured by us {m.measured_on}:</strong> {m.what}: {m.pp} tokens per second reading the prompt, {m.tg} generating. {m.note} Different board, model
            and software from the table above, so this is a loose comparison, not a ranking.
          </p>
        ))}
      </section>

      <MoreHardware />

      <section aria-label="What would change our mind" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-base text-accent">What we would do about the console idea</h2>
        <p>
          Not buy eight consoles. If you want to find out whether cheap clustered boards are worth it, buy one BC-250, measure it on the models you already run, then add a second
          board and measure what the split costs. One measured case of a model split across four or more boards staying above 20 tokens per second for coding would change our view.
        </p>
      </section>
    </div>
  )
}
