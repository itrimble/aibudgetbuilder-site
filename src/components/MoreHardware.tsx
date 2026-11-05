import data from '../data/builds/more-hardware.json'

type Src = { label: string; url: string | null; date?: string | null; how_seen?: string | null }
type Route = {
  id: string; group: string; name: string; memory: string; price: string; price_kind: string; price_source: string; price_date: string
  measured: string[]; watts: string | null; catches: string[]; verdict: string; sources: Src[]
}
type Cluster = { what: string; model: string; tok_per_sec: string; note: string; source: Src }
type Claim = { claim: string; verdict: string; detail: string; source: Src }

const ROUTES = data.routes as unknown as Route[]
const CLUSTERS = data.mac_clusters as unknown as Cluster[]
const CLAIMS = data.claim_checks as unknown as Claim[]
const RULED_OUT = data.ruled_out as { name: string; why: string }[]
const GROUPS = ['Apple', 'Small boxes', 'Odd hardware']
const GROUP_NOTE: Record<string, string> = {
  Apple: 'Mac mini and Mac Studio: unified memory, no CUDA, quiet. Prices are Apple list prices from August, not rechecked on Apple\'s configurator.',
  'Small boxes': 'Small appliances with 128 GB of shared memory. Fast enough for mixture-of-experts models, slow for big dense ones, and priced up sharply by the memory shortage.',
  'Odd hardware': 'Repurposed or modified parts. Fascinating, but the evidence is thinner and the risk is yours.',
}

const SrcLinks = ({ list }: { list: Src[] }) => (
  <>{list.map((s, i) => <span key={`${s.url}${i}`}>{i > 0 && ' · '}{s.url ? <a className="text-link underline" href={s.url}>{s.label}</a> : s.label}{s.how_seen ? ` (${s.how_seen}${s.date ? `, ${s.date}` : ''})` : ''}</span>)}</>
)

/** Mac minis and Studios, small shared-memory boxes, and odd repurposed hardware, each with dated prices, what others measured and the evidence level of every source. */
export function MoreHardware() {
  return (
    <>
      {GROUPS.map((g) => (
        <section key={g} aria-label={g}>
          <h2 className="mb-1 font-mono text-lg text-accent">{g === 'Apple' ? 'Mac mini and Mac Studio' : g === 'Small boxes' ? 'Small boxes with 128 GB of shared memory' : 'Odd hardware: Raspberry Pi hosts, modified cards, mining parts'}</h2>
          <p className="mb-2 text-xs text-subtle">{GROUP_NOTE[g]}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {ROUTES.filter((r) => r.group === g).map((r) => (
              <article key={r.id} className="min-w-0 rounded border border-line bg-panel p-3">
                <h3 className="font-mono text-base text-accent">{r.name}</h3>
                <p className="mt-1 text-sm"><strong className="text-fg">{r.verdict}.</strong></p>
                <p className="mt-1 text-xs text-muted"><strong className="text-fg">Memory:</strong> {r.memory}</p>
                <p className="mt-1 text-xs text-muted"><strong className="text-fg">Price:</strong> {r.price} <span className="text-subtle">({r.price_kind}, {r.price_date})</span></p>
                {r.watts && <p className="mt-1 text-xs text-muted"><strong className="text-fg">Power:</strong> {r.watts}</p>}
                {r.measured.length > 0 && (
                  <details className="mt-1 text-xs text-muted" open>
                    <summary className="cursor-pointer">What others measured ({r.measured.length})</summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">{r.measured.map((m) => <li key={m}>{m}</li>)}</ul>
                  </details>
                )}
                <details className="mt-1 text-xs text-muted">
                  <summary className="cursor-pointer">The catches ({r.catches.length})</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">{r.catches.map((c) => <li key={c}>{c}</li>)}</ul>
                </details>
                <p className="mt-2 text-xs text-subtle">Price basis: {r.price_source}.</p>
                <p className="mt-1 text-xs text-subtle">Sources: <SrcLinks list={r.sources} /></p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section aria-label="Mac cluster results">
        <h2 className="mb-1 font-mono text-lg text-accent">Mac clusters: what has been measured</h2>
        <p className="mb-2 text-xs text-subtle">Clustering Macs speeds a model up only over a fast direct link (Thunderbolt 5 with RDMA); over ordinary networking it tends to slow it down.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Setup</th><th className="pr-3">Model</th><th className="pr-3">Generation speed</th><th>Source</th></tr></thead>
            <tbody>
              {CLUSTERS.map((c) => (
                <tr key={c.what} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{c.what}<div className="text-xs text-subtle">{c.note}</div></td>
                  <td className="pr-3">{c.model}</td>
                  <td className="pr-3 font-mono text-xs">{c.tok_per_sec} tok/s</td>
                  <td className="text-xs"><SrcLinks list={[c.source]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Claims checked">
        <h2 className="mb-1 font-mono text-lg text-accent">Claims people repeat, checked against the source</h2>
        <ul className="space-y-2 text-sm">
          {CLAIMS.map((c) => (
            <li key={c.claim} className="rounded border border-line bg-panel p-3">
              <p>{c.claim}</p>
              <p className="mt-1"><strong className="text-fg">{c.verdict}.</strong> <span className="text-muted">{c.detail}</span></p>
              <p className="mt-1 text-xs text-subtle"><SrcLinks list={[c.source]} /></p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-subtle">Not ruled in: {RULED_OUT.map((r) => `${r.name} (${r.why})`).join(' ')}</p>
      </section>
    </>
  )
}
