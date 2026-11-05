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
import { Icon, Logo, PartImage, credits } from './components/Visual'
import { disclosure, shopLink } from './lib/affiliate'
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
import { RestOfBox } from './components/RestOfBox'
import { RunningCost, ShareExport } from './components/BuildTools'

// The footer's price statement is computed from the data, so it cannot drift from it.
const PRICE_DATES = [...ALL_GPUS.filter((g) => g.price_high > 0), ...ADAPTERS, ...PSUS].map((x) => x.checked_on).filter(Boolean).sort()
const PLACEHOLDERS = [...ADAPTERS, ...PSUS].filter((x) => (x as { placeholder?: boolean }).placeholder).length

const KNOWN: Known = {
  pcs: Object.fromEntries(PCS.map((p) => [p.id, { hasPsu: p.psu_w > 0 }])),
  boards: BOARDS.map((b) => b.id), gpus: BUYABLE.map((g) => g.id), adapters: ADAPTERS.map((a) => a.id), psus: PSUS.map((p) => p.id),
}

const PRESETS = presetData as unknown as { name: string; counts: Record<string, number>; adapters: string[]; psu: string }[]

const SPEC_LABELS: Record<string, string> = { vram_gb: 'memory', tdp_w: 'power', slot_width: 'slot width', connector_count: 'power connectors', cooling: 'cooling' }
const specLabel = (f: string) => SPEC_LABELS[f] ?? f
const tone = { error: 'text-err', warn: 'text-warn', info: 'text-info' } as const
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

export default function App() {
  const [dark, setDark] = useTheme()
  const [view, setView] = useState<'builder' | 'models' | 'capacity' | 'community' | 'consoles' | 'uses' | 'guide' | 'os'>('builder')
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
  const [cardQuery, setCardQuery] = useState('')
  const [maxPerGb, setMaxPerGb] = useState(0) // 0 = show every card
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
  const perGb = (g: Gpu) => (g.price_low > 0 ? g.price_low / g.vram_gb : Infinity) // an owned card has no price, so it goes last
  const shownCards = [...BUYABLE]
    .filter((g) => (counts[g.id] ?? 0) > 0 || ((!cardQuery || g.name.toLowerCase().includes(cardQuery.toLowerCase())) && (!maxPerGb || perGb(g) <= maxPerGb)))
    .sort((a, b) => perGb(a) - perGb(b))
  const newCards = useMemo(() => BUYABLE.flatMap((g) => Array(counts[g.id] ?? 0).fill(g) as Gpu[]), [counts])
  const cards = [...ownedCards, ...newCards]
  const adapters = adapterIds.map((id) => ADAPTERS.find((a) => a.id === id)!).filter(Boolean)
  const build: Build = { boardId, gpuIds: cards.map((c) => c.id), adapterIds, psuId, nvmeDrives: nvme, caseOpenFrame: openFrame, airflowForPassive: airflow }
  const t = totals(cards, adapters, psu)
  const spend = totals(newCards, adapters, newCards.length ? psu : undefined) // no PSU cost until something is actually being bought
  const findings = checkBuild(build, board, cards, adapters, psu)
  const { placements } = placeCards(board, cards, adapters)
  const budgetUsd = custom && Number(custom) > 0 ? toUsd(currency, Number(custom)) : (TIERS.find((t) => t.id === tierId)?.usd ?? 0)
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-accent">AI Budget Build</h1>
          <p className="text-sm text-muted">Budget local AI on Windows, Linux or macOS. Start from the machine you own: see what fits, what it costs, and what it can run.</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Views">
          {(['builder', 'models', 'capacity', 'community', 'consoles', 'uses', 'guide', 'os'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={`rounded px-3 py-1 font-mono text-sm ${view === v ? 'bg-accent text-onaccent' : 'border border-line bg-panel'}`}>
              {v === 'builder' ? 'Builder' : v === 'models' ? 'Models by task' : v === 'capacity' ? 'What can I run?' : v === 'community' ? 'Community reports' : v === 'consoles' ? 'PS5, Mac and odd hardware' : v === 'uses' ? 'What people build' : v === 'guide' ? 'Before you buy' : 'Windows, Linux, Mac'}
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
                <select aria-label="Model goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded border border-line bg-panel p-2">
                  <option value="">Pick a model (optional)</option>
                  {allModels.map((m) => <option key={`${m.task}|${m.name}`} value={`${m.task}|${m.name}`}>{taskLabel(m.task)}: {m.name} (~{m.vram_gb_estimate} GB)</option>)}
                </select>
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
                  {custom ? 'Custom budget.' : TIERS.find((t) => t.id === tierId)?.blurb} Counts cards, adapters and a PSU only if yours cannot carry the build. It does not count the board, CPU, RAM, 2 TB NVMe or case.
                  Each option is kept inside the budget even at the top of its price range.
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
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <input value={cardQuery} onChange={(e) => setCardQuery(e.target.value)} placeholder="Search cards" aria-label="Search cards" className="rounded border border-line bg-panel p-1" />
                  <select value={maxPerGb} onChange={(e) => setMaxPerGb(Number(e.target.value))} aria-label="Price per GB limit" className="rounded border border-line bg-panel p-1">
                    <option value={0}>Any price per GB</option><option value={30}>Up to $30 per GB (lowest price)</option><option value={60}>Up to $60 per GB</option><option value={120}>Up to $120 per GB</option>
                  </select>
                  <span className="text-muted">Cheapest per GB first. Cards you have picked always stay in the list. Showing {shownCards.length} of {BUYABLE.length}.</span>
                </div>
                <ul className="space-y-2">
                  {shownCards.map((g) => (
                    <li key={g.id} className="rounded border border-line bg-panel p-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <PartImage id={g.id} name={g.name} brand={g.brand} />
                        <div className="min-w-[11rem] flex-1">
                          <div className="flex items-center gap-2 font-semibold"><Logo brand={g.brand} /> <span className="min-w-0">{g.name}</span></div>
                          <div className="text-xs text-muted">
                            {g.vram_gb} GB · {g.cooling} · {g.tdp_w} W · {g.price_high ? `${rng(g.price_low, g.price_high)} (${rng(g.price_low / g.vram_gb, g.price_high / g.vram_gb)}/GB)${usdNote(g.price_low, g.price_high)}` : 'owned'}
                          </div>
                          <p className="mt-1 text-xs text-subtle">{g.note}</p>
                          <p className="mt-1 text-xs text-muted">
                            Specs checked against the maker{g.spec_checked_on ? ` on ${g.spec_checked_on}` : ''}: {(g.spec_verified ?? []).map(specLabel).join(', ') || 'none'}.
                            {(g.spec_unverified ?? []).length > 0 && <> <strong>Not verified:</strong> {(g.spec_unverified ?? []).map(specLabel).join(', ')}.</>}
                            {g.spec_source_url && <> <a className="text-link underline" href={g.spec_source_url}>maker source</a></>}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <a className="text-link underline" href={g.source_url}>price source, checked {g.checked_on}</a>
                            {(['ebay', 'amazon'] as const).map((m) => {
                              const l = shopLink(m, g.name.replace(/\(.*?\)/g, '').trim(), g.id)
                              return <a key={m} className="text-link underline" href={l.href} rel={l.rel} target="_blank">search {m === 'ebay' ? 'eBay' : 'Amazon'}</a>
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <button aria-label={`Remove one ${g.name}`} onClick={() => setCount(g.id, -1)} className={`${btn} h-8 w-8 px-0`}>−</button>
                          <span aria-live="polite" className="w-6 text-center">{counts[g.id] ?? 0}</span>
                          <button aria-label={`Add one ${g.name}`} onClick={() => setCount(g.id, 1)} className={`${btn} h-8 w-8 px-0`}>+</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
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

            <aside className="min-w-0 space-y-4 md:sticky md:top-4 md:self-start" aria-label="Build summary">
              <div className="rounded border border-line bg-panel p-4">
                <div className="font-mono text-3xl font-bold text-accent">{t.vram} GB</div>
                <div className="text-sm text-muted">total VRAM · {t.cards} card(s)</div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-2"><dt>You would buy</dt><dd className="text-right">{rng(spend.priceLow, spend.priceHigh)}{currency !== 'USD' && <span className="block text-xs text-subtle">{fmtUsdRange(spend.priceLow, spend.priceHigh)} USD</span>}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Est. draw</dt><dd>{t.watts} W</dd></div>
                  <div className="flex justify-between gap-2"><dt>Not priced</dt><dd className="text-right text-subtle">board, CPU, case</dd></div>
                  <RestOfBox money={money} usd={fmtUsd} currency={currency} />
                </dl>
              </div>
              <RunningCost wallW={Math.round(t.watts / ASSUMED_EFFICIENCY)} currency={currency} />
              <ShareExport getLink={buildLink} getSummary={summaryText} getCsv={() => toCsv(exportLines())} />
              <div className="rounded border border-line bg-panel p-4">
                <h2 className={label}>Placement</h2>
                <ol className="space-y-1 text-sm">
                  {placements.map((p, i) => <li key={i}>{p.gpu.name.replace(/\(.*?\)/g, '').replace(/^(NVIDIA|AMD) /, '').trim()} → {p.where}{p.lanes ? ` (x${p.lanes})` : ''}</li>)}
                  {!placements.length && <li className="text-subtle">No cards yet.</li>}
                </ol>
              </div>
              <div className="rounded border border-line bg-panel p-4">
                <h2 className={label}>Checks</h2>
                <ul className="space-y-2 text-sm">
                  {findings.map((f, i) => <li key={i} className={`flex gap-2 ${tone[f.severity]}`}><Icon name={f.severity === 'info' ? 'mdi-information-outline' : 'mdi-alert-circle-outline'} size={18} className="mt-0.5" /><span><span className="font-mono text-xs font-semibold uppercase">{f.severity}</span> {f.message}</span></li>)}
                  {!findings.length && <li className="text-subtle">Add cards to see checks.</li>}
                </ul>
              </div>
            </aside>
          </div>
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
