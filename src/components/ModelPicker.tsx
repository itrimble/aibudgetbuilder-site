import { useId, useMemo, useRef, useState } from 'react'
import { fitOf, type Fit } from '../lib/fit'
import { taskLabel } from './Models'

export type PickModel = { task: string; name: string; vram_gb_estimate: number }
export type { Fit }

const BADGE: Record<Fit, { text: string; cls: string }> = {
  fits: { text: 'fits', cls: 'border-ok text-ok' },
  tight: { text: 'tight', cls: 'border-warn text-warn' },
  no: { text: "won't fit", cls: 'border-err text-err' },
}
export const keyOf = (m: PickModel) => `${m.task}|${m.name}`

/** A searchable, grouped model list. Each entry carries a fit badge computed from the current build, so changing cards updates every badge. */
export function ModelPicker({ models, value, onChange, vram, cards }: { models: PickModel[]; value: string; onChange: (v: string) => void; vram: number; cards: number }) {
  const id = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = models.find((m) => keyOf(m) === value)
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return models.filter((m) => !needle || `${taskLabel(m.task)} ${m.name}`.toLowerCase().includes(needle))
  }, [models, q])
  const groups = useMemo(() => {
    const out: { task: string; items: PickModel[] }[] = []
    for (const m of shown) { const g = out.find((x) => x.task === m.task); if (g) g.items.push(m); else out.push({ task: m.task, items: [m] }) }
    return out
  }, [shown])
  const pick = (m: PickModel) => { onChange(keyOf(m)); setQ(''); setOpen(false) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(shown.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); pick(shown[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }
  let flat = -1
  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label="Search for a model to run"
          value={open ? q : selected ? `${selected.name} (~${selected.vram_gb_estimate} GB)` : q}
          placeholder="Search models, for example qwen or whisper"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => { setOpen(true); setQ('') }} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKey}
          className="w-full rounded border border-line bg-panel p-2"
        />
        {selected && <button className="rounded border border-line bg-panel px-3 text-sm" onClick={() => { onChange(''); setQ(''); inputRef.current?.focus() }}>Clear</button>}
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded border border-accent bg-panel p-1 shadow-lg">
          {groups.length === 0 && <li className="p-2 text-sm text-subtle">No model matches &quot;{q}&quot;.</li>}
          {groups.map((g) => (
            <li key={g.task} role="presentation">
              <div className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{taskLabel(g.task)}</div>
              <ul role="presentation">
                {g.items.map((m) => {
                  flat += 1
                  const i = flat
                  const fit = fitOf(vram, m.vram_gb_estimate, cards)
                  return (
                    <li key={keyOf(m)} role="option" aria-selected={keyOf(m) === value} onMouseDown={(e) => { e.preventDefault(); pick(m) }} onMouseEnter={() => setActive(i)}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm ${i === active ? 'bg-panel2' : ''}`}>
                      <span className="min-w-0">{m.name} <span className="text-xs text-subtle">~{m.vram_gb_estimate} GB</span></span>
                      <span className={`shrink-0 rounded border px-1.5 text-[11px] font-semibold ${BADGE[fit].cls}`}>{BADGE[fit].text}</span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
