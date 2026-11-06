import { useMemo, useState } from 'react'
import moeData from '../data/models/moe.json'
import gameData from '../data/models/gamedev.json'
import { ModelLinks, SafeDownloads } from './ModelLinks'
import { CONTEXT_GB, OS_RESERVE_GB, OVERHEAD_GB } from '../lib/constants'
import { FIT_LABEL, classifyFit, stackTotals, type Fit } from '../lib/memory'

type Quant = { quant: string; files: number; bytes: number; gb: number }
type Moe = {
  id: string; name: string; vendor: string; total_params_b: number; active_params_b: number | null
  num_experts: number | null; experts_per_token: number | null; licence: string; released: string | null
  tasks: string[]; gguf: { repo: string; quants: Quant[] } | null; source_url: string; checked_on: string; note?: string
}
type Game = {
  id: string; name: string; vendor: string; kind: string; licence: string; commercial_use: 'yes' | 'no' | 'unclear'
  weights_gb: number; weights_format: string; stated_vram_gb: number | null; stated_vram_quote: string | null
  makes: string; source_url: string; checked_on: string; note?: string
}
const MOE = moeData as unknown as Moe[]
const GAME = gameData as unknown as Game[]

const LEVELS = ['Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q8'] as const
type Level = (typeof LEVELS)[number]
/** The measured quant for a level. MXFP4 counts as 4-bit. A model with a single quant uses it whatever is chosen. Plain K-quants win over UD variants. */
export function pickQuant(m: Moe, level: Level): Quant | null {
  const qs = m.gguf?.quants ?? []
  if (!qs.length) return null
  const hit = qs.filter((q) => q.quant.includes(level) || (level === 'Q4' && q.quant.includes('MXFP4')))
  if (hit.length) return hit.find((q) => !q.quant.startsWith('UD-')) ?? hit[0]
  return qs.length === 1 ? qs[0] : null
}

const KIND_LABEL: Record<string, string> = { coding: 'Coding', vision: 'Vision (read screenshots)', sfx: 'Sound effects', tts: 'Voice (speech)', '3d': '3D models', image: 'Sprites and textures', music: 'Music', stt: 'Speech to text', video: 'Video' }
const ROLES = ['vision', 'sfx', 'tts', '3d', 'image', 'music'] as const

const fitStyle: Record<Fit, string> = { vram: 'text-ok', offload: 'text-accent', slow: 'text-warn', no: 'text-subtle' }
const licBadge = (c: Game['commercial_use']) =>
  c === 'yes' ? { t: 'commercial use: yes', cls: 'text-ok' } : c === 'no' ? { t: 'NON-COMMERCIAL', cls: 'text-warn' } : { t: 'commercial use: unclear, read the licence', cls: 'text-warn' }

export function Capacity({ buildVramGb, buildCards }: { buildVramGb: number; buildCards: number }) {
  const [vram, setVram] = useState<string>('')
  const [ram, setRam] = useState('192')
  const [level, setLevel] = useState<Level>('Q4')
  const [picks, setPicks] = useState<Record<string, string>>({})
  const vramGb = vram === '' ? buildVramGb : Number(vram)
  const cards = vram === '' ? buildCards : Math.max(1, Math.round(vramGb / 24))
  const ramGb = Number(ram) || 0

  const rows = useMemo(() => {
    return MOE.map((m) => {
      const q = pickQuant(m, level)
      const r = q ? classifyFit({ vramGb, cards, ramGb, weightsGb: q.gb, moe: true }) : null
      return { m, q, r }
    }).sort((a, b) => b.m.total_params_b - a.m.total_params_b)
  }, [level, vramGb, cards, ramGb])
  const ok = rows.filter((x) => x.r && x.r.fit !== 'no')
  const best = (f: Fit) => rows.filter((x) => x.r?.fit === f)[0]

  const usableVram = Math.max(0, vramGb - OVERHEAD_GB * cards)
  const stack = ROLES.map((role) => {
    const opts = GAME.filter((g) => g.kind === role)
    const fits = opts.filter((o) => o.weights_gb <= usableVram)
    // default: a commercially usable model that fits, else any that fits, else the first; the person can always change it
    const chosen = opts.find((o) => o.id === picks[role]) ?? fits.find((o) => o.commercial_use === 'yes') ?? fits[0] ?? opts[0]
    return { role, opts, chosen }
  })
  const totals = stackTotals(stack.map((s) => s.chosen?.weights_gb ?? 0))
  const codingRows = rows.filter((x) => x.m.tasks.includes('coding') && x.r && x.r.fit !== 'no')
  const codingVram = codingRows.find((x) => x.r!.fit === 'vram')
  const codingRam = codingRows.find((x) => x.r!.fit === 'offload')

  const field = 'w-24 rounded border border-line bg-panel p-1'
  return (
    <div className="space-y-8">
      <SafeDownloads />
      <section aria-label="Memory">
        <h2 className="mb-2 font-mono text-lg text-accent">What can I run?</h2>
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="flex flex-col gap-1">GPU memory (GB)
            <input inputMode="numeric" className={field} value={vram} placeholder={String(buildVramGb)} onChange={(e) => setVram(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="flex flex-col gap-1">System RAM (GB)
            <input inputMode="numeric" className={field} value={ram} onChange={(e) => setRam(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="flex flex-col gap-1">Quantisation
            <select className="rounded border border-line bg-panel p-1" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l} (about {l.slice(1)} bits per weight)</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          GPU memory defaults to your build ({buildVramGb} GB across {buildCards} card(s)); type a number to try another. A mixture-of-experts (MoE) model
          stores many experts but reads only a few for each token, so its experts can sit in system RAM while the cards hold the busy parts. This page checks
          <strong> memory fit only</strong>. It says nothing about speed: tokens per second depend on memory bandwidth, the backend and the quant, and none of that is measured here.
          Assumptions, not measurements: {OVERHEAD_GB} GB per card, {OS_RESERVE_GB} GB kept for the operating system, {CONTEXT_GB} GB for context (long contexts need more).
          Sizes are the actual GGUF file sizes on Hugging Face.
        </p>
      </section>

      <section aria-label="Summary" className="rounded border border-line bg-panel p-3 text-sm">
        <div className="font-semibold">With {vramGb} GB of GPU memory and {ramGb} GB of RAM at {level}:</div>
        <ul className="mt-1 list-disc pl-5 text-muted">
          <li>{best('vram') ? <>Biggest MoE model that fits entirely in VRAM: <strong className="text-fg">{best('vram').m.name}</strong> ({best('vram').m.total_params_b}B total, {best('vram').q?.gb} GB).</> : 'No MoE model in the list fits entirely in VRAM.'}</li>
          <li>{best('offload') ? <>Biggest that fits with experts in system RAM: <strong className="text-fg">{best('offload').m.name}</strong> ({best('offload').m.total_params_b}B total{best('offload').m.active_params_b ? `, ${best('offload').m.active_params_b}B active per token` : ''}, {best('offload').q?.gb} GB).</> : 'Nothing more fits by using system RAM.'}</li>
          <li>{ok.length} of {rows.length} listed MoE models fit in some form.</li>
        </ul>
      </section>

      <section aria-label="Mixture of experts models">
        <h3 className="mb-2 font-mono text-base text-accent">Mixture-of-experts models</h3>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-subtle">
              <tr><th className="py-1 pr-3">Model</th><th className="pr-3">Total / active</th><th className="pr-3">Size at {level}</th><th className="pr-3">Fit</th><th className="pr-3">Licence</th></tr>
            </thead>
            <tbody>
              {rows.map(({ m, q, r }) => (
                <tr key={m.id} className="border-t border-line align-top">
                  <td className="py-1 pr-3"><a className="text-link underline" href={m.source_url}>{m.name}</a><div className="text-xs text-subtle">{m.vendor}{m.released ? `, repo created ${m.released}` : ''}</div><ModelLinks url={m.source_url} gguf={m.gguf?.repo} id={m.id} /></td>
                  <td className="pr-3">{m.total_params_b}B / {m.active_params_b ? `${m.active_params_b}B` : <span className="text-subtle">not stated</span>}</td>
                  <td className="pr-3">{q ? <>{q.gb} GB <span className="text-xs text-subtle">({q.quant})</span></> : <span className="text-subtle">no {level} file{m.gguf ? '' : ' found'}</span>}</td>
                  <td className={`pr-3 ${r ? fitStyle[r.fit] : 'text-subtle'}`}>{r ? FIT_LABEL[r.fit] : 'unknown'}{r && r.fit === 'offload' && <div className="text-xs text-subtle">about {Math.ceil(r.spillGb)} GB of experts in RAM</div>}</td>
                  <td className="pr-3 text-xs">{m.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-subtle">
          Total and active parameters are from each model card or its config; sizes are summed file sizes of the named GGUF repository (some from community re-quantisers).
          Gated cards (Llama 4) were read from mirror repositories. Several licences are custom and not open-source: read them before shipping anything.
        </p>
      </section>

      <section aria-label="Game development stack">
        <h3 className="mb-2 font-mono text-base text-accent">A vibe-coded game: one model per job</h3>
        <p className="mb-3 text-sm text-muted">
          Pick a model per role. Sizes are the weights files; running a model takes more than its weights (activations, text encoders, long contexts), and that is only
          stated for a few models, so treat a green tick as "weights alone fit", not "will run".
        </p>
        <div className="space-y-3">
          <div className="rounded border border-line bg-panel p-3 text-sm">
            <div className="font-semibold">{KIND_LABEL.coding}</div>
            {codingVram || codingRam ? (
              <ul className="list-disc pl-5 text-muted">
                {codingVram && <li>Largest coding-tagged MoE entirely in VRAM: <strong className="text-fg">{codingVram.m.name}</strong>, {codingVram.q?.gb} GB at {codingVram.q?.quant}.</li>}
                {codingRam && <li>Largest with experts in system RAM: <strong className="text-fg">{codingRam.m.name}</strong>, {codingRam.q?.gb} GB at {codingRam.q?.quant}, {codingRam.m.active_params_b ? `${codingRam.m.active_params_b}B active per token` : 'active parameters not stated'}.</li>}
                <li className="list-none text-xs text-subtle">Bigger is not automatically better for game code; pick from the table above.</li>
              </ul>
            ) : <div className="text-muted">No coding MoE in the list fits this memory at {level}.</div>}
          </div>
          {stack.map(({ role, opts, chosen }) => (
            <div key={role} className="rounded border border-line bg-panel p-3 text-sm">
              <label className="flex flex-wrap items-center gap-2"><span className="font-semibold">{KIND_LABEL[role]}</span>
                <select className="rounded border border-line bg-panel2 p-1" value={chosen?.id} onChange={(e) => setPicks({ ...picks, [role]: e.target.value })}>
                  {opts.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.weights_gb} GB</option>)}
                </select>
              </label>
              {chosen && (
                <div className="mt-1 text-muted">
                  {chosen.makes} <span className={chosen.weights_gb <= usableVram ? 'text-ok' : 'text-warn'}>{chosen.weights_gb <= usableVram ? 'Weights fit in VRAM.' : 'Weights do not fit in VRAM.'}</span>{' '}
                  <span className={licBadge(chosen.commercial_use).cls}>{licBadge(chosen.commercial_use).t}</span> ({chosen.licence}).
                  {chosen.stated_vram_gb != null && <span> Model card says {chosen.stated_vram_gb} GB: “{chosen.stated_vram_quote}”.</span>}
                  <a className="ml-1 text-link underline" href={chosen.source_url}>source, checked {chosen.checked_on}</a>
                  <ModelLinks url={chosen.source_url} />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          Asset models together: <strong>{totals.allAtOnce.toFixed(1)} GB</strong> if all are loaded at once, <strong>{totals.oneAtATime.toFixed(1)} GB</strong> if you run them one at a time (the largest sets the need). Usable VRAM: {usableVram.toFixed(1)} GB.
        </p>
      </section>
    </div>
  )
}
