import nvmeData from '../data/parts/nvme-catalogue.json'
import ramData from '../data/parts/ram-catalogue.json'

type Part = { id: string; name: string; price: number | null; price_basis: string | null; checked_on: string; source_url: string }
type Drive = Part & { capacity_tb: number }
type Kit = Part & { type: string; capacity_gb: number; modules: number; speed_mts: number; ranks: string | null }

const DRIVES = (nvmeData as unknown as Drive[]).filter((d) => d.capacity_tb === 2)
// A 64 GB DDR4 kit of two sticks is the target for the omarchy box. Kits of four sticks are left out: two per channel is the load that failed there.
const KITS = (ramData as unknown as Kit[]).filter((k) => k.type === 'DDR4' && k.capacity_gb === 64 && k.modules === 2)
const only = (n: number, noun: string) => (n === 1 ? `the only ${noun} with a market asking price` : `the cheapest of ${n} ${noun}s with a market asking price`)
const priced = <T extends Part>(xs: T[]) => xs.filter((x) => (x.price ?? 0) > 0).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))

/** Parts the picker does not model yet: the cheapest dated list price for each, shown beside the total and never inside it. */
export function RestOfBox({ money, usd, currency }: { money: (n: number) => string; usd: (n: number) => string; currency: string }) {
  const driveList = priced(DRIVES.filter((d) => d.price_basis === 'msrp'))[0], driveStreet = priced(DRIVES.filter((d) => d.price_basis !== 'msrp'))[0]
  const kitList = priced(KITS.filter((k) => k.price_basis === 'msrp'))[0], kitStreet = priced(KITS.filter((k) => k.price_basis !== 'msrp'))[0]
  const row = (title: string, p: Part, extra: string) => (
    <div key={title + p.id}><dt>{title}, not in the total</dt>
      <dd className="text-subtle">from {money(p.price!)}{currency !== 'USD' && ` (${usd(p.price!)} USD)`}
        <span className="block text-xs"><a className="text-link underline" href={p.source_url}>{p.name}</a>, {p.price_basis === 'msrp' ? 'maker list price' : 'asking price'} checked {p.checked_on}; {extra}</span>
      </dd></div>
  )
  return (
    <>
      {driveStreet && row('2 TB NVMe, market price', driveStreet, `${only(priced(DRIVES.filter((d) => d.price_basis !== 'msrp')).length, 'drive')}; the same drive was $349.99 to $556.92 across stores that day`)}
      {driveList && row('2 TB NVMe at a maker list price', driveList, `${priced(DRIVES.filter((d) => d.price_basis === 'msrp')).length} of ${DRIVES.length} researched 2 TB drives have a list price, which the market may be above`)}
      {kitStreet && row('64 GB DDR4, dual rank (2 sticks)', kitStreet, `${only(priced(KITS.filter((k) => k.price_basis !== 'msrp')).length, 'kit')}. Rank is as the listing states it, not from a maker datasheet`)}
      {kitList && row('64 GB DDR4 at a maker list price (2 sticks)', kitList, 'a list price, which the market is above right now; the maker page does not state the rank, and 32 GB DDR4 sticks are dual rank in every maker table we found')}
    </>
  )
}
