import data from '../data/builds/more-hardware.json'

type Src = { label: string; url: string | null; how_seen?: string | null; date?: string | null }
type Link = { name: string; bandwidth: string; notes: string; sources: Src[] }
type Dock = { name: string; price_usd: number | null; price_basis: string | null; link_type: string | null; needs_psu: string | null; notes: string | null; sources: Src[] }
type Meas = { card: string; host: string | null; result: string; author: string | null; source: Src }
type Multi = { what: string; result: string; caveats: string; source: Src }
type Cpg = { card: string; card_usd: number; egpu_total_usd: number; egpu_usd_per_gb: number; card_only_usd_per_gb: number; note?: string }
const X = data.egpu as unknown as {
  links: Link[]; more_docks: Dock[]; others_measured: Meas[]; multi: Multi[]; catches: string[]; not_found: string[]
  cost_per_gb: { note: string; rows: Cpg[] }; conflict: { title: string; text: string; sources: Src[] }; b60_note: string
  host_setup: { title: string; items: string[]; source: Src }; setup_discrepancy: string
}
const usd0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

const Links = ({ list }: { list: Src[] }) => (
  <>{list.map((s, i) => <span key={`${s.url}${i}`}>{i > 0 && ' · '}{s.url ? <a className="text-link underline" href={s.url}>{s.label}</a> : s.label}{s.how_seen ? ` (${s.how_seen}${s.date ? `, ${s.date}` : ''})` : ''}</span>)}</>
)

/** The wider picture around the article: link speeds, more docks, what others measured, several eGPUs, cost per GB, catches and what we could not find. */
export function EgpuExpanded() {
  return (
    <div className="mt-6 space-y-6">
      <div role="note" className="rounded border border-line bg-panel p-3 text-sm">
        <h3 className="mb-1 font-mono text-base text-accent">{X.conflict.title}</h3>
        <p className="text-muted">{X.conflict.text}</p>
        <p className="mt-1 text-xs text-subtle"><Links list={X.conflict.sources} /></p>
        <h4 className="mt-3 font-mono text-sm text-accent">{X.host_setup.title}</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted">{X.host_setup.items.map((i) => <li key={i}>{i}</li>)}</ul>
        <p className="mt-2 text-xs text-muted">{X.setup_discrepancy}</p>
      </div>

      <div>
        <h3 className="mb-1 font-mono text-base text-accent">Does the cable slow the model down?</h3>
        <p className="mb-2 text-xs text-subtle">Mostly not, once the whole model sits in the card&apos;s memory. It matters when the card has to share work with system memory.</p>
        <ul className="space-y-2 text-sm">
          {X.links.map((l) => (
            <li key={l.name} className="rounded border border-line bg-panel p-3">
              <p><strong className="text-fg">{l.name}.</strong> <span className="text-muted">{l.bandwidth}</span></p>
              <p className="mt-1 text-xs text-muted">{l.notes}</p>
              <p className="mt-1 text-xs text-subtle"><Links list={l.sources} /></p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 font-mono text-base text-accent">More docks</h3>
        <p className="mb-2 text-xs text-subtle">Prices are store or guide listings seen on the dates in the basis column; most pages were search excerpts, so check the maker before buying.</p>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Dock</th><th className="pr-3">Price</th><th className="pr-3">Link</th><th className="pr-3">Power supply</th><th>Notes</th></tr></thead>
            <tbody>
              {X.more_docks.map((d) => (
                <tr key={d.name} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{d.name}</td>
                  <td className="pr-3 font-mono">{d.price_usd != null ? usd0(d.price_usd) : '–'}<div className="font-sans text-xs text-subtle">{d.price_basis}</div></td>
                  <td className="pr-3 text-xs">{d.link_type}</td>
                  <td className="pr-3 text-xs">{d.needs_psu}</td>
                  <td className="text-xs text-muted">{d.notes}<div className="text-subtle"><Links list={d.sources.slice(0, 2)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-mono text-base text-accent">What other people measured</h3>
        <p className="mb-2 text-xs text-subtle">Different hosts, software and dates, so these are not a ranking. A &quot;bench reference&quot; row is a card in an ordinary slot, not an eGPU, shown for comparison.</p>
        <ul className="space-y-2 text-sm">
          {X.others_measured.map((m) => (
            <li key={m.card + m.result} className="rounded border border-line bg-panel p-3">
              <p><strong className="text-fg">{m.card}</strong>{m.host ? <span className="text-muted"> on {m.host}</span> : null}</p>
              <p className="mt-1 text-xs text-muted">{m.result}</p>
              <p className="mt-1 text-xs text-subtle">{m.author ? `${m.author}: ` : ''}<Links list={[m.source]} /></p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{X.b60_note}</p>
      </div>

      <div>
        <h3 className="mb-1 font-mono text-base text-accent">Two or more eGPUs</h3>
        <p className="mb-2 text-xs text-subtle">They pool memory by splitting a model by layers, which adds capacity, not speed: the cards take turns, so each is busy about half the time.</p>
        <ul className="space-y-2 text-sm">
          {X.multi.map((m) => (
            <li key={m.what} className="rounded border border-line bg-panel p-3">
              <p className="text-fg">{m.what}</p>
              <p className="mt-1 text-xs text-muted"><strong className="text-fg">Result:</strong> {m.result}</p>
              <p className="mt-1 text-xs text-muted"><strong className="text-fg">Caveats:</strong> {m.caveats}</p>
              <p className="mt-1 text-xs text-subtle"><Links list={[m.source]} /></p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 font-mono text-base text-accent">Cost per GB of video memory, with and without the dock</h3>
        <p className="mb-2 text-xs text-subtle">{X.cost_per_gb.note}</p>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Card</th><th className="pr-3 text-right">Card</th><th className="pr-3 text-right">With dock and PSU</th><th className="pr-3 text-right">$/GB with</th><th className="text-right">$/GB card only</th></tr></thead>
            <tbody>
              {X.cost_per_gb.rows.map((r) => (
                <tr key={r.card} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{r.card}{r.note && <div className="text-xs text-subtle">{r.note}</div>}</td>
                  <td className="pr-3 text-right font-mono">{usd0(r.card_usd)}</td><td className="pr-3 text-right font-mono">{usd0(r.egpu_total_usd)}</td>
                  <td className="pr-3 text-right font-mono">${r.egpu_usd_per_gb.toFixed(1)}</td><td className="text-right font-mono">${r.card_only_usd_per_gb.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-mono text-base text-accent">The catches</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{X.catches.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>

      <details className="text-xs text-subtle">
        <summary className="cursor-pointer">What we looked for and could not find ({X.not_found.length})</summary>
        <ul className="mt-1 list-disc space-y-1 pl-5">{X.not_found.map((n) => <li key={n}>{n}</li>)}</ul>
      </details>
    </div>
  )
}
