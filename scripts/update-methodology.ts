// Regenerates the self-updating parts of docs/METHODOLOGY.md from the live data and the rule registry.
//   npm run methodology          rewrite the generated sections
//   npm run methodology:check    exit 1 if the doc is out of date or the audit has errors (for CI or a pre-ship gate)
//   npm run audit                print findings only
// Run with vite-node so it can import the same TypeScript and JSON the site uses.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { MAX_AGE, RULES, BYTES_PER_PARAM, CONTEXT_ALLOWANCE_GB, auditAll, summarise, tier } from '../src/lib/audit'
import { liveAuditInput } from '../src/lib/auditData'
import { OVERHEAD_GB } from '../src/lib/constants'
import { PSU_HEADROOM, SYSTEM_BASE_W } from '../src/lib/compat'

const DOC = new URL('../docs/METHODOLOGY.md', import.meta.url).pathname
const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--print') ? 'print' : 'write'
const today = new Date().toLocaleDateString('en-CA') // local date, YYYY-MM-DD

const input = liveAuditInput(today)
const findings = auditAll(input)
const sum = summarise(findings)

const ruleHash = (r: (typeof RULES)[number]) => createHash('sha256').update(JSON.stringify([r.title, r.severity, r.why])).digest('hex').slice(0, 8)
const rulesNow = RULES.map((r) => `${r.id}:${ruleHash(r)}`)

const print = () => {
  for (const f of findings.filter((x) => x.severity !== 'info')) console.log(`${f.severity.toUpperCase().padEnd(5)} ${f.rule} ${f.id}: ${f.message}`)
  console.log(`\n${sum.errors} errors, ${sum.warns} warnings, ${sum.infos} info`)
}
if (mode === 'print') { print(); process.exit(sum.errors ? 1 : 0) }

// ---- data status
const sourced = [...input.gpus, ...input.boards, ...input.adapters, ...input.psus].filter((r) => r.id !== 'owned')
const dates = sourced.map((r) => r.checked_on as string).filter(Boolean).sort()
const tiers: Record<string, number> = {}
for (const r of sourced) tiers[tier(r.source_url)] = (tiers[tier(r.source_url)] ?? 0) + 1
const imgs = Object.values(input.images)
const modelCount = input.tasks.reduce((n, t) => n + t.models.length, 0)
const oldest = dates[0], newest = dates[dates.length - 1]
const nextDue = oldest ? new Date(Date.parse(oldest) + MAX_AGE.priceWarn * 864e5).toISOString().slice(0, 10) : 'unknown'

const systemComparisons = input.benchmarks.system_comparisons ?? []
const systemNote = systemComparisons.length
  ? ` System comparisons: ${systemComparisons.length} (${systemComparisons.map((c) => c.source_url).join(', ')}).`
  : ''

const status = `Generated ${today} by \`npm run methodology\`. Do not edit between the markers: edit the rules in \`src/lib/audit.ts\` or the data, then regenerate.

| What | Count | Notes |
|-|-|-|
| Cards | ${input.gpus.length} | ${input.gpus.filter((g) => g.owned_only).length} owned-only example, not for sale |
| Boards | ${input.boards.length} | |
| Adapters, PSUs | ${input.adapters.length}, ${input.psus.length} | Placeholders until real models are chosen |
| Models | ${modelCount} in ${input.tasks.length} task groups | Memory figures are arithmetic unless a record says measured |
| Benchmark rows | ${input.benchmarks.rows.length} | GPU rows: ${input.benchmarks.source_url ?? 'none'}.${systemNote} |
| Images | ${imgs.filter((i) => i.status === 'ok').length} free-licence, ${imgs.filter((i) => i.status === 'missing').length} missing | Missing parts show an icon tile |
| Presets, PC profiles | ${input.presets.length}, ${input.pcs.length} | |

**Source tiers across priced records:** ${Object.entries(tiers).sort().map(([k, v]) => `${k}: ${v}`).join(', ')}. Oldest check date ${oldest}, newest ${newest}. Next price refresh due by **${nextDue}** (${MAX_AGE.priceWarn}-day rule).

**Card specs checked against the maker (field level):** ${input.gpus.reduce((n, g) => n + (g.spec_verified?.length ?? 0), 0)} verified, ${input.gpus.reduce((n, g) => n + (g.spec_unverified?.length ?? 0), 0)} not verified, across ${input.gpus.length} cards. Each card shows its own list.

**Audit result:** ${sum.errors} errors, ${sum.warns} warnings, ${sum.infos} info records. ${sum.errors ? '**Do not ship while there are errors.**' : 'No errors, so the data may ship. Warnings are published below.'}

### Open warnings (known gaps, shown honestly)

${findings.filter((f) => f.severity === 'warn').map((f) => `- **${f.rule}** \`${f.id}\`: ${f.message}`).join('\n') || '- None.'}

### Numbers the site uses

| Constant | Value | Where |
|-|-|-|
| Price warning / hard limit | ${MAX_AGE.priceWarn} / ${MAX_AGE.priceError} days | \`MAX_AGE\` in audit.ts |
| Benchmark / model staleness | ${MAX_AGE.benchmark} / ${MAX_AGE.model} days | \`MAX_AGE\` |
| Memory per card for context and buffers | ${OVERHEAD_GB} GB (an assumption, not measured) | \`OVERHEAD_GB\` in constants.ts |
| PSU headroom, base system draw | x${PSU_HEADROOM}, ${SYSTEM_BASE_W} W | compat.ts |
| Plausible GB per billion parameters (no stated quantisation) | ${BYTES_PER_PARAM.min} to ${BYTES_PER_PARAM.max} | audit.ts |
| Context allowance on a quantised estimate | up to ${CONTEXT_ALLOWANCE_GB} GB + 15% | audit.ts |`

const rules = `Each rule is a check that runs in \`npm test\`. A rule that fires on bad data is itself tested (\`audit.test.ts\`).

| Id | Severity | Rule | Why it exists |
|-|-|-|-|
${RULES.map((r) => `| ${r.id} | ${r.severity} | ${r.title} | ${r.why} |`).join('\n')}`

// ---- rule history (auto-appended when a rule is added, removed or reworded)
const markers = (name: string) => [`<!-- AUTO:${name}:START -->`, `<!-- AUTO:${name}:END -->`] as const
const get = (doc: string, name: string) => { const [a, b] = markers(name); const i = doc.indexOf(a), j = doc.indexOf(b); if (i < 0 || j < 0) throw new Error(`markers ${name} missing in METHODOLOGY.md`); return [i + a.length, j] as const }

let doc = readFileSync(DOC, 'utf8')
const [hs, he] = get(doc, 'HISTORY')
const history = doc.slice(hs, he)
const prevHash = /<!-- rules: ([^>]*) -->/.exec(history)?.[1]?.split(',') ?? []
const diff = () => {
  const prev = new Map(prevHash.map((p) => p.split(':') as [string, string]))
  const now = new Map(rulesNow.map((p) => p.split(':') as [string, string]))
  const added = [...now.keys()].filter((k) => !prev.has(k)), removed = [...prev.keys()].filter((k) => !now.has(k))
  const changed = [...now.keys()].filter((k) => prev.has(k) && prev.get(k) !== now.get(k))
  return { added, removed, changed }
}
const d = diff()
const rulesChanged = d.added.length + d.removed.length + d.changed.length > 0
let newHistory = history
if (rulesChanged) {
  const line = `| ${today} | ${[d.added.length ? `added ${d.added.join(', ')}` : '', d.changed.length ? `reworded ${d.changed.join(', ')}` : '', d.removed.length ? `removed ${d.removed.join(', ')}` : ''].filter(Boolean).join('; ')} | _add the reason in the change log below_ |`
  newHistory = history.replace(/<!-- rules: [^>]* -->/, '').replace(/\n+$/, '') + `\n${line}\n<!-- rules: ${rulesNow.join(',')} -->\n`
}

const replace = (name: string, body: string) => { const [s, e] = get(doc, name); doc = doc.slice(0, s) + `\n${body}\n` + doc.slice(e) }
replace('STATUS', status)
replace('RULES', rules)
const [hs2, he2] = get(doc, 'HISTORY'); doc = doc.slice(0, hs2) + newHistory + doc.slice(he2)

if (mode === 'check') {
  const stale = readFileSync(DOC, 'utf8').replace(/Generated \d{4}-\d{2}-\d{2}/, '') !== doc.replace(/Generated \d{4}-\d{2}-\d{2}/, '')
  if (sum.errors) { print(); console.error('FAIL: audit has errors'); process.exit(1) }
  if (stale) { console.error('FAIL: docs/METHODOLOGY.md is out of date. Run `npm run methodology`, then add the reason for any rule change to the change log.'); process.exit(1) }
  console.log(`OK: methodology current, ${sum.errors} errors, ${sum.warns} warnings`)
  process.exit(0)
}
writeFileSync(DOC, doc)
print()
console.log(rulesChanged ? `\nRules changed (${JSON.stringify(d)}): history row added. Fill in the reason in the change log.` : '\nRules unchanged.')
console.log(`Wrote ${DOC}`)
