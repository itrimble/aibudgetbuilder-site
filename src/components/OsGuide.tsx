import data from '../data/builds/os-support.json'

type Src = { label: string; url: string | null; how_seen?: string | null; date?: string | null }
type Cell = { status: string; backend: string | null; note: string | null }
type Row = { family: string; cards: string; windows: Cell; linux: Cell; macos: Cell; sources: Src[] }
type OsCard = { os: string; summary: string; tools: string[]; limits: string[]; pitfalls: string[]; sources: Src[] }
const D = data as unknown as {
  intro: string; verified_by_us: { claim: string; source: Src }[]; os: OsCard[]; matrix: Row[]
  cross_os_tools: { tool: string; windows: boolean | string; linux: boolean | string; macos: boolean | string; note: string; source: string | null }[]
  mac_memory: { default_gpu_share: string; how_to_raise: string; source: string }; not_found: string[]
}
const MARK: Record<string, string> = { works: 'Works', 'works with caveat': 'Works, with a caveat', 'not supported': 'Not supported', 'not researched': 'Not researched' }
const TONE: Record<string, string> = { works: 'text-ok', 'works with caveat': 'text-warn', 'not supported': 'text-err', 'not researched': 'text-subtle' }
const yn = (v: boolean | string) => (v === true ? 'Yes' : v === false ? 'No' : String(v))

const Links = ({ list }: { list: Src[] }) => (
  <>{list.map((s, i) => <span key={`${s.url}${i}`}>{i > 0 && ' · '}{s.url ? <a className="text-link underline" href={s.url}>{s.label}</a> : s.label}{s.how_seen ? ` (${s.how_seen}${s.date ? `, ${s.date}` : ''})` : ''}</span>)}</>
)

function CellView({ c }: { c: Cell }) {
  return (
    <td className="pr-3 align-top text-xs">
      <div className={`font-semibold ${TONE[c.status] ?? ''}`}>{MARK[c.status] ?? c.status}</div>
      {c.backend && <div className="text-muted">{c.backend}</div>}
      {c.note && <div className="mt-0.5 text-subtle">{c.note}</div>}
    </td>
  )
}

/** What runs where: Windows, Linux and macOS, by GPU family, with the tools that work on each and the sources behind every statement. */
export function OsGuide() {
  const memSources = D.mac_memory.source.split(/;\s*/).filter((s) => s.startsWith('http')).map((s) => s.split(' ')[0])
  return (
    <div className="space-y-8">
      <section aria-label="About this page" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-lg text-accent">Windows, Linux and Mac: what runs where</h2>
        <p>{D.intro}</p>
      </section>

      <section aria-label="Checked by us">
        <h2 className="mb-1 font-mono text-lg text-accent">Two facts we checked on the maker&apos;s own page</h2>
        <ul className="space-y-2 text-sm">
          {D.verified_by_us.map((v) => (
            <li key={v.claim} className="rounded border border-line bg-panel p-3">
              <p>{v.claim}</p>
              <p className="mt-1 text-xs text-subtle"><Links list={[v.source]} /></p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="By operating system" className="grid gap-3 md:grid-cols-3">
        {D.os.map((o) => (
          <article key={o.os} className="min-w-0 rounded border border-line bg-panel p-3">
            <h3 className="font-mono text-base text-accent">{o.os}</h3>
            <p className="mt-1 text-sm">{o.summary}</p>
            <details className="mt-2 text-xs text-muted" open>
              <summary className="cursor-pointer">Easiest tools ({o.tools.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{o.tools.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
            <details className="mt-1 text-xs text-muted">
              <summary className="cursor-pointer">Limits ({o.limits.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{o.limits.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
            <details className="mt-1 text-xs text-muted">
              <summary className="cursor-pointer">Pitfalls ({o.pitfalls.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{o.pitfalls.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
            <p className="mt-2 text-xs text-subtle">Sources: <Links list={o.sources} /></p>
          </article>
        ))}
      </section>

      <section aria-label="Support by GPU family">
        <h2 className="mb-1 font-mono text-lg text-accent">Support by card family</h2>
        <p className="mb-2 text-xs text-subtle">&quot;Works&quot; means the tool&apos;s own docs say so for that card family; it is not a benchmark and we have not run any of these.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Cards</th><th className="pr-3">Windows</th><th className="pr-3">Linux</th><th className="pr-3">macOS</th></tr></thead>
            <tbody>
              {D.matrix.map((r) => (
                <tr key={r.family} className="border-t border-line align-top">
                  <td className="py-1 pr-3"><strong className="text-fg">{r.family}</strong><div className="text-xs text-muted">{r.cards}</div><div className="mt-1 text-xs text-subtle"><Links list={r.sources.slice(0, 2)} /></div></td>
                  <CellView c={r.windows} /><CellView c={r.linux} /><CellView c={r.macos} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Tools on every system">
        <h2 className="mb-1 font-mono text-lg text-accent">Tools that run on more than one system</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Tool</th><th className="pr-3">Windows</th><th className="pr-3">Linux</th><th className="pr-3">macOS</th><th>Note</th></tr></thead>
            <tbody>
              {D.cross_os_tools.map((t) => (
                <tr key={t.tool} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{t.tool}</td><td className="pr-3">{yn(t.windows)}</td><td className="pr-3">{yn(t.linux)}</td><td className="pr-3">{yn(t.macos)}</td>
                  <td className="text-xs text-muted">{t.note}{t.source && <> <a className="text-link underline" href={t.source}>source</a></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Mac memory" className="rounded border border-line bg-panel p-3 text-sm">
        <h2 className="mb-1 font-mono text-base text-accent">How much of a Mac&apos;s memory the GPU can use</h2>
        <p className="text-muted">{D.mac_memory.default_gpu_share}</p>
        <p className="mt-2 text-muted"><strong className="text-fg">Raising it:</strong> {D.mac_memory.how_to_raise}</p>
        <p className="mt-2 text-xs text-subtle">These come from third-party posts seen as excerpts; we found no Apple page that states the default. Sources: {memSources.map((u, i) => <span key={u}>{i > 0 && ' · '}<a className="text-link underline" href={u}>{new URL(u).hostname}</a></span>)}.</p>
      </section>

      <details className="text-xs text-subtle">
        <summary className="cursor-pointer">What we looked for and could not find ({D.not_found.length})</summary>
        <ul className="mt-1 list-disc space-y-1 pl-5">{D.not_found.map((n) => <li key={n}>{n}</li>)}</ul>
      </details>
    </div>
  )
}
