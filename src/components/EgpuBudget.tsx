import data from '../data/builds/more-hardware.json'
import { EgpuExpanded } from './EgpuExpanded'

type Dock = { name: string; price_usd: number; psu_included: boolean; note: string }
type Card = { card: string; price_usd: number; sellers: string }
type Row = { model: string; card: string; backend: string; pp512: string | null; tg128: string; date: string; host: string }
type Build = { name: string; parts: string; total: number }
const E = data.egpu as unknown as {
  checked_on: string; intro: string; host_note: string; docks: Dock[]; psu: { name: string; price_amazon: number; price_maker: number }
  cards: Card[]; measured: Row[]; fit_note: string; takeaways: string[]; builds: Build[]; training: string; caveats: string[]
  source: { label: string; url: string; date: string; how_seen: string }
}
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** A budget external-GPU build (card, dock, power supply) taken from one published article, with its measurements and caveats. */
export function EgpuBudget() {
  return (
    <section aria-label="Budget eGPU">
      <h2 className="mb-1 font-mono text-lg text-accent">Budget eGPU: a card, a dock and a power supply</h2>
      <p className="mb-2 text-sm text-muted">{E.intro}</p>
      <p className="mb-3 rounded border border-line bg-panel p-2 text-xs text-muted"><strong className="text-fg">Read this first:</strong> {E.host_note}</p>

      <h3 className="mb-1 font-mono text-base text-accent">The three purchases</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="mb-1 text-left text-xs text-subtle">Docks, without a power supply unless noted</caption>
            <tbody>
              {E.docks.map((d) => (
                <tr key={d.name} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{d.name}<div className="text-xs text-subtle">{d.note}</div></td>
                  <td className="text-right font-mono">{usd(d.price_usd)}{d.psu_included ? ' (PSU in)' : ''}</td>
                </tr>
              ))}
              <tr className="border-t border-line"><td className="py-1 pr-3">{E.psu.name} power supply</td><td className="text-right font-mono">{usd(E.psu.price_amazon)} Amazon, {usd(E.psu.price_maker)} maker</td></tr>
            </tbody>
          </table>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="mb-1 text-left text-xs text-subtle">Cards tried, with Amazon price and sellers</caption>
            <tbody>
              {E.cards.map((c) => (
                <tr key={c.card} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{c.card}<div className="text-xs text-subtle">{c.sellers}</div></td>
                  <td className="text-right font-mono">{usd(c.price_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="mb-1 mt-4 font-mono text-base text-accent">What it costs in total</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <tbody>
            {E.builds.map((b) => (
              <tr key={b.name} className="border-t border-line align-top">
                <td className="py-1 pr-3">{b.name}<div className="text-xs text-subtle">{b.parts}</div></td>
                <td className="text-right font-mono">{usd(b.total)}</td>
                <td className="pl-3 text-xs text-subtle">{usd(1000 - b.total)} under $1,000</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-subtle">Parts only: the laptop or PC is not included, and the article assumes you already own it.</p>

      <h3 className="mb-1 mt-4 font-mono text-base text-accent">What the author measured</h3>
      <p className="mb-2 text-xs text-subtle">Prompt speed (pp512) is tokens per second reading the prompt; generation speed (tg128) is tokens per second writing. Three repetitions per row for the Vulkan tests.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Model</th><th className="pr-3">Card</th><th className="pr-3">Backend</th><th className="pr-3 text-right">Prompt</th><th className="pr-3 text-right">Generate</th><th>Host, date</th></tr></thead>
          <tbody>
            {E.measured.map((r, i) => (
              <tr key={`${r.model}${r.card}${r.backend}${i}`} className="border-t border-line align-top">
                <td className="py-1 pr-3">{r.model}</td><td className="pr-3">{r.card}</td><td className="pr-3 text-muted">{r.backend}</td>
                <td className="pr-3 text-right font-mono">{r.pp512 ?? '–'}</td><td className="pr-3 text-right font-mono">{r.tg128}</td>
                <td className="text-xs text-subtle">{r.host}, {r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{E.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
      <p className="mt-2 text-xs text-muted">{E.fit_note}</p>
      <p className="mt-1 text-xs text-muted">{E.training}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-subtle">{E.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      <p className="mt-2 text-xs text-subtle">Source: <a className="text-link underline" href={E.source.url}>{E.source.label}</a> ({E.source.how_seen}, {E.source.date}).</p>
      <EgpuExpanded />
    </section>
  )
}
