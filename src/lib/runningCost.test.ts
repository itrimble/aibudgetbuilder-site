import { describe, expect, it } from 'vitest'
import { monthlyCost, monthlyKwh } from './runningCost'

describe('running cost', () => {
  it('1000 W for 8 h a day over 30 days is 240 kWh', () => {
    expect(monthlyKwh(1000, 8)).toBe(240)
  })
  it('240 kWh at 0.15 a kWh is 36.00', () => {
    expect(monthlyCost(1000, 8, 0.15)).toBe(36)
  })
  it('rounds to cents', () => {
    expect(monthlyCost(1511, 3.5, 0.1234)).toBe(Math.round(((1511 * 3.5 * 30) / 1000) * 0.1234 * 100) / 100)
  })
  it('a free-electricity price is allowed and costs nothing', () => {
    expect(monthlyCost(1000, 8, 0)).toBe(0)
  })
  it('returns null, never a made-up number, for missing or impossible inputs', () => {
    expect(monthlyCost(0, 8, 0.15)).toBeNull()
    expect(monthlyCost(-5, 8, 0.15)).toBeNull()
    expect(monthlyCost(1000, 0, 0.15)).toBeNull()
    expect(monthlyCost(1000, 25, 0.15)).toBeNull()
    expect(monthlyCost(1000, 8, -0.1)).toBeNull()
    expect(monthlyCost(1000, 8, NaN)).toBeNull()
    expect(monthlyCost(Infinity, 8, 0.15)).toBeNull()
    expect(monthlyKwh(NaN, 8)).toBeNull()
  })
})
