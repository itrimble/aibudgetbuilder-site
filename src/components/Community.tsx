import benchData from '../data/builds/community-benchmarks.json'
import videoData from '../data/builds/video-reports.json'
import gpuData from '../data/parts/gpus.json'
import { fmtUsd, fmtUsdRange } from '../lib/currency'

type Claim = { kind: string; at: string; text: string; gpu?: string | null; gpu_id?: string; backend?: string; pp?: number; tg?: number; watts?: number; price_usd?: number; price_note?: string; cross_check?: string }
type Video = { id: string; channel: string; title: string; url: string; uploaded: string; duration: string; transcript: string; transcript_checked_on: string; test_bench: string; claims: Claim[] }
type Bench = { gpu: string; model: string; backend: string; pp512: number | null; tg128: number | null; watts: number | null; source?: string; note?: string }

const VIDEOS = videoData.videos as unknown as Video[]
const BENCH = benchData as unknown as { source_url: string; checked_on: string; author: string; method_caveats: string[]; rows: Bench[]; reader_reports: { claim: string; by: string; verified: boolean }[] }
const GPUS = gpuData as unknown as { id: string; name: string; price_low: number; price_high: number; checked_on: string }[]
const KIND_LABEL: Record<string, string> = { benchmark: 'Speed', software: 'Software', power: 'Power', price: 'Price', compat: 'Compatibility' }

const seconds = (hms: string) => hms.split(':').reduce((a, n) => a * 60 + Number(n), 0)
const daysAgo = (date: string) => Math.max(0, Math.round((Date.now() - Date.parse(date)) / 864e5))
const at = (v: Video, c: Claim) => `${v.url}&t=${seconds(c.at)}s`
const num = (n: number | null | undefined) => (n == null ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: 1 }))

export function Community() {
  return (
    <div className="space-y-8">
      <section aria-label="How to read this page" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-lg text-accent">Community reports</h2>
        <p>
          Other people&apos;s measurements and build notes, kept apart from the parts and prices the site is built on. They are good for ideas, for
          software findings and for comparing one card with another. They are one person&apos;s machine on one day, and we have not reproduced
          any of them. <strong className="text-fg">Prices in videos are a snapshot of the day they were recorded and are not our prices.</strong> Used
          GPU prices have mostly gone up since, so expect today&apos;s to be at or above what a video says.
        </p>
      </section>

      <section aria-label="Written benchmarks">
        <h2 className="mb-1 font-mono text-lg text-accent">Written benchmarks</h2>
        <p className="mb-2 text-xs text-subtle">
          From <a className="text-link underline" href={BENCH.source_url}>{BENCH.author}</a> and the sources named per row, checked {BENCH.checked_on}.
          Prompt speed is tokens per second reading the prompt (pp512), generation speed is tokens per second writing (tg128).
        </p>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr><th className="py-1 pr-3">Card</th><th className="pr-3">Model</th><th className="pr-3">Backend</th><th className="pr-3 text-right">Prompt</th><th className="pr-3 text-right">Generate</th><th className="text-right">Watts</th></tr>
            </thead>
            <tbody>
              {BENCH.rows.map((r) => (
                <tr key={`${r.gpu}|${r.model}|${r.backend}`} className="border-t border-line align-top">
                  <td className="py-1 pr-3">{r.gpu}</td>
                  <td className="pr-3">{r.model}{r.source && <> <a className="text-xs text-link underline" href={r.source}>source</a></>}</td>
                  <td className="pr-3 text-muted">{r.backend}</td>
                  <td className="pr-3 text-right font-mono">{num(r.pp512)}</td>
                  <td className="pr-3 text-right font-mono">{num(r.tg128)}</td>
                  <td className="text-right font-mono">{num(r.watts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-subtle">
          {BENCH.method_caveats.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>

      <section aria-label="Video reports" className="space-y-4">
        <h2 className="font-mono text-lg text-accent">Video reports</h2>
        {VIDEOS.map((v) => (
          <article key={v.id} className="rounded border border-line bg-panel p-3 text-sm">
            <h3 className="font-semibold"><a className="text-link underline" href={v.url}>{v.title}</a></h3>
            <p className="text-xs text-muted">
              {v.channel} · uploaded {v.uploaded} ({daysAgo(v.uploaded)} days ago) · {v.duration} · read from {v.transcript} on {v.transcript_checked_on}. Auto-captions
              get model names and numbers wrong, so check the timestamp.
            </p>
            <p className="mt-1 text-xs text-subtle">Test bench: {v.test_bench}</p>
            <ul className="mt-2 space-y-2">
              {[...v.claims].sort((a, b) => a.at.localeCompare(b.at)).map((c) => {
                const now = c.gpu_id ? GPUS.find((g) => g.id === c.gpu_id) : undefined
                return (
                  <li key={`${c.at}-${c.kind}`} className={`rounded border p-2 ${c.kind === 'price' ? 'border-warn' : 'border-line'}`}>
                    <div className="flex flex-wrap items-baseline gap-2 text-xs">
                      <span className="font-mono text-accent">{KIND_LABEL[c.kind] ?? c.kind}</span>
                      <a className="font-mono text-link underline" href={at(v, c)} aria-label={`Open the video at ${c.at}`}>{c.at}</a>
                      {c.backend && <span className="text-muted">{c.backend}</span>}
                    </div>
                    <p className="mt-1">{c.text}</p>
                    {c.cross_check && <p className="mt-1 text-xs text-muted">Cross-check: {c.cross_check}</p>}
                    {c.kind === 'price' && c.price_usd != null && (
                      <p className="mt-1 text-xs text-muted">
                        Historical, from {v.uploaded}: {fmtUsd(c.price_usd)}. {c.price_note}
                        {now && <> Our dated listing prices for {now.name}: {fmtUsdRange(now.price_low, now.price_high)}, checked {now.checked_on}.</>}
                        {' '}They differ because they measure different things, and neither is a quote.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </article>
        ))}
        {videoData.not_yet_read.length > 0 && (
          <div className="rounded border border-line p-3 text-xs text-subtle">
            <p className="mb-1 font-semibold text-muted">Videos found but not read yet</p>
            <ul className="list-disc space-y-1 pl-5">
              {videoData.not_yet_read.map((n) => (
                <li key={n.id}><a className="text-link underline" href={`https://www.youtube.com/watch?v=${n.id}`}>{n.title}</a>: {n.reason}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-label="Reader reports">
        <h2 className="mb-1 font-mono text-lg text-accent">Reader reports (unverified)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {BENCH.reader_reports.map((r) => (
            <li key={r.claim}>{r.claim} <span className="text-xs text-subtle">({r.by}{r.verified ? '' : ', not verified'})</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
