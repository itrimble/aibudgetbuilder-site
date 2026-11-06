#!/usr/bin/env node
// Load every page of the running site at phone and desktop width and record: horizontal overflow, console errors, and serious or critical axe-core accessibility violations.
// Needs Playwright and @axe-core/playwright, installed OUTSIDE the repo so package.json stays untouched:
//   AUDIT_MODULES=/tmp/audit node scripts/check-layout.mjs http://127.0.0.1:4173/ out.json
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(`${process.env.AUDIT_MODULES ?? process.cwd()}/package.json`)
const { chromium } = require('playwright')
const AxeBuilder = require('@axe-core/playwright').default

const base = process.argv[2] ?? 'http://127.0.0.1:4173/'
const out = process.argv[3]
const WIDTHS = [390, 1440]
const PRIMARY = ['Build', 'Models', 'Guides', 'Community']
const problems = []
let views = 0

const browser = await chromium.launch()
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  await page.goto(base, { waitUntil: 'load' })
  for (const name of PRIMARY) {
    await page.locator('nav[aria-label="Sections"] button', { hasText: new RegExp(`^${name}$`) }).click()
    const subs = await page.locator('nav[aria-label$=" pages"] button').allTextContents()
    for (const sub of subs.length ? subs : [name]) {
      if (subs.length) await page.locator('nav[aria-label$=" pages"] button', { hasText: sub }).click()
      await page.waitForTimeout(250)
      views += 1
      const label = subs.length ? `${name} / ${sub}` : name
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (overflow > 1) problems.push({ width, view: label, kind: 'overflow', detail: `the page is ${overflow}px wider than the screen` })
      const axe = await new AxeBuilder({ page }).analyze()
      for (const v of axe.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) problems.push({ width, view: label, kind: 'accessibility', detail: `${v.id} (${v.impact}): ${v.help}; ${v.nodes.length} element(s)` })
    }
  }
  for (const e of [...new Set(errors)]) problems.push({ width, view: 'any', kind: 'console error', detail: e })
  await page.close()
}
await browser.close()
const result = { views, widths: WIDTHS, problems }
if (out) writeFileSync(out, JSON.stringify(result, null, 1))
console.log(`Checked ${views} page views at ${WIDTHS.join(' and ')} px: ${problems.length} problem(s).`)
for (const p of problems.slice(0, 40)) console.log(`${p.kind.toUpperCase()} [${p.width}px, ${p.view}] ${p.detail}`)
