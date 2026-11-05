import ratesFile from '../data/rates.json'
import list from '../data/currencies.json'

// All prices in the data are US dollar asking prices (eBay.com and similar). Other currencies are a display conversion at the
// European Central Bank reference rate in src/data/rates.json (a dated snapshot). A converted figure is an estimate: it does not
// include VAT or sales tax, import duty, shipping or the seller's willingness to ship abroad. See docs/METHODOLOGY.md.

export type Currency = { code: string; name: string; locale: string }
export const CURRENCIES = list as Currency[]
export const RATES = ratesFile as { source_name: string; source_url: string; base: string; published: string; fetched_on: string; rates: Record<string, number> }

export const isSupported = (code: string) => code in RATES.rates

/** US dollars to `code`. Rates are units per EUR, so go through EUR. */
export function usdTo(code: string, usd: number): number {
  if (!isSupported(code)) throw new Error(`Unsupported currency ${code}`)
  return (usd / RATES.rates.USD) * RATES.rates[code]
}
export function toUsd(code: string, amount: number): number {
  if (!isSupported(code)) throw new Error(`Unsupported currency ${code}`)
  return (amount / RATES.rates[code]) * RATES.rates.USD
}

/** Whole units, formatted with the currency's own conventions (symbol, grouping, decimal handling). */
export function fmt(usd: number, code: string): string {
  const c = CURRENCIES.find((x) => x.code === code) ?? CURRENCIES[0]
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code, maximumFractionDigits: 0 }).format(Math.round(usdTo(c.code, usd)))
}
export const fmtRange = (low: number, high: number, code: string) => (Math.round(low) === Math.round(high) ? fmt(low, code) : `${fmt(low, code)}–${fmt(high, code)}`)
/** The original US dollar figure, always available next to a conversion. */
export const fmtUsd = (usd: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(usd))
export const fmtUsdRange = (low: number, high: number) => (Math.round(low) === Math.round(high) ? fmtUsd(low) : `${fmtUsd(low)}–${fmtUsd(high)}`)

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  IN: 'INR', BR: 'BRL', MX: 'MXN', ZA: 'ZAR', KR: 'KRW', SG: 'SGD', CN: 'CNY', HK: 'HKD', TR: 'TRY', IL: 'ILS',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', AT: 'EUR', BE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', HR: 'EUR', CY: 'EUR', MT: 'EUR',
}
/** A first guess from the browser locale (for example "en-GB" gives GBP). Falls back to USD. The visitor can always change it. */
export function detectCurrency(locale?: string): string {
  const region = /[-_]([A-Za-z]{2})\b/.exec(locale ?? '')?.[1]?.toUpperCase()
  const code = region ? REGION_CURRENCY[region] : undefined
  return code && isSupported(code) ? code : 'USD'
}
