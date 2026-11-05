// Monthly electricity cost. Every input comes from the visitor except the wall draw, which is the site's own full-load estimate.
// That estimate is the most the build would draw, so the result is a ceiling for the hours entered; idle and partial load are not modelled.

export const DAYS_PER_MONTH = 30

/** kWh per month at a constant draw. Null when an input is missing or impossible. */
export function monthlyKwh(wallWatts: number, hoursPerDay: number): number | null {
  if (!(wallWatts > 0) || !Number.isFinite(wallWatts) || !(hoursPerDay > 0) || hoursPerDay > 24 || !Number.isFinite(hoursPerDay)) return null
  return (wallWatts * hoursPerDay * DAYS_PER_MONTH) / 1000
}

/** Cost per month in the same currency as the entered price. Null when an input is missing or impossible. */
export function monthlyCost(wallWatts: number, hoursPerDay: number, pricePerKwh: number): number | null {
  const kwh = monthlyKwh(wallWatts, hoursPerDay)
  if (kwh === null || !(pricePerKwh >= 0) || !Number.isFinite(pricePerKwh)) return null
  return Math.round(kwh * pricePerKwh * 100) / 100
}
