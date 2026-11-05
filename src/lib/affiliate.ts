import cfg from '../data/affiliate.json'

// Affiliate links are designed in now and stay inert until real IDs are filled into src/data/affiliate.json.
// Rules this file enforces (see docs/DESIGN-BIBLE.md, "Affiliate links"):
//  - every outbound shop link goes through shopLink(); nothing else builds a shop URL
//  - with no ID configured the link is plain and unmarked, and the page says no affiliate links are active
//  - with an ID the link is tagged, and rel="sponsored nofollow noopener" is returned for the <a>
//  - the disclosure text comes from disclosure(), so the wording follows what is actually active

export type Merchant = 'ebay' | 'amazon'

export const active = { ebay: Boolean(cfg.ebay.campid), amazon: Boolean(cfg.amazon.tag) }
export const anyActive = active.ebay || active.amazon

/** Search URL for a part on a merchant, tagged only when that program is active. `id` becomes eBay's customid for per-part reporting. */
export function shopLink(merchant: Merchant, query: string, id: string): { href: string; rel: string } {
  if (merchant === 'ebay') {
    const u = new URL('https://www.ebay.com/sch/i.html')
    u.searchParams.set('_nkw', query)
    if (active.ebay) {
      // Parameter names follow eBay Partner Network's documented link format; confirm against the EPN dashboard once approved.
      u.searchParams.set('mkcid', '1')
      u.searchParams.set('mkrid', cfg.ebay.mkrid)
      u.searchParams.set('siteid', '0')
      u.searchParams.set('campid', cfg.ebay.campid)
      u.searchParams.set('customid', `${cfg.customidPrefix}-${id}`)
      u.searchParams.set('toolid', '10001')
      u.searchParams.set('mkevt', '1')
    }
    return { href: u.toString(), rel: active.ebay ? 'sponsored nofollow noopener' : 'noopener' }
  }
  const u = new URL('https://www.amazon.com/s')
  u.searchParams.set('k', query)
  if (active.amazon) u.searchParams.set('tag', cfg.amazon.tag)
  return { href: u.toString(), rel: active.amazon ? 'sponsored nofollow noopener' : 'noopener' }
}

export function disclosure(): string {
  if (!anyActive) return 'No affiliate links are active yet. Shopping links go straight to the merchant. When affiliate links are switched on, they will be marked and this note will say so.'
  const parts = ['Some shopping links on this site are affiliate links. If you buy through them I may earn a commission at no cost to you. It does not change the price shown or the order of results.']
  if (active.amazon) parts.push('As an Amazon Associate I earn from qualifying purchases.')
  return parts.join(' ')
}
