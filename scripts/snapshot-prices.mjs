#!/usr/bin/env node
// Append today's card prices to src/data/history/prices.json so the site can draw a price history.
// One entry per date (running it twice on one day overwrites that day), oldest entries dropped after 400 days. Reads only local data; no network.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const GPUS = new URL('../src/data/parts/gpus.json', import.meta.url)
const OUT = new URL('../src/data/history/prices.json', import.meta.url)
const today = new Date().toISOString().slice(0, 10) // UTC date, the same clock the daily workflow runs on
const gpus = JSON.parse(readFileSync(GPUS, 'utf8')).filter((g) => g.price_high > 0)
const hist = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { note: 'Card price ranges (USD, asking) on each date the site was built: id -> [low, high]. Written by scripts/snapshot-prices.mjs.', days: {} }
hist.days[today] = Object.fromEntries(gpus.map((g) => [g.id, [g.price_low, g.price_high]]))
const keep = Object.keys(hist.days).sort().slice(-400)
hist.days = Object.fromEntries(keep.map((d) => [d, hist.days[d]]))
writeFileSync(OUT, JSON.stringify(hist, null, 1) + '\n')
console.log(`Price history: ${keep.length} day(s), ${gpus.length} cards on ${today}`)
