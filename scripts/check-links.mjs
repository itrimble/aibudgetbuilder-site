#!/usr/bin/env node
// Check every https link in src/data/**/*.json and write a report: which links are fine, which moved for good, which are dead.
// Hosts that block scripts (eBay, Amazon, Reddit, X, Facebook, LinkedIn, Rosewill) are skipped, and Hugging Face is skipped because `npm run models:links` already checks it through the API.
// Usage: node scripts/check-links.mjs [--json out.json]     Exit code is always 0; the weekly workflow decides what to do with the report.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIP_HOST = /(^|\.)(ebay|amazon|reddit|x|twitter|facebook|linkedin|huggingface|rosewill)\.(com|co)$|^t\.co$/
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' // some sites answer 404 to anything that does not look like a browser

const trim = (u) => { let x = u.replace(/[.,;]+$/, ''); while (x.endsWith(')') && x.split(')').length > x.split('(').length) x = x.slice(0, -1); return x } // a closing bracket belongs to the link only when it has an opening one
export const collectUrls = (text) => [...new Set([...text.matchAll(/https:\/\/[^\s"'<>\\]+/g)].map((m) => trim(m[0])))]
export const skipped = (url) => { try { return SKIP_HOST.test(new URL(url).hostname) } catch { return true } }

const sameAside = (from, to) => { try { const a = new URL(from), b = new URL(to, from); return a.origin === b.origin && a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '') && a.search === b.search } catch { return false } } // a redirect that only adds or drops a trailing slash

/** ok: 2xx. moved: a permanent redirect (301 or 308). dead: 404, 410 or a name that does not resolve. blocked: 403, 429, 999 (the site refuses scripts). unreachable: a reset or timeout. error: any other HTTP status. */
export function classify(status, location, url) {
  if (status >= 200 && status < 300) return { kind: 'ok' }
  if ((status === 301 || status === 308) && location) return sameAside(url, location) ? { kind: 'ok', note: 'trailing slash only' } : { kind: 'moved', to: location }
  if (status >= 300 && status < 400) return { kind: 'ok', note: `temporary redirect ${status}` }
  if (status === 404 || status === 410) return { kind: 'dead' }
  if (status === 403 || status === 429 || status === 999) return { kind: 'blocked' }
  return { kind: 'error', note: `HTTP ${status}` }
}

async function probe(url) {
  const opts = (method) => ({ method, redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': UA } })
  const done = (res) => { const loc = res.headers.get('location'); return { url, status: res.status, ...classify(res.status, loc ? new URL(loc, url).href : null, url) } }
  try {
    let res = await fetch(url, opts('HEAD'))
    if (res.status === 405 || res.status === 501 || res.status === 403) res = await fetch(url, opts('GET'))
    return done(res)
  } catch (first) {
    try { return done(await fetch(url, opts('GET'))) } catch (e) { // some CDNs reset a HEAD request even when the page is fine, so a plain GET gets the last word
      const note = String(e.cause?.code ?? e.message ?? e).slice(0, 80)
      // a name that does not resolve is a real finding; resets and timeouts say more about the checker than the page
      return { url, status: 0, kind: /ENOTFOUND/.test(note) ? 'dead' : 'unreachable', note: /ENOTFOUND/.test(note) ? 'host not found' : note }
    }
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [] })
}

async function main() {
  const root = fileURLToPath(new URL('../src/data', import.meta.url))
  const where = new Map() // url -> files that use it
  for (const f of walk(root)) for (const u of collectUrls(readFileSync(f, 'utf8'))) { if (!skipped(u)) where.set(u, [...(where.get(u) ?? []), f.replace(root + '/', '')]) }
  const urls = [...where.keys()]
  const results = []
  let i = 0
  await Promise.all(Array.from({ length: 8 }, async () => { while (i < urls.length) results.push(await probe(urls[i++])) }))
  const by = (k) => results.filter((r) => r.kind === k)
  const out = { checked: results.length, ok: by('ok').length, moved: by('moved').map((r) => ({ ...r, files: where.get(r.url) })), dead: by('dead').map((r) => ({ ...r, files: where.get(r.url) })), blocked: by('blocked').length, unreachable: by('unreachable').length, error: by('error').map((r) => ({ ...r, files: where.get(r.url) })) }
  const arg = process.argv.indexOf('--json')
  if (arg > 0) writeFileSync(process.argv[arg + 1], JSON.stringify(out, null, 1))
  console.log(`Checked ${out.checked} links: ${out.ok} ok, ${out.moved.length} moved for good, ${out.dead.length} dead, ${out.blocked} blocked by the site, ${out.unreachable} unreachable from the checker (resets and timeouts), ${out.error.length} other problems.`)
  for (const r of out.dead) console.log(`DEAD  ${r.url}  (${r.files.join(', ')})`)
  for (const r of out.moved) console.log(`MOVED ${r.url} -> ${r.to}  (${r.files.join(', ')})`)
  for (const r of out.error.slice(0, 20)) console.log(`ERROR ${r.url}  ${r.note}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
