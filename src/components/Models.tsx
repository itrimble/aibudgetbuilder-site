import { useState } from 'react'
import { fitsModel } from '../lib/compat'
import { OVERHEAD_GB } from '../lib/constants'
import { ModelLinks, SafeDownloads } from './ModelLinks'

export type ModelRec = {
  name: string
  vendor?: string
  params_b?: number | null
  quant_suggested?: string
  vram_gb_estimate: number
  vram_basis?: string
  licence?: string
  backends?: string
  multi_gpu_split_ok?: boolean | string
  notes?: string
  source_url?: string
  checked_on?: string
}
// Display names for the task keys in tasks.json (the keys stay as they are so data and audit are untouched).
const TASK_LABELS: Record<string, string> = {
  'Coding autocomplete fim': 'Coding autocomplete (fill-in-the-middle)',
  'General chat reasoning': 'General chat and reasoning',
  'Long context document qa': 'Long documents and Q&A',
  'Vision language': 'Vision and image understanding',
  'Speech to text': 'Speech to text',
  'Tts voice cloning': 'Text to speech and voice cloning',
  'Music song generation': 'Music and song generation',
  'Ugc content avatars captions': 'UGC: avatars and captions',
  'Embeddings reranking': 'Embeddings and reranking',
  'Agents tool use': 'Agents and tool use',
}
export const taskLabel = (t: string) => TASK_LABELS[t] ?? t

export type TaskGroup = { task: string; models: ModelRec[] }

const PER_CARD_OVERHEAD_GB = OVERHEAD_GB

export function Models({ tasks, vramGb, cards }: { tasks: TaskGroup[]; vramGb: number; cards: number }) {
  const [onlyFit, setOnlyFit] = useState(true)
  if (!tasks.length)
    return <p className="text-muted">No model data loaded yet. Run the research step to fill src/data/models/tasks.json.</p>
  return (
    <div className="space-y-6">
      <SafeDownloads />
      <p className="text-sm text-muted">
        Your build: {vramGb} GB across {cards} card(s). Fit check assumes {PER_CARD_OVERHEAD_GB} GB overhead per card (an assumption, not measured).
        VRAM figures are estimates unless the basis says otherwise.
      </p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyFit} onChange={(e) => setOnlyFit(e.target.checked)} /> Only show models that fit</label>
      {tasks.map((t) => {
        const shown = t.models.filter((m) => !onlyFit || fitsModel(vramGb, m.vram_gb_estimate, PER_CARD_OVERHEAD_GB, cards))
        return (
          <section key={t.task} aria-label={taskLabel(t.task)}>
            <h2 className="mb-2 font-mono text-lg text-accent">{taskLabel(t.task)}</h2>
            {!shown.length && <p className="text-sm text-subtle">Nothing in this task fits {vramGb} GB.</p>}
            <ul className="grid gap-2 sm:grid-cols-2">
              {shown.map((m) => (
                <li key={m.name} className="rounded border border-line bg-panel p-3 text-sm">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted">
                    ~{m.vram_gb_estimate} GB{m.quant_suggested ? ` · ${m.quant_suggested}` : ''}{m.licence ? ` · ${m.licence}` : ''}
                  </div>
                  {m.backends && <div className="text-xs text-subtle">Runs on: {m.backends}</div>}
                  {m.notes && <p className="mt-1 text-xs text-muted">{m.notes}</p>}
                  {m.vram_basis && <p className="mt-1 text-xs text-subtle">VRAM basis: {m.vram_basis}</p>}
                  {m.source_url && <a className="text-xs text-link underline" href={m.source_url}>source{m.checked_on ? `, checked ${m.checked_on}` : ''}</a>}
                  <ModelLinks url={m.source_url} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
