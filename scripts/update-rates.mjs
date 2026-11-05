#!/usr/bin/env node
// Refresh src/data/rates.json from the European Central Bank's daily euro reference rates.
// The site is static and makes no third-party requests from the browser, so rates are a dated snapshot, refreshed by this script.
// Usage: node scripts/update-rates.mjs     (run at least weekly; the audit warns after 7 days and fails after 30)
import { readFileSync, writeFileSync } from 'node:fs'

const URL_ = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
const OUT = new URL('../src/data/rates.json', import.meta.url).pathname
const wanted = JSON.parse(readFileSync(new URL('../src/data/currencies.json', import.meta.url), 'utf8')).map((c) => c.code)

const res = await fetch(URL_, { headers: { 'User-Agent': 'AIBudgetBuild/0.1 (rate refresh; iantrimble@remnantsecurity.com)' }, signal: AbortSignal.timeout(30000) })
if (!res.ok) { console.error(`ECB responded ${res.status}; rates.json unchanged`); process.exit(1) }
const xml = await res.text()
const published = /<Cube time='(\d{4}-\d{2}-\d{2})'/.exec(xml)?.[1]
const rates = { EUR: 1 }
for (const m of xml.matchAll(/<Cube currency='([A-Z]{3})' rate='([0-9.]+)'\/>/g)) rates[m[1]] = Number(m[2])
const missing = wanted.filter((c) => !(c in rates))
if (!published || missing.length || !rates.USD) { console.error(`Unexpected feed: published=${published} missing=${missing.join(',')}; rates.json unchanged`); process.exit(1) }

const out = {
  source_name: 'European Central Bank euro foreign exchange reference rates',
  source_url: URL_,
  base: 'EUR',
  published,
  fetched_on: new Date().toLocaleDateString('en-CA'),
  rates: Object.fromEntries(wanted.map((c) => [c, rates[c]])),
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
console.log(`ECB rates for ${published} written for ${wanted.length} currencies (1 EUR = ${rates.USD} USD)`)
