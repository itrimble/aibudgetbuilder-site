#!/usr/bin/env node
// Refresh src/data/models/links.json: for every Hugging Face repo the site links to, ask Hugging Face's public API
// whether it still exists, whether it moved, whether it is gated, its licence, what file types it holds and when it last changed.
// The site makes no requests from the browser; this script writes a dated snapshot that the audit then checks.
// Usage: node scripts/check-model-links.mjs     (run at least monthly; the audit warns after 30 days)
// It reads only the public model-metadata endpoint, one request per repo, sequentially with a short pause. No login, no downloads of weights.
import { readFileSync, writeFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const OUT = new URL('../src/data/models/links.json', import.meta.url).pathname
const repos = new Set()
const add = (u) => { const m = /^https:\/\/huggingface\.co\/([^/]+\/[^/?#]+)/.exec(u ?? ''); if (m) repos.add(m[1]) }
for (const g of read('../src/data/models/tasks.json').tasks) for (const m of g.models) add(m.source_url)
for (const m of read('../src/data/models/moe.json')) { add(m.source_url); if (m.gguf?.repo) repos.add(m.gguf.repo) }
for (const m of read('../src/data/models/gamedev.json')) add(m.source_url)

const today = new Date().toLocaleDateString('en-CA')
const out = { checked_on: today, source: 'https://huggingface.co/api/models/{repo} (Hugging Face public model metadata)', repos: {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0, bad = 0

for (const repo of [...repos].sort()) {
  const rec = { checked_on: today }
  try {
    const res = await fetch(`https://huggingface.co/api/models/${repo}`, { headers: { 'User-Agent': 'AIBudgetBuild/0.1 (link check; iantrimble@remnantsecurity.com)' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
    if (res.status === 200) {
      const d = await res.json()
      const files = (d.siblings ?? []).map((s) => s.rfilename.toLowerCase())
      rec.status = 'ok'
      rec.canonical = d.id
      if (d.id && d.id.toLowerCase() !== repo.toLowerCase()) rec.moved_to = d.id
      rec.last_modified = d.lastModified?.slice(0, 10) ?? null
      rec.sha = d.sha ?? null
      rec.gated = d.gated === false ? false : (d.gated ?? false) // false, "auto" or "manual"
      rec.disabled = !!d.disabled
      rec.licence = d.cardData?.license ?? (d.tags ?? []).find((t) => t.startsWith('license:'))?.slice(8) ?? null
      rec.safetensors = files.some((f) => f.endsWith('.safetensors'))
      rec.gguf = files.some((f) => f.endsWith('.gguf'))
      rec.pickle_only = !rec.safetensors && !rec.gguf && files.some((f) => /\.(bin|pt|pth|ckpt|pkl)$/.test(f))
      rec.file_count = files.length
      ok++
    } else if (res.status === 401 || res.status === 403) {
      rec.status = 'gated_or_private'; rec.http = res.status; bad++
    } else {
      rec.status = res.status === 404 ? 'not_found' : 'error'; rec.http = res.status; bad++
    }
  } catch (e) {
    rec.status = 'error'; rec.error = String(e.message ?? e).slice(0, 120); bad++
  }
  out.repos[repo] = rec
  await sleep(150)
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`Checked ${repos.size} repos on ${today}: ${ok} ok, ${bad} not ok. Wrote ${OUT}`)
if (bad) for (const [r, v] of Object.entries(out.repos)) if (v.status !== 'ok') console.log(`  ${v.status}${v.http ? ' ' + v.http : ''}: ${r}`)
