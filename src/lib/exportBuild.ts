// Export a build as CSV and as a plain-text summary. Prices stay in US dollars with their dates and sources, because that is how they are stored.

export type Line = { kind: string; name: string; qty: number; low: number; high: number; checked_on: string; source_url: string }
export type Finding = { severity: string; message: string }

/** RFC 4180 quoting; also neutralises cells a spreadsheet would run as a formula. */
export function csvCell(v: string | number): string {
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(lines: Line[]): string {
  const head = ['Part type', 'Name', 'Quantity', 'Price low each (USD)', 'Price high each (USD)', 'Price checked', 'Source']
  const rows = lines.map((l) => [l.kind, l.name, l.qty, l.low, l.high, l.checked_on, l.source_url].map(csvCell).join(','))
  return [head.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n'
}

export function toText(o: { title: string; date: string; lines: Line[]; vram: number; cards: number; watts: number; findings: Finding[]; link?: string }): string {
  const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  const low = o.lines.reduce((s, l) => s + l.low * l.qty, 0)
  const high = o.lines.reduce((s, l) => s + l.high * l.qty, 0)
  const out = [
    `${o.title} (${o.date})`,
    '',
    `Total VRAM: ${o.vram} GB across ${o.cards} card(s). Estimated draw: ${o.watts} W (an allowance, not a measurement).`,
    '',
    'To buy:',
    ...(o.lines.length ? o.lines.map((l) => `- ${l.qty} x ${l.name}: ${usd(l.low)}${l.high !== l.low ? ` to ${usd(l.high)}` : ''} each (checked ${l.checked_on})`) : ['- nothing']),
    `Subtotal: ${usd(low)}${high !== low ? ` to ${usd(high)}` : ''}. Not priced: board, CPU, RAM, 2 TB NVMe, case.`,
    '',
    'Checks:',
    ...(o.findings.length ? o.findings.map((f) => `- [${f.severity.toUpperCase()}] ${f.message}`) : ['- none yet']),
    '',
    'Prices are dated asking prices in US dollars, not quotes. Nothing here was benchmarked by the site.',
  ]
  if (o.link) out.push('', `Open this build: ${o.link}`)
  return out.join('\n') + '\n'
}

const md = (t: string) => t.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

/** The same summary as Markdown for forums and chat: a parts table with dates, the totals, the checks, and a link back. */
export function toMarkdown(o: { title: string; date: string; lines: Line[]; vram: number; cards: number; watts: number; findings: Finding[]; link?: string }): string {
  const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  const low = o.lines.reduce((s, l) => s + l.low * l.qty, 0)
  const high = o.lines.reduce((s, l) => s + l.high * l.qty, 0)
  const out = [
    `**${md(o.title)}** (${o.date})`,
    '',
    `**Total VRAM:** ${o.vram} GB across ${o.cards} card(s). **Estimated draw:** ${o.watts} W (an allowance, not a measurement).`,
    '',
    '| Part | Qty | Price each | Checked |',
    '|---|---|---|---|',
    ...(o.lines.length ? o.lines.map((l) => `| ${md(l.name)} | ${l.qty} | ${usd(l.low)}${l.high !== l.low ? ` to ${usd(l.high)}` : ''} | ${l.checked_on} |`) : ['| nothing to buy | | | |']),
    '',
    `**Subtotal:** ${usd(low)}${high !== low ? ` to ${usd(high)}` : ''}. Not priced: board, CPU, RAM, 2 TB NVMe, case.`,
    '',
    '**Checks**',
    ...(o.findings.length ? o.findings.map((f) => `- ${f.severity.toUpperCase()}: ${md(f.message)}`) : ['- none yet']),
    '',
    '_Prices are dated asking prices in US dollars, not quotes. Nothing here was benchmarked by the site._',
  ]
  if (o.link) out.push('', `[Open this build](${o.link})`)
  return out.join('\n') + '\n'
}
