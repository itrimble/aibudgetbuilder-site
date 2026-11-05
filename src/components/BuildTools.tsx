import { useState } from 'react'
import { ASSUMED_EFFICIENCY } from '../lib/compat'
import { CURRENCIES } from '../lib/currency'
import { monthlyCost, monthlyKwh } from '../lib/runningCost'

const label = 'mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-muted'
const btn = 'rounded border border-line bg-panel px-3 py-1 text-sm hover:bg-panel2'
const field = 'mt-1 w-full rounded border border-line bg-panel p-2'

/** Monthly electricity cost. The visitor supplies the hours and the price; the wall draw is the site's own full-load estimate, so the result is a ceiling. */
export function RunningCost({ wallW, currency }: { wallW: number; currency: string }) {
  const [hours, setHours] = useState('')
  const [price, setPrice] = useState('')
  const kwh = monthlyKwh(wallW, Number(hours))
  const cost = monthlyCost(wallW, Number(hours), Number(price))
  const own = (n: number) => new Intl.NumberFormat(CURRENCIES.find((c) => c.code === currency)?.locale ?? 'en-US', { style: 'currency', currency }).format(n)
  return (
    <div className="rounded border border-line bg-panel p-4">
      <h2 className={label}>Running cost</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label>Hours a day at full load
          <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 4" className={field} />
        </label>
        <label>Price per kWh ({currency})
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="from your bill" className={field} />
        </label>
      </div>
      <p role="status" className="mt-2 text-sm">
        {kwh !== null && price !== '' && cost !== null
          ? <><strong>{own(cost)}</strong> a month for {Math.round(kwh)} kWh.</>
          : <span className="text-subtle">Enter your hours and your price per kWh to see a monthly figure.</span>}
      </p>
      <p className="mt-1 text-xs text-subtle">
        Uses about {wallW} W from the wall, the most this build could draw ({ASSUMED_EFFICIENCY * 100}% supply efficiency assumed). It is a ceiling: idle and partial load draw less, and neither is modelled. 30-day month.
      </p>
    </div>
  )
}

/** Copy a link or a text summary, or download a CSV. If the browser blocks the clipboard, the text is shown to copy by hand. */
export function ShareExport({ getLink, getSummary, getCsv }: { getLink: () => string; getSummary: () => string; getCsv: () => string }) {
  const [notice, setNotice] = useState('')
  const [manual, setManual] = useState('')
  const copy = async (text: string, done: string) => {
    // Some browsers leave the clipboard promise pending (a permission prompt nobody sees), so give it 2 s before showing the text.
    try {
      await Promise.race([navigator.clipboard.writeText(text), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 2000))])
      setManual(''); setNotice(done)
    } catch { setManual(text); setNotice('Your browser blocked copying. Select the text below and copy it yourself.') }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([getCsv()], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `ai-budget-build-${new Date().toLocaleDateString('en-CA')}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    setNotice('CSV downloaded.')
  }
  return (
    <div className="rounded border border-line bg-panel p-4">
      <h2 className={label}>Share or export</h2>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={() => copy(getLink(), "Link copied. It holds only part ids, so anyone who opens it sees today's prices.")}>Copy link</button>
        <button className={btn} onClick={() => copy(getSummary(), 'Summary copied.')}>Copy summary</button>
        <button className={btn} onClick={download}>Download CSV</button>
      </div>
      <p role="status" className="mt-2 text-xs text-muted">{notice}</p>
      {manual && <textarea readOnly aria-label="Text to copy" className="mt-2 h-32 w-full rounded border border-line bg-panel p-2 font-mono text-xs" value={manual} onFocus={(e) => e.currentTarget.select()} />}
    </div>
  )
}
