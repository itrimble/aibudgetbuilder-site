import rental from '../data/builds/rental.json'

export type Tier = { vram_gb: number; gpu: string; usd_per_hour: number }
const TIERS = rental.tiers as Tier[]

/**
 * How many hours of renting equal the purchase price. Picks the smallest rental tier that holds the build's memory (or several of the largest tier
 * when it is bigger than that), and divides the cost by that hourly rate. A comparison of money, not of speed.
 */
export function breakEven(vramGb: number, costLow: number, costHigh: number): { tier: Tier; units: number; hoursLow: number; hoursHigh: number } | null {
  if (vramGb <= 0 || costHigh <= 0) return null
  const sorted = [...TIERS].sort((a, b) => a.vram_gb - b.vram_gb)
  const tier = sorted.find((t) => t.vram_gb >= vramGb) ?? sorted[sorted.length - 1]
  const units = Math.max(1, Math.ceil(vramGb / tier.vram_gb))
  const rate = tier.usd_per_hour * units
  return { tier, units, hoursLow: costLow / rate, hoursHigh: costHigh / rate }
}
