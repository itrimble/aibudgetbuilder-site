import { useEffect, useMemo, useState } from 'react'
import boards from './data/parts/boards.json'
import gpuData from './data/parts/gpus.json'
import adapterData from './data/parts/adapters.json'
import psuData from './data/parts/psu.json'
import taskData from './data/models/tasks.json'
import pcData from './data/builds/my-pcs.json'
import presetData from './data/builds/presets.json'
import { ASSUMED_EFFICIENCY, checkBuild, fitsModel, needsFrom, placeCards, totals } from './lib/compat'
import type { Adapter, Board, Build, Gpu, MyPc, Psu } from './lib/types'
import { Models, taskLabel, type ModelRec } from './components/Models'
import { Capacity } from './components/Capacity'
import { Community } from './components/Community'
import { OtherHardware } from './components/OtherHardware'
import { UseCases } from './components/UseCases'
import { BuyingGuide } from './components/BuyingGuide'
import { OsGuide } from './components/OsGuide'
import { Icon, PartImage, credits } from './components/Visual'
import { disclosure } from './lib/affiliate'
import { CURRENCIES, RATES, detectCurrency, fmt, fmtRange, fmtUsd, fmtUsdRange, isSupported, toUsd } from './lib/currency'
import { TIERS, recommend } from './lib/budget'

const BOARDS = boards as unknown as Board[]
const ALL_GPUS = gpuData as unknown as Gpu[]
const BUYABLE = ALL_GPUS.filter((g) => !g.owned_only)
const ADAPTERS = adapterData as unknown as Adapter[]
const PSUS = psuData as unknown as Psu[]
const PCS = pcData as unknown as MyPc[]
import { OVERHEAD_GB } from './lib/constants'
import { decodeBuild, encodeBuild, type BuildState, type Known } from './lib/share'
import { toCsv, toText, type Line } from './lib/exportBuild'
import { HeldBack } from './components/HeldBack'
import { CardTable } from './components/CardTable'
import { ModelPicker, type PickModel } from './components/ModelPicker'
import { MobileBar, Summary } from './components/Summary'
import { Alternatives } from './components/Alternatives'
import { compatFlags } from './lib/flags'
import { restOfBox } from './lib/restOfBox'
import { RunningCost, ShareExport } from './components/BuildTools'

// The footer's price statement is computed from the data, so it cannot drift from it.
const PRICE_DATES = [...ALL_GPUS.filter((g) => g.price_high > 0), ...ADAPTERS, ...PSUS].map((x) => x.checked_on).filter(Boolean).sort()
const PLACEHOLDERS = [...ADAPTERS, ...PSUS].filter((x) => (x as { placeholder?: boolean }).placeholder).length

const KNOWN: Known = {
  pcs: Object.fromEntries(PCS.map((p) => [p.id, { hasPsu: p.psu_w > 0 }])),
  boards: BOARDS.map((b) => b.id), gpus: BUYABLE.map((g) => g.id), adapters: ADAPTERS.map((a) => a.id), psus: PSUS.map((p) => p.id),
}

const PRESETS = presetData as unknown as { name: string; counts: Record<string, number>; adapters: string[]; psu: string }[]

const label = 'mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted'
const btn = 'rounded border border-line bg-panel px-3 py-1 text-sm hover:bg-panel2'

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* storage may be blocked */ }
  }, [dark])
  return [dark, setDark] as const
}

function useCurrency() {
  const [code, setCode] = useState(() => {
    try { const v = localStorage.getItem('currency'); if (v && isSupported(v)) return v } catch { /* storage may be blocked */ }
    return detectCurrency(typeof navigator !== 'undefined' ? navigator.language : undefined)
  })
  useEffect(() => { try { localStorage.setItem('currency', code) } catch { /* ignore */ } }, [code])
  return [code, setCode] as const
}

type View = 'builder' | 'models' | 'capacity' | 'community' | 'consoles' | 'uses' | 'guide' | 'os'
const NAV: { id: string; label: string; views: { id: View; label: string }[] }[] = [
  { id: 'build', label: 'Build', views: [{ id: 'builder', label: 'Build' }] },
  { id: 'models', label: 'Models', views: [{ id: 'models', label: 'Models by task' }, { id: 'capacity', label: 'What can I run?' }] },
  { id: 'guides', label: 'Guides', views: [{ id: 'guide', label: 'Before you buy' }, { id: 'os', label: 'Windows, Linux, Mac' }, { id: 'consoles', label: 'PS5, Mac and odd hardware' }, { id: 'uses', label: 'What people build' }] },
  { id: 'community', label: 'Community', views: [{ id: 'community', label: 'Community reports' }] },
]

export default function App() {
  const [dark, setDark] = useTheme()
  const [view, setView] = useState<View>('builder')
  const shared = useMemo(() => (typeof window === 'undefined' ? null : decodeBuild(window.location.hash, KNOWN)), []) // a build link, or null (never a partial build)
  const [pcId, setPcId] = useState(shared?.pcId ?? 'omarchy')
  const pc = PCS.find((p) => p.id === pcId)!
  const [boardId, setBoardId] = useState(shared?.boardId ?? pc.board ?? BOARDS[0].id)
  const [counts, setCounts] = useState<Record<string, number>>(shared?.counts ?? {})
  const [adapterIds, setAdapterIds] = useState<string[]>(shared?.adapterIds ?? [])
  const [psuId, setPsuId] = useState(shared?.psuId ?? (pc.psu_w ? 'owned' : 'corsair-rm1000x-shift'))
  const [nvme, setNvme] = useState(shared?.nvme ?? 1)
  const [keepOwned, setKeepOwned] = useState(shared?.keepOwned ?? true)
  const [openFrame, setOpenFrame] = useState(shared?.openFrame ?? true)
  const [airflow, setAirflow] = useState(shared?.airflow ?? true)
  const [goal, setGoal] = useState('')
  const [currency, setCurrency] = useCurrency()
  const [tierId, setTierId] = useState('hobby')
  const [custom, setCustom] = useState('')
  const [fullBuild, setFullBuild] = useState(false)
  const money = (n: number) => fmt(n, currency)
  const rng = (l: number, h: number) => fmtRange(l, h, currency)
  const usdNote = (l: number, h: number) => (currency === 'USD' ? '' : ` · ${fmtUsdRange(l, h)} USD`)

  const pickPc = (p: MyPc) => {
    setPcId(p.id)
    if (p.board) setBoardId(p.board)
    setCounts({})
    setAdapterIds([])
    setKeepOwned(true)
    setPsuId(p.psu_w ? 'owned' : 'corsair-rm1000x-shift')
    setOpenFrame(p.id !== 'gamer-3060' && p.id !== 'mini')
  }

  const board = BOARDS.find((b) => b.id === boardId)!
  const ownedPsu: Psu | null = pc.psu_w ? { id: 'owned', name: `Your PSU (${pc.psu_w} W)`, watts: pc.psu_w, pcie_8pin: pc.psu_8pin, price: 0, source_url: '', checked_on: '' } : null
  const psuOptions = ownedPsu ? [ownedPsu, ...PSUS] : PSUS
  const psu = psuOptions.find((p) => p.id === psuId) ?? psuOptions[0]
  const pcOwned = pc.owned_gpus.map((id) => ALL_GPUS.find((g) => g.id === id)!).filter(Boolean)
  const ownedCards = keepOwned ? pcOwned : []
  const newCards = useMemo(() => BUYABLE.flatMap((g) => Array(counts[g.id] ?? 0).fill(g) as Gpu[]), [counts])
  const cards = [...ownedCards, ...newCards]
  const adapters = adapterIds.map((id) => ADAPTERS.find((a) => a.id === id)!).filter(Boolean)
  const build: Build = { boardId, gpuIds: cards.map((c) => c.id), adapterIds, psuId, nvmeDrives: nvme, caseOpenFrame: openFrame, airflowForPassive: airflow }
  const t = totals(cards, adapters, psu)
  const spend = totals(newCards, adapters, newCards.length ? psu : undefined) // no PSU cost until something is actually being bought
  const findings = checkBuild(build, board, cards, adapters, psu)
  const { placements } = placeCards(board, cards, adapters)
  const rest = useMemo(() => restOfBox({ scratch: pcId === 'scratch', board, nvme, openFrame }), [pcId, board, nvme, openFrame])
  const totalBudgetUsd = custom && Number(custom) > 0 ? toUsd(currency, Number(custom)) : (TIERS.find((t) => t.id === tierId)?.usd ?? 0)
  const budgetUsd = fullBuild ? Math.max(0, totalBudgetUsd - rest.high) : totalBudgetUsd // in Full build mode the rest of the box comes out of the budget first
  const budgetResult = useMemo(() => recommend({ board, owned: ownedCards, gpus: ALL_GPUS, adapters: ADAPTERS, psus: psuOptions, budgetUsd, nvme }), [board, pcId, psuId, budgetUsd, nvme, keepOwned]) // eslint-disable-line react-hooks/exhaustive-deps

  const allModels = (taskData.tasks as { task: string; models: ModelRec[] }[]).flatMap((g) => g.models.map((m) => ({ ...m, task: g.task })))
  const target = allModels.find((m) => `${m.task}|${m.name}` === goal)
  const need = target ? target.vram_gb_estimate : 0
  const fits = target ? fitsModel(t.vram, need, OVERHEAD_GB, t.cards) : false
  const suggestions = target && !fits
    ? BUYABLE.filter((g) => g.price_high > 0).map((g) => {
        const gap = need + OVERHEAD_GB * t.cards - t.vram
        const n = Math.max(1, Math.ceil(gap / (g.vram_gb - OVERHEAD_GB)))
        const trial = [...cards, ...Array(n).fill(g)] as Gpu[]
        const placed = placeCards(board, trial, adapters).placements
        const needs = needsFrom(checkBuild({ ...build, gpuIds: trial.map((c) => c.id) }, board, trial, adapters, psu))
        if (placed.some((p) => p.lanes <= 1)) needs.push('a riser (a slot would run at x1)')
        return { g, n, low: n * g.price_low, high: n * g.price_high, needs }
      }).sort((a, b) => a.low - b.low).slice(0, 3)
    : []
  const errorCount = findings.filter((f) => f.severity === 'error').length
  const warnCount = findings.filter((f) => f.severity === 'warn').length
  const ownedVram = ownedCards.reduce((n, g) => n + g.vram_gb, 0)
  const newVram = newCards.reduce((n, g) => n + g.vram_gb, 0)
  const flags = compatFlags(findings, cards)

  // sharing and export
  const stateNow: BuildState = { pcId, boardId, counts, adapterIds, psuId, nvme, openFrame, airflow, keepOwned }
  const buildLink = () => `${window.location.origin}${window.location.pathname}#${encodeBuild(stateNow)}`
  const exportLines = (): Line[] => {
    const group = <T extends { id: string }>(xs: T[]) => [...new Map(xs.map((x) => [x.id, { item: x, qty: xs.filter((y) => y.id === x.id).length }])).values()]
    return [
      ...group(newCards).map(({ item, qty }): Line => ({ kind: 'GPU', name: item.name, qty, low: item.price_low, high: item.price_high, checked_on: item.checked_on, source_url: item.source_url })),
      ...group(adapters).map(({ item, qty }): Line => ({ kind: 'Adapter', name: item.name, qty, low: item.price, high: item.price, checked_on: item.checked_on, source_url: item.source_url })),
      ...(newCards.length && psu.price > 0 ? [{ kind: 'PSU', name: psu.name, qty: 1, low: psu.price, high: psu.price, checked_on: psu.checked_on, source_url: psu.source_url } as Line] : []),
    ]
  }
  const summaryText = () => toText({ title: 'AI Budget Build', date: new Date().toLocaleDateString('en-CA'), lines: exportLines(), vram: t.vram, cards: t.cards, watts: t.watts, findings, link: buildLink() })

  const setCount = (id: string, d: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }))
  const applyPreset = (p: (typeof PRESETS)[number]) => { setCounts(p.counts); setAdapterIds(p.adapters); setPsuId(p.psu) }

  const group = NAV.find((g) => g.views.some((v) => v.id === view))!
  const summaryEl = (
    <Summary t={t} spend={spend} newVram={newVram} ownedVram={ownedVram} flags={flags} findings={findings} placements={placements} rng={rng} money={money} currency={currency} usd={fmtUsdRange} fullBuild={fullBuild} rest={rest}>
      <RunningCost wallW={Math.round(t.watts / ASSUMED_EFFICIENCY)} currency={currency} />
      <ShareExport getLink={buildLink} getSummary={summaryText} getCsv={() => toCsv(exportLines())} />
    </Summary>
  )
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-accent">AI Budget Build</h1>
          <p className="text-sm text-muted">Budget local AI on Windows, Linux or macOS. Start from the machine you own: see what fits, what it costs, and what it can run.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Sections">
          {NAV.map((g) => (
            <button key={g.id} onClick={() => setView(g.views[0].id)} aria-pressed={group.id === g.id}
              className={`rounded px-3 py-1 font-mono text-sm ${group.id === g.id ? 'bg-accent text-onaccent' : 'border border-line bg-panel'}`}>
              {g.label}
            </button>
          ))}
          <label className="flex items-center gap-1 text-sm text-muted">Currency
            <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded border border-line bg-panel px-2 py-1 text-fg">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </select>
          </label>
          <button className={btn} onClick={() => setDark(!dark)} aria-pressed={dark}>{dark ? 'Light mode' : 'Dark mode'}</button>
        </nav>
      </header>

      {group.views.length > 1 && (
        <nav aria-label={`${group.label} pages`} className="-mt-3 mb-4 flex flex-wrap gap-2 border-b border-line pb-2">
          {group.views.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} aria-pressed={view === v.id}
              className={`rounded px-3 py-1 text-sm ${view === v.id ? 'bg-panel2 font-semibold text-accent ring-1 ring-accent' : 'text-muted hover:bg-panel2'}`}>{v.label}</button>
          ))}
        </nav>
      )}

      <p className="mb-6 rounded border border-line bg-panel p-3 text-xs text-muted">
        {disclosure()} Prices are dated asking prices, not quotes, and nothing here was benchmarked on a multi-GPU build by us.
      </p>

      <main id="main">
        {view === 'os' ? (
          <OsGuide />
        ) : view === 'guide' ? (
          <BuyingGuide />
        ) : view === 'uses' ? (
          <UseCases />
        ) : view === 'consoles' ? (
          <OtherHardware />
        ) : view === 'community' ? (
          <Community />
        ) : view === 'capacity' ? (
          <Capacity buildVramGb={t.vram} buildCards={t.cards} />
        ) : view === 'models' ? (
          <Models tasks={taskData.tasks} vramGb={t.vram} cards={t.cards} />
        ) : (
          <>
          <div className="grid gap-6 md:grid-cols-3">
            <section className="min-w-0 space-y-6 md:col-span-2" aria-label="Parts">
              <div>
                <h2 className={label}>1. What do you have?</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {PCS.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => pickPc(p)} aria-pressed={pcId === p.id}
                        className={`h-full w-full rounded border p-3 text-left ${pcId === p.id ? 'border-accent bg-panel ring-1 ring-accent' : 'border-line bg-panel hover:bg-panel2'}`}>
                        <div className="flex items-center gap-2 font-semibold"><Icon name={p.icon} size={22} className="text-accent" /> {p.name}</div>
                        <div className="text-xs text-muted">{p.blurb}</div>
                      </button>
                    </li>
                  ))}
                </ul>
                {pc.note && <p className="mt-2 text-xs text-subtle">{pc.note}</p>}
              </div>

              <div>
                <h2 className={label}>2. What do you want to run?</h2>
                <ModelPicker models={allModels as PickModel[]} value={goal} onChange={setGoal} vram={t.vram} cards={t.cards} />
                {target && (
                  <div className="mt-2 rounded border border-line bg-panel p-3 text-sm" aria-live="polite">
                    {fits
                      ? <p className={errorCount ? 'text-warn' : 'text-info'}>Your {t.vram} GB fits {target.name} (~{need} GB plus {OVERHEAD_GB} GB per card){errorCount ? `, but this build has ${errorCount} error(s) to fix first. See Checks.` : '.'}</p>
                      : <>
                          <p className="text-warn">You have {t.vram} GB and {target.name} needs about {need} GB plus {OVERHEAD_GB} GB per card. Cheapest ways to close the gap:</p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {suggestions.map((s) => (
                              <li key={s.g.id}>
                                {s.n} x {s.g.name} for {money(s.low)}–{money(s.high)}{s.needs.length ? `, plus ${s.needs.join(', ')}` : ', no other changes needed'}
                                <button className="ml-2 text-link underline" onClick={() => setCount(s.g.id, s.n - (counts[s.g.id] ?? 0))}>add to build</button>
                              </li>
                            ))}
                          </ul>
                        </>}
                  </div>
                )}
              </div>

              <div>
                <h2 className={label}>3. What is your budget?</h2>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="What the budget covers">
                  <button onClick={() => setFullBuild(false)} aria-pressed={!fullBuild} className={`rounded border px-3 py-1 ${!fullBuild ? 'border-accent bg-accent text-onaccent' : 'border-line bg-panel hover:bg-panel2'}`}>Upgrade what I have</button>
                  <button onClick={() => setFullBuild(true)} aria-pressed={fullBuild} className={`rounded border px-3 py-1 ${fullBuild ? 'border-accent bg-accent text-onaccent' : 'border-line bg-panel hover:bg-panel2'}`}>Full build</button>
                  <span className="text-xs text-muted">{fullBuild ? 'Takes the drive, and when you start from scratch the board, memory and case, out of the budget first.' : 'Cards, adapters and a PSU only.'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {TIERS.map((t) => (
                    <button key={t.id} onClick={() => { setTierId(t.id); setCustom('') }} aria-pressed={tierId === t.id && !custom}
                      className={`rounded border px-3 py-1 text-sm ${tierId === t.id && !custom ? 'border-accent bg-accent text-onaccent' : 'border-line bg-panel hover:bg-panel2'}`}>
                      {t.name} · {fmt(t.usd, currency)}
                    </button>
                  ))}
                  <label className="flex items-center gap-1 text-sm">Your own
                    <input id="custom-budget" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))} placeholder="amount"
                      className="w-24 rounded border border-line bg-panel p-1" /> {currency}
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {custom ? 'Custom budget.' : TIERS.find((t) => t.id === tierId)?.blurb}{' '}
                  {fullBuild
                    ? `Full build: ${money(rest.high)} goes to the rest of the box first (${rest.items.map((i) => i.label).join(', ') || 'nothing priced'}), leaving ${money(budgetUsd)} for cards, adapters and a PSU${rest.unpriced.length ? `. Not priced, so not counted: ${rest.unpriced.join(', ')}.` : '.'}`
                    : 'Counts cards, adapters and a PSU only if yours cannot carry the build. It does not count the board, CPU, RAM, 2 TB NVMe or case. Switch to Full build to price what we can.'}
                  {' '}Each option is kept inside the budget even at the top of its price range.
                </p>
                <ul className="mt-2 space-y-2" aria-live="polite">
                  {budgetResult.options.slice(0, 3).map((o) => (
                    <li key={o.gpu.id} className="rounded border border-line bg-panel p-3 text-sm">
                      <div className="font-semibold">{o.n} x {o.gpu.name.replace(/\(.*?\)/g, '').trim()}: {o.vram} GB total{o.vram > o.newVram ? ` (${o.newVram} GB new + ${o.vram - o.newVram} GB you own)` : ''}</div>
                      <div className="text-xs text-muted">{rng(o.costLow, o.costHigh)} ({rng(o.perGbLow, o.perGbHigh)} per GB added){usdNote(o.costLow, o.costHigh)}</div>
                      <div className="text-xs text-subtle">Needs: {o.needs.join(', ') || 'nothing else'}.{o.slowLink ? ' Cards on x1 risers load models slowly (about 1 GB/s); speed after loading changes little.' : ''}{o.placeholders.length > 0 && ` Includes placeholder prices for: ${o.placeholders.join(', ')}.`}</div>
                      <button className="mt-1 text-xs text-link underline" onClick={() => {
                        setCounts({ [o.gpu.id]: o.n })
                        setAdapterIds([...o.m2Adapters.map((a) => a.id), ...Array(o.risers).fill('adt-r13-x1-x16-extender')])
                        setPsuId(o.psu.id)
                      }}>use this build</button>
                    </li>
                  ))}
                  {budgetResult.options.length === 0 && (
                    <li className="rounded border border-line bg-panel p-3 text-sm text-warn">
                      Nothing in the list fits {money(budgetUsd)} with these slots and this PSU.
                      {budgetResult.cheapest && ` The cheapest buildable option is ${budgetResult.cheapest.n} x ${budgetResult.cheapest.gpu.name.replace(/\(.*?\)/g, '').trim()} at ${rng(budgetResult.cheapest.costLow, budgetResult.cheapest.costHigh)}.`}
                    </li>
                  )}
                </ul>
              </div>

              <Alternatives targetGb={target ? Math.ceil(need + OVERHEAD_GB) : 128} money={money} onOpen={() => setView('consoles')} />

              <div>
                <h2 className={label}>Presets</h2>
                <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.name} onClick={() => applyPreset(p)} className={btn}>{p.name}</button>)}</div>
              </div>

              <div>
                <h2 className={label}>Board</h2>
                <div className="flex items-start gap-3">
                  <PartImage id={board.id} name={board.name} brand={board.brand} kind="board" />
                  <div className="min-w-0 flex-1">
                    <select aria-label="Board" value={boardId} onChange={(e) => setBoardId(e.target.value)} className="w-full rounded border border-line bg-panel p-2">
                      {BOARDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <p className="mt-2 text-xs text-fg">
                      {board.gpu_slots.length} PCIe slots ({board.gpu_slots.filter((s) => s.lanes >= 8).length} at x8 or wider) · {board.m2_slots.length} M.2 · {board.ram_type}
                      {board.price_low ? ` · used ${money(board.price_low)}–${money(board.price_high ?? board.price_low)}` : ' · owned or generic'}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">{board.note}</p>
              </div>

              <div>
                <h2 className={label}>Cards</h2>
                {pcOwned.length > 0 && (
                  <label className="mb-2 flex items-start gap-2 text-xs text-muted">
                    <input type="checkbox" className="mt-0.5" checked={keepOwned} onChange={(e) => setKeepOwned(e.target.checked)} />
                    <span>Keep the card already in your PC: {pcOwned.map((g) => `${g.name} (${g.vram_gb} GB, ${g.tdp_w} W)`).join(', ')}. Untick it if you would pull it to free a slot and its power draw. If it is your only video output, pulling it leaves the PC with no screen until another card or a remote session takes over.</span>
                  </label>
                )}
                <CardTable cards={BUYABLE} counts={counts} setCount={setCount} rng={rng} usdNote={usdNote} />
              </div>

              <div>
                <h2 className={label}>Adapters and risers</h2>
                <div className="flex flex-wrap gap-2">{ADAPTERS.map((a) => <button key={a.id} onClick={() => setAdapterIds((x) => [...x, a.id])} className={btn}>+ {a.name} ({money(a.price)})</button>)}</div>
                <ul className="mt-2 text-sm">{adapters.map((a, i) => <li key={i}>{a.name} <button className="ml-2 text-err underline" onClick={() => setAdapterIds((x) => x.filter((_, j) => j !== i))}>remove</button></li>)}</ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">PSU
                  <select value={psuId} onChange={(e) => setPsuId(e.target.value)} className="mt-1 w-full rounded border border-line bg-panel p-2">
                    {psuOptions.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${money(p.price)}` : ''}</option>)}
                  </select>
                </label>
                <label className="text-sm">NVMe drives wanted (2 TB each)
                  <input type="number" min={0} max={4} value={nvme} onChange={(e) => setNvme(Number(e.target.value))} className="mt-1 w-full rounded border border-line bg-panel p-2" />
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={openFrame} onChange={(e) => setOpenFrame(e.target.checked)} /> Open-frame / mining-style case</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={airflow} onChange={(e) => setAirflow(e.target.checked)} /> Forced airflow over passive cards</label>
              </div>
            </section>

            <aside className="hidden min-w-0 md:sticky md:top-4 md:block md:self-start" aria-label="Build summary">{summaryEl}</aside>
          </div>
          <MobileBar vram={t.vram} newVram={newVram} ownedVram={ownedVram} rng={rng} low={fullBuild ? spend.priceLow + rest.low : spend.priceLow} high={fullBuild ? spend.priceHigh + rest.high : spend.priceHigh} problems={errorCount} warnings={warnCount}>{summaryEl}</MobileBar>
          </>
        )}
      </main>

      <div className="mt-8"><HeldBack /></div>
      <footer className="mt-10 space-y-2 border-t border-line pt-4 text-xs text-subtle">
        <p>
          Prices are stored in US dollars. {currency === 'USD' ? 'Choose another currency above to see an estimate.' : `Shown in ${currency} using the ${RATES.source_name}, published ${RATES.published}. This is an estimate: it leaves out VAT or sales tax, import duty and shipping, and many US sellers do not ship abroad, so local listings will differ.`}
        </p>
        <p>
          Card prices are asking prices from listing pages and price trackers. Power supplies are the maker's list price or a retailer's asking price, and adapters are the maker's price at its longest cable.
          The oldest price shown was checked {PRICE_DATES[0]} and the newest {PRICE_DATES[PRICE_DATES.length - 1]}.
          {PLACEHOLDERS > 0 && ` ${PLACEHOLDERS} power supply or adapter entries are placeholders.`}
          {' '}Not verified: whether the Tomahawk can split its x16 slot (its manual does not say), how risers behave in practice, and any speed on a multi-GPU build.
        </p>
        <p>
          Photos from Wikimedia Commons: {credits().map((c) => (<span key={c.id}>{c.title?.replace('File:', '')} by {c.author || 'unknown'} ({c.license}); </span>))}
          cards without a free photo show a placeholder. Brand marks are used only to name the maker, from the Simple Icons set.
        </p>
      </footer>
    </div>
  )
}
