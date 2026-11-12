// The methodology, as code. docs/METHODOLOGY.md is generated from RULES below, so the document cannot drift from the checks.
// Every rule here exists because of a real way this kind of site gets caught out. Add a rule when a new failure mode appears.

import { PSU_HEADROOM, SYSTEM_BASE_W } from './compat'
import { MAGNET_RE, ageDays, hostOk, repoFromUrl } from './modelLinks'

export type Sev = 'error' | 'warn' | 'info'
export type Finding = { rule: string; severity: Sev; id: string; message: string }
export type Rule = { id: string; severity: Sev; title: string; why: string }

/** Freshness limits in days. Prices move fastest, so they are strictest. */
export const MAX_AGE = { priceWarn: 14, priceError: 30, benchmark: 90, model: 60, spec: 365, rateWarn: 7, rateError: 30 }
/** A model's memory estimate must sit between these multiples of its parameter count in GB (about 0.5 GB per billion at ~4 bit, up to 2 GB per billion at 16 bit). */
export const BYTES_PER_PARAM = { min: 0.45, max: 2.2 }
/** Context and buffer allowance on top of the weights, GB. Estimates may exceed weights by up to this plus 15%. */
export const CONTEXT_ALLOWANCE_GB = 12

const Q_BITS: Record<string, number> = { Q2: 2.9, Q3: 3.9, Q4: 4.85, Q5: 5.7, Q6: 6.6, Q8: 8.5 }
/** Bits per weight stated in a quantisation label, e.g. "Q4_K_M", "IQ2_XS", "~2.4 bit mixed", "fp8". Null if none is stated. */
export function statedBits(label?: string): number | null {
  if (!label) return null
  const bit = /(\d+(?:\.\d+)?)\s*-?\s*bit/i.exec(label)
  if (bit) return Number(bit[1])
  const iq = /\bIQ(\d)/i.exec(label)
  if (iq) return Number(iq[1]) + 0.5
  const q = /\bQ(\d)/i.exec(label)
  if (q && Q_BITS[`Q${q[1]}`]) return Q_BITS[`Q${q[1]}`]
  if (/fp16|bf16/i.test(label)) return 16
  if (/fp8/i.test(label)) return 8
  return null
}
export const ALLOWED_IMAGE_LICENCE = /^(cc|public domain|pd|gfdl|free)/i

export const RULES: Rule[] = [
  { id: 'R01', severity: 'error', title: 'Every record names a source and a check date', why: 'A figure without a source or date cannot be defended or refreshed.' },
  { id: 'R02', severity: 'error', title: 'Check dates are real and not in the future', why: 'A typo in a date hides a stale number or fakes a fresh one.' },
  { id: 'R03', severity: 'error', title: 'Price low is not above price high, and no price is negative', why: 'Inverted ranges silently corrupt $/GB and totals.' },
  { id: 'R04', severity: 'warn', title: `Prices older than ${MAX_AGE.priceWarn} days are stale`, why: 'Used-GPU asking prices moved by more than 2x within a year of the first draft of this site.' },
  { id: 'R05', severity: 'error', title: `Prices older than ${MAX_AGE.priceError} days must not ship`, why: 'A month-old price presented as current is the easiest way to be called wrong.' },
  { id: 'R06', severity: 'error', title: 'Memory size in a card name matches its vram_gb', why: 'The name is what people read; the field is what the maths uses. They must agree.' },
  { id: 'R07', severity: 'error', title: 'Card specs are physically sane', why: 'Zero power, no software stack or an odd slot width means a typo, and breaks the compatibility checks.' },
  { id: 'R08', severity: 'warn', title: 'Specs should cite a primary source, not only a marketplace listing', why: 'Anyone can dispute a spec sourced from a seller. Cite the maker datasheet or manual.' },
  { id: 'R09', severity: 'error', title: 'Board slots are valid PCIe widths and every board has at least one GPU slot', why: 'Lane counts drive the placement and speed warnings.' },
  { id: 'R10', severity: 'error', title: 'Ids are unique within a file and every id referenced elsewhere exists', why: 'A dangling preset or profile silently drops parts from a build.' },
  { id: 'R11', severity: 'error', title: 'A preset reaches the memory its name claims', why: '"128 GB" in a button must equal the sum of its cards.' },
  { id: 'R12', severity: 'error', title: 'Model memory estimates agree with their stated quantisation and parameter count', why: 'The estimate must match params x bits / 8 for the stated quantisation (plus context allowance). With no stated quantisation it must sit within 0.45 to 2.2 GB per billion parameters. Either way, a slip is caught.' },
  { id: 'R13', severity: 'error', title: 'Every model estimate says how it was worked out', why: 'Estimates must be labelled as arithmetic or measured, never left to look like fact.' },
  { id: 'R14', severity: 'warn', title: `Model records older than ${MAX_AGE.model} days are stale`, why: 'The model list turns over every few weeks.' },
  { id: 'R15', severity: 'error', title: 'Benchmark rows have a positive generation speed and a named source', why: 'A speed with no source or a zero is noise.' },
  { id: 'R16', severity: 'warn', title: 'Prompt speed is not slower than generation speed in the same row', why: 'It is almost always the other way round; a reversal usually means swapped columns. Check before trusting.' },
  { id: 'R17', severity: 'warn', title: `Benchmark sets older than ${MAX_AGE.benchmark} days are stale`, why: 'Software updates change speeds by tens of percent.' },
  { id: 'R18', severity: 'error', title: 'Every shipped image has a free licence, an author and a source page', why: 'Photos belong to their owners. No licence record, no image.' },
  { id: 'R19', severity: 'error', title: 'No claim of a commission unless an affiliate ID is configured', why: 'Disclosure must match reality in both directions.' },
  { id: 'R20', severity: 'info', title: 'Source tier is recorded for every record', why: 'Tier A maker documents, B named measurements, C marketplace listings, D forums. Pages show weak tiers plainly.' },
  { id: 'R21', severity: 'error', title: 'Every spec field is either verified against the cited maker source or listed as unverified, never silent', why: 'The fields vram_gb, tdp_w, slot_width, connector_count and cooling must each appear in exactly one of spec_verified or spec_unverified, with a dated maker source. A reader can then see which facts are confirmed.' },
  { id: 'R22', severity: 'error', title: 'The exchange-rate snapshot is complete and dated', why: 'Every supported currency needs a positive rate from the named source, with a publication date, or converted prices are guesses.' },
  { id: 'R23', severity: 'warn', title: `Exchange rates older than ${MAX_AGE.rateWarn} days are stale`, why: 'Rates move daily. A week-old rate can be a few percent off.' },
  { id: 'R24', severity: 'error', title: `Exchange rates older than ${MAX_AGE.rateError} days must not ship`, why: 'A month-old rate shown as current misstates every converted price.' },
  { id: 'R25', severity: 'error', title: 'Budget tiers are positive, unique, ascending, and never state what a budget buys', why: 'What a budget reaches depends on the board, the PC and today\'s prices, so it must be computed, never typed. Tier text may not contain a memory figure.' },
  { id: 'R26', severity: 'error', title: 'Every supported currency formats correctly and USD is present', why: 'A currency that cannot be formatted shows garbage. USD is the base of every stored price.' },
  { id: 'R27', severity: 'warn', title: 'Placeholder prices are listed, never silent', why: 'Adapter and PSU prices that are stand-ins affect every budget result. Records marked placeholder are published as a gap until real models are priced.' },
  { id: 'R28', severity: 'error', title: 'Mixture-of-experts records are internally consistent and every size is a measured file size', why: 'Active parameters must be below total parameters, each quant size must equal its stated bytes, and a quant must weigh a believable amount per billion parameters (0.25 to 1.2 GB). A mislabelled quant or a swapped field is caught here.' },
  { id: 'R29', severity: 'error', title: 'Game-development model records state a licence, a commercial-use verdict and a size, and quote any VRAM they claim', why: 'A solo developer ships what these models make. A non-commercial licence missing from the page would be the costliest silent error on the site, and a VRAM figure with no quote from the model card is a guess.' },
  { id: 'R30', severity: 'error', title: 'Video reports cite the video, the upload date and a timestamp for every claim, and price claims name the upload date they are a snapshot of', why: 'A spoken figure can be checked only at the moment it was said. A price from a video is a snapshot of its upload date, so it must carry that date and a note on what kind of price it was.' },
  { id: 'R31', severity: 'info', title: 'Prices quoted in videos are historical', why: 'Used-GPU prices have moved by more than 2x within a year. A price in a video is shown as what that person paid or saw on the upload date, never as a current price.' },
  { id: 'R32', severity: 'warn', title: 'A preset\'s power supply can carry the preset\'s own cards, alone and added to the cards a sample PC already has', why: 'A shortcut that loads straight into a red power error looks like a recommendation and is not one. Listing the failures keeps the gap visible until a bigger supply, or a second one, is modelled.' },
  { id: 'R33', severity: 'warn', title: 'A held-back card that already has everything the picker needs is a card we are hiding', why: 'Cards stay out of the picker only while a required field or a dated price is missing. A card that has them all, and is still held back, is a gap the site is not admitting to.' },
  { id: 'R34', severity: 'error', title: 'Every model link points at a trusted host and every Hugging Face repo it names has a dated link check', why: 'People download multi-gigabyte files from these links. A link to a look-alike host, or to a repo nobody has checked, is the easiest way to send a reader to the wrong file.' },
  { id: 'R35', severity: 'warn', title: 'Model links are checked within 30 days and none is moved, missing, disabled or unreachable', why: 'Repos get renamed, gated and deleted. A stale or broken link is a small failure that looks like a broken promise, so the snapshot has a shelf life and a moved repo shows up as a warning to fix.' },
  { id: 'R36', severity: 'error', title: 'A torrent is listed only with a valid infohash, the maker named, and the maker\'s own page that publishes it', why: 'A magnet link guarantees consistent bytes, not authentic ones. The site lists a torrent only when the maker itself published it, so a reader never gets a swarm link from a stranger.' },
  { id: 'R37', severity: 'warn', title: 'A price quoted in a card note must sit near the card\'s range, or the note must say why it does not', why: 'A reader who sees a note quoting $1,500 beside a range of $489 to $555 stops trusting every number. The range and its note must agree or explain the gap.' },
  { id: 'R38', severity: 'error', title: 'Card notes carry no formatting slips or claims that contradict the price rule', why: 'Stray punctuation such as "$138,.", a price with no dollar sign, or the old claim that a low end is a 12-month average makes the data look unfinished or states something the methodology forbids.' },
  { id: 'R40', severity: 'error', title: 'A memory-bandwidth figure carries a plausible value, an https source, a check date and a stated basis', why: 'Speed estimates are built on bandwidth, so an unsourced or mistyped figure would put a wrong speed on the page.' },
  { id: 'R41', severity: 'warn', title: 'A bandwidth figure that is not read from the maker\'s own page is listed as a gap', why: 'A figure seen only as a search excerpt or on a third-party page may be right, but the speed estimate that uses it must say so.' },
  { id: 'R39', severity: 'warn', title: 'Card notes are written in the site\'s voice, not first person', why: 'Phrases like "my sum" or "I have not benchmarked" read like a working log, not a published page. Say "our sum" or "we have not".' },
]
const ruleOf = (id: string) => RULES.find((r) => r.id === id)!

export type Tier = 'A' | 'B' | 'C' | 'D' | 'unknown'
const HOSTS: [RegExp, Tier][] = [
  [/(^|\.)(nvidia|amd|intel|msi|hp|asus|asrock|supermicro|pcisig|corsair)\.com$|(^|\.)(download-2\.msi|www\.pcisig)\./, 'A'],
  [/^file:/, 'A'],
  [/(lon\.tv|countryboycomputersbg\.com|tymscar\.com|tomshardware\.com|huggingface\.co|github\.com|wikimedia\.org|iconify\.design)/, 'B'],
  [/(ebay\.com|amazon\.com|newegg\.com|bestvaluegpu\.com)/, 'C'],
  [/(reddit\.com|youtube\.com|servethehome\.com|forum|(^|\.)(x|twitter)\.com$)/, 'D'],
]
export function tier(url?: string): Tier {
  if (!url) return 'unknown'
  if (url.startsWith('file:')) return 'A'
  let host = ''
  try { host = new URL(url).host } catch { return 'unknown' }
  return HOSTS.find(([re]) => re.test(host) || re.test(url))?.[1] ?? 'unknown'
}

type Rec = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type AuditInput = {
  gpus: Rec[]; boards: Rec[]; adapters: Rec[]; psus: Rec[]
  tasks: { task: string; models: Rec[] }[]
  benchmarks: { source_url?: string; checked_on?: string; rows: Rec[]; system_comparisons?: Rec[] }
  images: Record<string, Rec>; imageFiles: string[]
  pcs: Rec[]; presets: Rec[]
  moe?: Rec[]; gamedev?: Rec[]
  videos?: { videos: Rec[] }
  drives?: Rec[]
  ram?: Rec[]
  cases?: Rec[]
  modelLinks?: { checked_on: string; repos: Record<string, Rec> }
  torrents?: Rec[]
  heldGpus?: Rec[]
  rates: { base?: string; published?: string; source_url?: string; rates?: Record<string, number> }
  currencies: { code: string; locale: string }[]
  budgets: { id: string; name: string; usd: number; blurb?: string }[]
  affiliate: { ebay: { campid: string }; amazon: { tag: string } }; disclosureText: string
  today?: string
}

const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 864e5
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

export function auditAll(d: AuditInput): Finding[] {
  const today = d.today ?? new Date().toLocaleDateString('en-CA')
  const out: Finding[] = []
  const add = (rule: string, id: string, message: string) => out.push({ rule, severity: ruleOf(rule).severity, id, message })

  const sourced: [string, Rec[]][] = [['gpu', d.gpus], ['board', d.boards], ['adapter', d.adapters], ['psu', d.psus], ['drive', d.drives ?? []], ['ram', d.ram ?? []], ['case', d.cases ?? []]]
  for (const [kind, list] of sourced) {
    const seen = new Set<string>()
    for (const r of list) {
      const id = `${kind}:${r.id}`
      if (seen.has(r.id)) add('R10', id, 'Duplicate id.')
      seen.add(r.id)
      if (r.id === 'owned') continue
      if (!r.source_url || !r.checked_on) add('R01', id, 'Missing source_url or checked_on.')
      else if (!isDate(r.checked_on) || Date.parse(r.checked_on) > Date.parse(today)) add('R02', id, `Bad or future date "${r.checked_on}".`)
      else {
        add('R20', id, `Source tier ${tier(r.source_url)}.`)
        const age = days(r.checked_on, today)
        const priced = r.price_high != null || r.price != null
        if (priced && age > MAX_AGE.priceError) add('R05', id, `Price checked ${Math.round(age)} days ago.`)
        else if (priced && age > MAX_AGE.priceWarn) add('R04', id, `Price checked ${Math.round(age)} days ago.`)
      }
      if (r.price_low != null && r.price_high != null && (r.price_low < 0 || r.price_high < 0 || r.price_low > r.price_high)) add('R03', id, `Price range ${r.price_low} to ${r.price_high} is invalid.`)
      if (r.price != null && r.price < 0) add('R03', id, 'Negative price.')
    }
  }

  for (const g of d.gpus) {
    const id = `gpu:${g.id}`
    const m = /(\d+)\s?GB/i.exec(g.name ?? '')
    if (m && Number(m[1]) !== g.vram_gb) add('R06', id, `Name says ${m[1]} GB but vram_gb is ${g.vram_gb}.`)
    const stacks = g.stacks ?? {}
    if (!(g.vram_gb > 0) || !(g.tdp_w > 0) || !(g.slot_width >= 1 && g.slot_width <= 4 && g.slot_width % 0.5 === 0) || !(g.connector_count >= 0) || !Object.values(stacks).some(Boolean))
      add('R07', id, 'Implausible spec (vram, tdp, slot width, connectors or software stack).')
    if (tier(g.spec_source_url ?? '') !== 'A' && tier(g.spec_source_url ?? '') !== 'B')
      add('R08', id, 'No primary spec source (spec_source_url). Currently relies on the price listing.')
    else {
      const FIELDS = ['vram_gb', 'tdp_w', 'slot_width', 'connector_count', 'cooling']
      const ver: string[] = g.spec_verified ?? [], unv: string[] = g.spec_unverified ?? []
      const missing = FIELDS.filter((f) => !ver.includes(f) && !unv.includes(f))
      const both = [...FIELDS, 'arch'].filter((f) => ver.includes(f) && unv.includes(f))
      const OPTIONAL = ['arch'] // listed when a researcher checked it; not required
      const unknown = [...ver, ...unv].filter((f) => !FIELDS.includes(f) && !OPTIONAL.includes(f))
      if (missing.length || both.length || unknown.length) add('R21', id, `Spec fields must be in exactly one list. Missing: ${missing.join(', ') || 'none'}; in both: ${both.join(', ') || 'none'}; unknown: ${unknown.join(', ') || 'none'}.`)
      if (!isDate(g.spec_checked_on) || days(g.spec_checked_on, today) > MAX_AGE.spec) add('R21', id, 'spec_checked_on is missing, invalid or older than a year.')
    }
  }

  for (const b of d.boards) {
    const id = `board:${b.id}`
    if (!b.gpu_slots?.length || b.gpu_slots.some((s: Rec) => ![1, 2, 4, 8, 16].includes(s.lanes) || s.gen < 2 || s.gen > 5)) add('R09', id, 'Missing GPU slots or invalid lane width or generation.')
  }

  // references
  const ids = (l: Rec[]) => new Set(l.map((x) => x.id))
  const gpuIds = ids(d.gpus), boardIds = ids(d.boards), adIds = ids(d.adapters), psuIds = ids(d.psus)
  for (const p of d.pcs) {
    if (p.board && !boardIds.has(p.board)) add('R10', `pc:${p.id}`, `Unknown board ${p.board}.`)
    for (const g of p.owned_gpus ?? []) if (!gpuIds.has(g)) add('R10', `pc:${p.id}`, `Unknown card ${g}.`)
  }
  for (const p of d.presets) {
    const id = `preset:${p.name}`
    let vram = 0
    for (const [gid, n] of Object.entries<number>(p.counts)) {
      const g = d.gpus.find((x) => x.id === gid)
      if (!g) add('R10', id, `Unknown card ${gid}.`)
      else vram += g.vram_gb * n
    }
    for (const a of p.adapters ?? []) if (!adIds.has(a)) add('R10', id, `Unknown adapter ${a}.`)
    if (!psuIds.has(p.psu)) add('R10', id, `Unknown PSU ${p.psu}.`)
    const claim = [...String(p.name).matchAll(/(\d+) GB/g)].pop()
    if (claim && Number(claim[1]) !== vram) add('R11', id, `Name claims ${claim[1]} GB but the cards add up to ${vram} GB.`)
    const psuOf = d.psus.find((x) => x.id === p.psu)
    if (psuOf) {
      // A preset is applied on top of the PC the visitor picked, so check it bare and again with each PC's own cards.
      const variants: { label: string; owned: string[] }[] = [{ label: '', owned: [] }]
      for (const pc of d.pcs ?? []) if (pc.owned_gpus?.length) variants.push({ label: ` on "${pc.name}" with its own ${pc.owned_gpus.length} card(s) kept (the builder's keep-your-card box clears this)`, owned: pc.owned_gpus })
      for (const v of variants) {
        let watts = SYSTEM_BASE_W, connectors = 0
        const count = (gid: string, n: number) => { const g = d.gpus.find((x) => x.id === gid); if (g) { watts += g.tdp_w * n; connectors += g.connector_count * n } }
        for (const [gid, n] of Object.entries<number>(p.counts)) count(gid, n)
        for (const gid of v.owned) count(gid, 1)
        if (watts * PSU_HEADROOM > psuOf.watts) add('R32', id, `Needs about ${watts} W x ${PSU_HEADROOM} headroom = ${Math.round(watts * PSU_HEADROOM)} W${v.label}; ${psuOf.name} is ${psuOf.watts} W.`)
        if (connectors > psuOf.pcie_8pin) add('R32', id, `Needs ${connectors} 8-pin connectors${v.label}; ${psuOf.name} has ${psuOf.pcie_8pin}.`)
      }
    }
  }

  // models
  for (const grp of d.tasks) for (const m of grp.models) {
    const id = `model:${m.name}`
    const est = m.vram_gb_estimate
    if (m.params_b && est) {
      const bits = statedBits(m.quant_suggested)
      if (bits) {
        const weights = (m.params_b * bits) / 8
        if (est < weights * 0.95 || est > weights * 1.15 + CONTEXT_ALLOWANCE_GB)
          add('R12', id, `${est} GB does not match ${m.params_b}B at ${bits} bit (weights about ${Math.round(weights)} GB, allowing context up to ${Math.round(weights * 1.15 + CONTEXT_ALLOWANCE_GB)} GB).`)
      } else if (est < m.params_b * BYTES_PER_PARAM.min || est > m.params_b * BYTES_PER_PARAM.max + 8)
        add('R12', id, `${est} GB for ${m.params_b}B parameters is outside ${BYTES_PER_PARAM.min} to ${BYTES_PER_PARAM.max} GB per billion, and no quantisation is stated.`)
    }
    if (!m.vram_basis || !/arithmetic|measured/i.test(m.vram_basis)) add('R13', id, 'vram_basis must say "arithmetic" or "measured".')
    if (!m.source_url || !m.checked_on) add('R01', id, 'Missing source or date.')
    else if (days(m.checked_on, today) > MAX_AGE.model) add('R14', id, `Checked ${Math.round(days(m.checked_on, today))} days ago.`)
  }

  // benchmarks
  const bm = d.benchmarks
  if (!bm.source_url || !bm.checked_on) add('R01', 'benchmarks', 'Missing source or date.')
  else if (days(bm.checked_on, today) > MAX_AGE.benchmark) add('R17', 'benchmarks', `Checked ${Math.round(days(bm.checked_on, today))} days ago.`)
  for (const r of bm.rows) {
    const id = `bench:${r.gpu} / ${r.model}`
    if (!(r.tg128 > 0) || !(r.source || bm.source_url)) add('R15', id, 'Needs tg128 > 0 and a source.')
    if (r.pp512 && r.tg128 && r.pp512 < r.tg128) add('R16', id, `Prompt ${r.pp512} slower than generation ${r.tg128}.`)
  }
  for (const c of bm.system_comparisons ?? []) {
    const id = `bench-system:${c.id ?? c.title ?? '?'}`
    if (!c.source_url || !isDate(c.checked_on)) add('R01', id, 'Missing source or date.')
    else if (Date.parse(c.checked_on) > Date.parse(today)) add('R02', id, `Bad or future date "${c.checked_on}".`)
    else if (days(c.checked_on, today) > MAX_AGE.benchmark) add('R17', id, `Checked ${Math.round(days(c.checked_on, today))} days ago.`)
    if (!c.author || !c.method_caveats?.length) add('R15', id, 'Needs an author and method caveats.')
    const systems: Rec[] = c.systems ?? []
    if (systems.length < 2) add('R15', id, 'Needs at least two systems.')
    for (const s of systems) if (!s.name || !(s.units > 0) || !(s.price_usd > 0)) add('R15', id, 'Each system needs a name, a unit count and a positive price.')
    const measures: Rec[] = c.measures ?? []
    if (!measures.length) add('R15', id, 'Needs at least one measured speed.')
    for (const m of measures) {
      const values: number[] = m.values ?? []
      if (values.length !== systems.length || values.some((v) => !(v > 0))) add('R15', id, `${m.measure ?? 'measure'}: each system needs a positive speed.`)
    }
    const caveatText = (c.method_caveats ?? []).join(' ')
    if (c.source_url && tier(c.source_url) === 'D' && !/not verified|reader report/i.test(caveatText)) add('R15', id, 'A tier D source must say it is a reader report, not verified.')
  }

  // images
  for (const [id, m] of Object.entries(d.images)) {
    if (m.status !== 'ok') continue
    if (!m.license || !ALLOWED_IMAGE_LICENCE.test(m.license) || !m.author || !m.source) add('R18', `image:${id}`, 'Missing free licence, author or source page.')
    if (!d.imageFiles.includes(`${id}.webp`)) add('R18', `image:${id}`, 'Manifest says ok but the file is missing.')
  }

  // exchange rates
  const rt = d.rates
  if (!rt || rt.base !== 'EUR' || !isDate(rt.published) || !rt.source_url || !((rt.rates?.USD ?? 0) > 0)) add('R22', 'rates', 'Rate snapshot is missing its base, date, source or USD rate.')
  else {
    for (const c of d.currencies) { const v = rt.rates?.[c.code]; if (!(typeof v === 'number' && v > 0 && Number.isFinite(v))) add('R22', `currency:${c.code}`, 'No valid rate.') }
    const age = days(rt.published!, today)
    if (age > MAX_AGE.rateError) add('R24', 'rates', `Rates published ${Math.round(age)} days ago.`)
    else if (age > MAX_AGE.rateWarn) add('R23', 'rates', `Rates published ${Math.round(age)} days ago.`)
  }
  // currencies
  const codes = new Set<string>()
  for (const c of d.currencies) {
    if (codes.has(c.code)) add('R26', `currency:${c.code}`, 'Duplicate currency.')
    codes.add(c.code)
    try { new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code }).format(1) } catch { add('R26', `currency:${c.code}`, `Cannot format with locale ${c.locale}.`) }
  }
  if (!codes.has('USD')) add('R26', 'currencies', 'USD must be a supported currency.')
  // budget tiers
  d.budgets.forEach((b, i) => {
    if (!(b.usd > 0) || (i > 0 && b.usd <= d.budgets[i - 1].usd)) add('R25', `budget:${b.id}`, `Tier ${b.name} (${b.usd}) is not above the previous tier.`)
    if (d.budgets.findIndex((x) => x.id === b.id) !== i) add('R25', `budget:${b.id}`, 'Duplicate tier id.')
    if (/\d+\s*\+?\s*(GB|TB)\b/i.test(b.blurb ?? '')) add('R25', `budget:${b.id}`, 'Tier text states a memory figure; the recommender computes that.')
  })
  // placeholders
  for (const r of [...d.adapters, ...d.psus]) if (r.placeholder) add('R27', `${r.id}`, 'Placeholder price. Replace with a real, sourced model before relying on budget results.')

  // mixture-of-experts and game-development models
  for (const m of d.moe ?? []) {
    const id = `moe:${m.id}`
    if (!m.source_url || !isDate(m.checked_on)) add('R28', id, 'Missing source_url or checked_on.')
    else if (days(m.checked_on, today) > MAX_AGE.model) add('R14', id, `Checked ${Math.round(days(m.checked_on, today))} days ago.`)
    if (!(m.total_params_b > 0)) add('R28', id, 'total_params_b must be positive.')
    if (m.active_params_b != null && !(m.active_params_b > 0 && m.active_params_b < m.total_params_b)) add('R28', id, `active_params_b ${m.active_params_b} must be positive and below total ${m.total_params_b}.`)
    for (const q of m.gguf?.quants ?? []) {
      if (!(q.bytes > 0) || Math.abs(q.bytes / 1e9 - q.gb) > Math.max(0.02, q.gb * 0.005)) add('R28', id, `${q.quant}: ${q.gb} GB does not match ${q.bytes} bytes.`)
      const per = q.gb / m.total_params_b
      if (!(per >= 0.25 && per <= 1.2)) add('R28', id, `${q.quant}: ${per.toFixed(2)} GB per billion parameters is outside 0.25 to 1.2.`)
    }
  }
  for (const m of d.gamedev ?? []) {
    const id = `gamedev:${m.id}`
    if (!m.source_url || !isDate(m.checked_on)) add('R29', id, 'Missing source_url or checked_on.')
    else if (days(m.checked_on, today) > MAX_AGE.model) add('R14', id, `Checked ${Math.round(days(m.checked_on, today))} days ago.`)
    if (!m.licence) add('R29', id, 'No licence.')
    if (!['yes', 'no', 'unclear'].includes(m.commercial_use)) add('R29', id, 'commercial_use must be yes, no or unclear.')
    if (!(m.weights_gb > 0)) add('R29', id, 'weights_gb must be positive.')
    if (m.stated_vram_gb != null && !m.stated_vram_quote) add('R29', id, 'A stated VRAM figure needs the quote it came from.')
  }

  // video reports
  const CLAIM_KINDS = ['benchmark', 'software', 'power', 'price', 'compat']
  for (const v of d.videos?.videos ?? []) {
    const vid = `video:${v.id}`
    if (!/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url ?? '') || !v.url.endsWith(v.id)) add('R30', vid, 'url must be the youtube.com watch link for this id.')
    if (!isDate(v.uploaded) || Date.parse(v.uploaded) > Date.parse(today)) add('R30', vid, `Bad or future upload date "${v.uploaded}".`)
    if (!isDate(v.transcript_checked_on) || Date.parse(v.transcript_checked_on) > Date.parse(today)) add('R30', vid, 'transcript_checked_on is missing, invalid or in the future.')
    if (!v.claims?.length) add('R30', vid, 'No claims recorded.')
    for (const c of v.claims ?? []) {
      const cid = `${vid}@${c.at}`
      if (!/^\d{2}:[0-5]\d:[0-5]\d$/.test(c.at ?? '')) add('R30', cid, 'Claim needs a hh:mm:ss timestamp.')
      if (!c.text || !CLAIM_KINDS.includes(c.kind)) add('R30', cid, 'Claim needs text and a known kind.')
      if (c.kind === 'benchmark' && c.tg != null && !(c.tg > 0)) add('R30', cid, 'tg must be positive when given.')
      if (c.kind === 'price') {
        if (!(c.price_usd > 0) || !c.gpu || !c.price_note) add('R30', cid, 'Price claim needs gpu, price_usd > 0 and a price_note saying what kind of price it was.')
        if (!d.gpus.some((g) => g.id === c.gpu_id)) add('R10', cid, `Unknown card ${c.gpu_id}.`)
        if (isDate(v.uploaded)) add('R31', cid, `${c.gpu}: $${c.price_usd} as of ${v.uploaded} (${Math.round(days(v.uploaded, today))} days ago). Historical only.`)
      }
    }
  }

  // held-back cards that are in fact complete
  for (const h of d.heldGpus ?? []) {
    const missing = ['vram_gb', 'tdp_w', 'slot_width', 'connector_count', 'cooling', 'price_low', 'price_high'].filter((k) => h[k] == null || h[k] === '')
    if (!missing.length) add('R33', `held-gpu:${h.id}`, 'Has every required field and a price but is still in gpus-incomplete.json. Promote it or say why not.')
  }

  // affiliate honesty
  const active = Boolean(d.affiliate.ebay.campid || d.affiliate.amazon.tag)
  if (!active && /earn a commission|Amazon Associate/i.test(d.disclosureText)) add('R19', 'disclosure', 'Claims a commission while no affiliate ID is set.')
  if (active && !/commission/i.test(d.disclosureText)) add('R19', 'disclosure', 'Affiliate ID set but the disclosure does not mention a commission.')
  // model links: trusted hosts, a dated check per repo, and torrents only from the maker
  if (d.modelLinks) {
    const repoIds = new Set<string>()
    const seen = (label: string, url?: string) => {
      if (!url) return
      if (!hostOk(url)) add('R34', label, `Link host is not on the trusted list: ${url}`)
      const r = repoFromUrl(url)
      if (r) repoIds.add(r)
    }
    for (const g of d.tasks) for (const m of g.models) seen(`model:${m.name}`, m.source_url)
    for (const m of d.moe ?? []) { seen(`moe:${m.id}`, m.source_url); if (m.gguf?.repo) repoIds.add(m.gguf.repo) }
    for (const m of d.gamedev ?? []) seen(`gamedev:${m.id}`, m.source_url)
    const byLower = new Map(Object.entries(d.modelLinks.repos).map(([k, v]) => [k.toLowerCase(), v]))
    for (const r of [...repoIds].sort()) {
      const rec = byLower.get(r.toLowerCase())
      if (!rec) { add('R34', `repo:${r}`, 'No link check on file. Run node scripts/check-model-links.mjs.'); continue }
      if (rec.status !== 'ok') add('R35', `repo:${r}`, `Last link check said ${rec.status}.`)
      if (rec.moved_to) add('R35', `repo:${r}`, `Repo moved to ${rec.moved_to}; update the link.`)
      if (rec.disabled) add('R35', `repo:${r}`, 'Hugging Face has disabled this repo.')
    }
    if (!isDate(d.modelLinks.checked_on)) add('R35', 'model-links', 'checked_on is missing or invalid.')
    else if (ageDays(d.modelLinks.checked_on, new Date(today + 'T00:00:00Z')) > 30) add('R35', 'model-links', `The link check is ${Math.round(ageDays(d.modelLinks.checked_on, new Date(today + 'T00:00:00Z')))} days old; run node scripts/check-model-links.mjs.`)
  }
  for (const g of d.gpus as unknown as { id: string; note?: string; price_low?: number; price_high?: number }[]) {
    const note = g.note ?? ''
    const id = `gpu:${g.id}`
    if (/,\.|\$\d+,\.|low end is the tracker'?s? (12-month|all-time) average|\((\d[\d,]*)\), not an average/.test(note)) add('R38', id, 'The note has a formatting slip or a price-basis claim the methodology forbids.')
    if (/\b(I|my|me)\b/.test(note)) add('R39', id, 'The note uses first person.')
    const bw = g as unknown as { bandwidth_gbs?: number; bandwidth_source_url?: string; bandwidth_checked_on?: string; bandwidth_basis?: string }
    if (bw.bandwidth_gbs !== undefined) {
      if (!(bw.bandwidth_gbs > 0 && bw.bandwidth_gbs < 4000) || !/^https:\/\//.test(bw.bandwidth_source_url ?? '') || !isDate(bw.bandwidth_checked_on) || !bw.bandwidth_basis) add('R40', id, 'A bandwidth figure needs a plausible GB/s value, an https source, a check date and a stated basis.')
      else if (bw.bandwidth_basis !== 'maker page, read') add('R41', id, `Bandwidth rests on weaker evidence: ${bw.bandwidth_basis}.`)
    }
    const lo = g.price_low ?? 0, hi = g.price_high ?? 0
    if (hi > 0 && !/Why the range|outlier|ignored|not part of the used range|not a price you can pay|listings from /i.test(note)) {
      const amounts = [...note.matchAll(/\$([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n >= 100)
      const odd = amounts.filter((n) => n > hi * 1.6 || n < lo * 0.5)
      if (odd.length) add('R37', id, `The note quotes ${odd.map((n) => '$' + n).join(', ')} but the range is $${lo} to $${hi}, and the note does not say why.`)
    }
  }
  const moeIds = new Set((d.moe ?? []).map((m) => m.id))
  for (const t of d.torrents ?? []) {
    const id = `torrent:${t.model}`
    const hash = /btih:([0-9a-f]{40})/.exec(t.magnet ?? '')?.[1]
    if (!moeIds.has(t.model)) add('R36', id, 'Names a model id the site does not list.')
    if (!/^[0-9a-f]{40}$/.test(t.infohash ?? '') || !MAGNET_RE.test(t.magnet ?? '') || hash !== t.infohash) add('R36', id, 'The infohash is not 40 hex characters or does not match the magnet link.')
    if (!t.published_by) add('R36', id, 'No maker named as the publisher.')
    if (!t.published_at || !hostOk(t.published_at)) add('R36', id, 'published_at must be a page on a trusted host where the maker publishes the torrent.')
    if (!isDate(t.checked_on) || Date.parse(t.checked_on) > Date.parse(today)) add('R36', id, 'checked_on is missing, invalid or in the future.')
  }
  return out
}

export const summarise = (f: Finding[]) => ({ errors: f.filter((x) => x.severity === 'error').length, warns: f.filter((x) => x.severity === 'warn').length, infos: f.filter((x) => x.severity === 'info').length })
