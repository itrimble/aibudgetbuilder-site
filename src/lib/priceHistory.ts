import history from '../data/history/prices.json'

type Hist = { days: Record<string, Record<string, [number, number]>> }
const DAYS = (history as unknown as Hist).days

/** The lowest asking price of a card on each date it was recorded, oldest first. */
export function priceSeries(id: string, days: Record<string, Record<string, [number, number]>> = DAYS): { date: string; low: number }[] {
  return Object.keys(days).sort().flatMap((date) => (days[date][id] ? [{ date, low: days[date][id][0] }] : []))
}
