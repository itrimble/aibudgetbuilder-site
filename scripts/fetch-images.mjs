#!/usr/bin/env node
// Fetch one licence-checked product image per part from Wikimedia Commons.
// Usage: node scripts/fetch-images.mjs [--force] [--only id1,id2]
//
// Design (the "efficient" part):
//  - one API call per part (search + imageinfo with licence metadata via generator)
//  - skips parts whose image is under MAX_AGE_DAYS old, so reruns cost nothing
//  - 4 parts at a time, identified User-Agent, no retries beyond one
//  - converts to 480px WebP (about 10-25 KB) so images can be inlined or hosted as static files
//  - rejects any file whose licence is not Creative Commons / public domain, and records
//    licence, author and file page in src/data/images.json for on-page attribution
//  - parts with no match are listed in the manifest as "missing", never given a guessed image
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'src/assets/parts')
const MANIFEST = join(ROOT, 'src/data/images.json')
const MAX_AGE_DAYS = 30
const UA = 'AIBudgetBuild/0.1 (image fetch for a parts-picker; contact iantrimble@remnantsecurity.com)'
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null

mkdirSync(OUT, { recursive: true })
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}

const parts = []
for (const f of readdirSync(join(ROOT, 'src/data/parts')).filter((n) => n.endsWith('.json'))) {
  for (const p of JSON.parse(readFileSync(join(ROOT, 'src/data/parts', f), 'utf8'))) {
    if (p.image_query) parts.push(p)
  }
}

const ok = (lic = '') => /^(cc|public domain|pd|gfdl|free)/i.test(lic.trim())
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()

// A hit must name the model: every query token that contains a digit (p40, x99-e, 3090...) must appear in the file title,
// and the title must be plain ASCII (video frames and screenshots in other scripts were the main false positives).
const modelTokens = (q) => q.toLowerCase().split(/\s+/).filter((t) => /\d/.test(t))
const names = (title, q) => /^[\x00-\x7F]+$/.test(title) && !/screenshot|video|connector/i.test(title) &&
  modelTokens(q).every((t) => title.toLowerCase().replace(/[\s_-]/g, '').includes(t.replace(/[\s_-]/g, '')))

async function find(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '6', prop: 'imageinfo', iiprop: 'url|extmetadata|size',
    iiurlwidth: '480', iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription',
  }).toString()
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`API ${r.status}`)
  const pages = Object.values((await r.json()).query?.pages ?? {}).sort((a, b) => a.index - b.index)
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0]
    const lic = ii?.extmetadata?.LicenseShortName?.value
    if (ii && ok(lic) && ii.thumburl && ii.width >= 300 && names(pg.title, query)) {
      return { title: pg.title, thumb: ii.thumburl, license: lic, author: strip(ii.extmetadata?.Artist?.value), page: ii.descriptionurl }
    }
  }
  return null
}

async function one(p) {
  const prev = manifest[p.id]
  const fresh = prev?.fetched && (Date.now() - Date.parse(prev.fetched)) / 864e5 < MAX_AGE_DAYS
  if (!force && fresh && (prev.status === 'missing' || existsSync(join(OUT, `${p.id}.webp`)))) return `skip ${p.id}`
  try {
    const hit = await find(p.image_query)
    if (!hit) { manifest[p.id] = { status: 'missing', query: p.image_query, fetched: new Date().toISOString() }; return `none ${p.id}` }
    const img = await fetch(hit.thumb, { headers: { 'User-Agent': UA } })
    if (!img.ok) throw new Error(`image ${img.status}`)
    await sharp(Buffer.from(await img.arrayBuffer())).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(OUT, `${p.id}.webp`))
    manifest[p.id] = { status: 'ok', file: `${p.id}.webp`, title: hit.title, license: hit.license, author: hit.author, source: hit.page, fetched: new Date().toISOString() }
    return `ok   ${p.id} <- ${hit.title} (${hit.license})`
  } catch (e) { return `fail ${p.id}: ${e.message}` }
}

const queue = parts.filter((p) => !only || only.includes(p.id))
const results = []
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) results.push(await one(queue.shift())) }))
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1))
console.log(results.sort().join('\n'))
