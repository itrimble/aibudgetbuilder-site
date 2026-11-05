import { describe, expect, it } from 'vitest'
import { CURRENCIES, RATES, detectCurrency, fmt, fmtRange, fmtUsdRange, toUsd, usdTo } from './currency'

describe('currency conversion', () => {
  it('USD to USD is the identity', () => { expect(usdTo('USD', 123.45)).toBeCloseTo(123.45, 9) })

  it('round-trips through every supported currency', () => {
    for (const c of CURRENCIES) expect(toUsd(c.code, usdTo(c.code, 1000))).toBeCloseTo(1000, 6)
  })

  it('goes through EUR correctly: usd/EURUSD gives euros, and cross rates agree', () => {
    expect(usdTo('EUR', 100)).toBeCloseTo(100 / RATES.rates.USD, 9)
    // 100 USD in GBP, then GBP to EUR, must equal 100 USD in EUR
    const gbp = usdTo('GBP', 100)
    expect(gbp / RATES.rates.GBP).toBeCloseTo(usdTo('EUR', 100), 9)
  })

  it('refuses a currency it has no rate for instead of guessing', () => {
    expect(() => usdTo('XXX', 1)).toThrow()
    expect(() => toUsd('XXX', 1)).toThrow()
  })

  it('formats whole units with the right symbol and no decimals, including zero-decimal currencies', () => {
    expect(fmt(1234, 'USD')).toBe('$1,234')
    expect(fmt(100, 'EUR')).toContain('€')
    expect(fmt(100, 'GBP')).toContain('£')
    expect(fmt(100, 'JPY')).toMatch(/￥|¥/)
    expect(fmt(100, 'JPY')).not.toMatch(/\./)
    expect(fmt(100, 'EUR')).not.toMatch(/[.,]\d{2}$/)
  })

  it('collapses a range that rounds to one number', () => {
    expect(fmtRange(10, 10.2, 'USD')).toBe('$10')
    expect(fmtRange(10, 13, 'USD')).toBe('$10–$13')
  })

  it('collapses a USD range that rounds to one figure', () => {
    expect(fmtUsdRange(130, 130)).toBe('$130')
    expect(fmtUsdRange(240, 315)).toBe('$240–$315')
  })

  it('guesses a currency from the browser locale, defaulting to USD', () => {
    expect(detectCurrency('en-GB')).toBe('GBP')
    expect(detectCurrency('de-DE')).toBe('EUR')
    expect(detectCurrency('fr-CA')).toBe('CAD')
    expect(detectCurrency('ja-JP')).toBe('JPY')
    expect(detectCurrency('en')).toBe('USD')
    expect(detectCurrency('xx-ZZ')).toBe('USD')
    expect(detectCurrency(undefined)).toBe('USD')
  })
})
