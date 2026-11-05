// A build as a link. Only ids and small numbers are stored, never prices or text, so a link cannot carry a claim.
// decodeBuild is all-or-nothing: one unknown id or out-of-range number rejects the whole link rather than guessing.

export type BuildState = {
  pcId: string; boardId: string; counts: Record<string, number>; adapterIds: string[]
  psuId: string; nvme: number; openFrame: boolean; airflow: boolean
  keepOwned: boolean // false = the visitor pulls the cards their PC already has
}
export type Known = { pcs: Record<string, { hasPsu: boolean }>; boards: string[]; gpus: string[]; adapters: string[]; psus: string[] }

export const LIMITS = { perCard: 16, adapters: 32, nvme: 4 }

export function encodeBuild(s: BuildState): string {
  const p = new URLSearchParams()
  p.set('pc', s.pcId)
  p.set('b', s.boardId)
  const g = Object.entries(s.counts).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)).map(([id, n]) => `${id}:${n}`).join(',')
  if (g) p.set('g', g)
  if (s.adapterIds.length) p.set('a', s.adapterIds.join(','))
  p.set('p', s.psuId)
  p.set('n', String(s.nvme))
  p.set('of', s.openFrame ? '1' : '0')
  p.set('af', s.airflow ? '1' : '0')
  if (!s.keepOwned) p.set('ko', '0') // absent means keep, so older links still load
  return p.toString()
}

const whole = (v: string | null, min: number, max: number) => (v != null && /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max ? Number(v) : null)

export function decodeBuild(query: string, known: Known): BuildState | null {
  const p = new URLSearchParams(query.replace(/^#/, ''))
  const pcId = p.get('pc'), boardId = p.get('b'), psuId = p.get('p')
  if (!pcId || !(pcId in known.pcs) || !boardId || !known.boards.includes(boardId) || !psuId) return null
  if (!(known.psus.includes(psuId) || (psuId === 'owned' && known.pcs[pcId].hasPsu))) return null
  const counts: Record<string, number> = {}
  for (const part of (p.get('g') ?? '').split(',').filter(Boolean)) {
    const [id, n, ...rest] = part.split(':')
    const count = whole(n ?? null, 1, LIMITS.perCard)
    if (rest.length || !known.gpus.includes(id) || count === null || id in counts) return null
    counts[id] = count
  }
  const adapterIds = (p.get('a') ?? '').split(',').filter(Boolean)
  if (adapterIds.length > LIMITS.adapters || adapterIds.some((a) => !known.adapters.includes(a))) return null
  const nvme = whole(p.get('n'), 0, LIMITS.nvme)
  const openFrame = p.get('of'), airflow = p.get('af')
  const ko = p.get('ko')
  if (ko !== null && ko !== '0') return null
  if (nvme === null || (openFrame !== '0' && openFrame !== '1') || (airflow !== '0' && airflow !== '1')) return null
  return { pcId, boardId, counts, adapterIds, psuId, nvme, openFrame: openFrame === '1', airflow: airflow === '1', keepOwned: ko === null }
}
