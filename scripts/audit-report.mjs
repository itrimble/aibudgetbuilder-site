#!/usr/bin/env node
// Turn the link and layout reports into one Markdown body for the weekly issue. Prints nothing and exits 1 when there is nothing to report.
// Usage: node scripts/audit-report.mjs links.json layout.json > body.md
import { readFileSync, existsSync } from 'node:fs'

const read = (p) => (p && existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null)
const links = read(process.argv[2])
const layout = read(process.argv[3])
const out = []

if (links) {
  const bad = links.dead.length + links.moved.length
  out.push(`## Links\n\nChecked ${links.checked}: ${links.ok} fine, ${links.moved.length} moved for good, ${links.dead.length} dead, ${links.blocked} blocked by the site, ${links.unreachable} unreachable from the checker. Hosts that block scripts (eBay, Amazon, Reddit, X, Facebook, LinkedIn) and Hugging Face (checked by the model-link job) are skipped.`)
  if (links.dead.length) out.push('**Dead (404, 410 or no such host).** Find a new source; do not delete the claim:\n' + links.dead.map((r) => `- ${r.url} (${r.files.join(', ')})`).join('\n'))
  if (links.moved.length) out.push('**Moved for good (301 or 308).** Check the new page says the same thing before updating:\n' + links.moved.map((r) => `- ${r.url} -> ${r.to} (${r.files.join(', ')})`).join('\n'))
  if (!bad) out.push('No dead or moved links.')
}
if (layout) {
  out.push(`## Layout and accessibility\n\n${layout.views} page views at ${layout.widths.join(' and ')} px wide: ${layout.problems.length} problem(s).`)
  if (layout.problems.length) out.push(layout.problems.map((p) => `- ${p.kind}, ${p.width}px, ${p.view}: ${p.detail}`).join('\n'))
}
const findings = (links ? links.dead.length + links.moved.length : 0) + (layout ? layout.problems.length : 0)
if (!findings) process.exit(1)
console.log(out.join('\n\n') + '\n\n_Written by the weekly audit workflow. Nothing was changed automatically._\n')
