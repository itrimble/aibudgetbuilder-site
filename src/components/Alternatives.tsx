import data from '../data/builds/more-hardware.json'

type Alt = { id: string; name: string; group: string; memory: string; price: string; price_kind: string; price_date: string; verdict: string; alt?: { memory_gb: number; low_usd: number; high_usd: number } }
const ROUTES = (data.routes as unknown as Alt[]).filter((r) => r.alt)

/** Machines that reach the memory target with no cards to buy (Macs, Ryzen AI Max boxes, DGX Spark, Jetson Thor), from the hardware tab's dated list prices. */
export function Alternatives({ targetGb, money, onOpen }: { targetGb: number; money: (n: number) => string; onOpen: () => void }) {
  const list = ROUTES.filter((r) => r.alt!.memory_gb >= targetGb).sort((a, b) => a.alt!.low_usd - b.alt!.low_usd).slice(0, 4)
  if (!list.length) return null
  return (
    <div aria-label="Other ways to reach the target">
      <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted">Other ways to reach {targetGb} GB, with no cards to buy</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((r) => {
          const a = r.alt!
          return (
            <li key={r.id} className="rounded border border-line bg-panel p-3 text-sm">
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-muted">{a.memory_gb} GB · {a.low_usd === a.high_usd ? money(a.low_usd) : `${money(a.low_usd)}–${money(a.high_usd)}`} · about {money(Math.round(a.low_usd / a.memory_gb))} per GB</div>
              <div className="mt-1 text-xs text-subtle">{r.verdict}. {r.price_kind}, {r.price_date}.</div>
            </li>
          )
        })}
      </ul>
      <button className="mt-2 text-xs text-link underline" onClick={onOpen}>Compare them in the hardware tab</button>
    </div>
  )
}
