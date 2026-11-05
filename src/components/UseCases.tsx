import data from '../data/builds/use-cases.json'

type Src = { url: string; how_seen?: string }
type UC = { name: string; description: string; models: string[] | null; vram_gb: string | null; hardware_reported: string[] | null; cost_reported: string | null; confidence: string; sources: Src[] }
const CASES = data.use_cases as unknown as UC[]
const GOTCHAS = data.gotchas as unknown as { text: string; sources: string[] }[]
const PLATFORMS = data.platforms_checked as unknown as { platform: string; result: string; note: string }[]
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

/** What hobbyists and enthusiasts report running at home. All of it was found through search excerpts and is dated; none was reproduced by us. */
export function UseCases() {
  return (
    <div className="space-y-8">
      <section aria-label="How to read this page" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-lg text-accent">What people build with these machines</h2>
        <p>
          {CASES.length} things hobbyists and enthusiasts report running at home, with the memory they say it needs and the hardware they used. Researched {data.researched_on}.{' '}
          <strong className="text-fg">We saw search-result excerpts, not full threads, and reproduced none of it.</strong> Memory figures are what each source states. Prices are
          the source&apos;s snapshot, not ours.
        </p>
      </section>

      <section aria-label="Use cases" className="grid gap-3 md:grid-cols-2">
        {CASES.map((u) => (
          <article key={u.name} className="min-w-0 rounded border border-line bg-panel p-3">
            <h3 className="font-mono text-base text-accent">{u.name}</h3>
            <p className="mt-1 text-sm">{u.description}</p>
            {u.vram_gb && <p className="mt-2 text-xs text-muted"><strong className="text-fg">Memory:</strong> {u.vram_gb}</p>}
            {u.models && u.models.length > 0 && <p className="mt-1 text-xs text-muted"><strong className="text-fg">Models:</strong> {u.models.join('; ')}</p>}
            {u.hardware_reported && u.hardware_reported.length > 0 && (
              <details className="mt-1 text-xs text-muted">
                <summary className="cursor-pointer">Hardware people report ({u.hardware_reported.length})</summary>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{u.hardware_reported.map((h) => <li key={h}>{h}</li>)}</ul>
              </details>
            )}
            {u.cost_reported && <p className="mt-1 text-xs text-muted"><strong className="text-fg">Cost reported:</strong> {u.cost_reported}</p>}
            <p className="mt-2 text-xs text-subtle">
              Evidence: {u.confidence}. Sources:{' '}
              {u.sources.map((s, i) => <span key={s.url}>{i > 0 && ' · '}<a className="text-link underline" href={s.url}>{host(s.url)}</a></span>)}
            </p>
          </article>
        ))}
      </section>

      <section aria-label="Gotchas people keep reporting">
        <h2 className="mb-1 font-mono text-lg text-accent">Gotchas people keep reporting</h2>
        <ul className="space-y-2 text-sm">
          {GOTCHAS.map((g) => (
            <li key={g.text} className="rounded border border-line bg-panel p-2">
              {g.text}
              <div className="mt-1 text-xs text-subtle">{g.sources.map((s, i) => <span key={s}>{i > 0 && ' · '}<a className="text-link underline" href={s}>{host(s)}</a></span>)}</div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="What we could and could not read" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-base text-accent">What we could and could not read</h2>
        <ul className="list-disc space-y-1 pl-5">
          {PLATFORMS.map((p) => <li key={p.platform}><strong className="text-fg">{p.platform}:</strong> {p.result}. {p.note}</li>)}
        </ul>
        <p className="mt-2 text-xs text-subtle">{data.method_note}</p>
      </section>
    </div>
  )
}
