// Prints what the budget recommender returns for each tier, so a person can sanity-check it against their own judgement.
//   npx vite-node scripts/show-budget.ts [board-id] [owned-card-id]
import boards from '../src/data/parts/boards.json'
import gpus from '../src/data/parts/gpus.json'
import adapters from '../src/data/parts/adapters.json'
import psus from '../src/data/parts/psu.json'
import { TIERS, recommend } from '../src/lib/budget'
import type { Adapter, Board, Gpu, Psu } from '../src/lib/types'

const boardId = process.argv[2] ?? 'msi-x570-tomahawk'
const ownedId = process.argv[3] ?? 'rx-6600xt'
const board = boards.find((b) => b.id === boardId) as unknown as Board
const owned = [gpus.find((g) => g.id === ownedId)].filter(Boolean) as unknown as Gpu[]
console.log(`Board ${board.name}; owned: ${owned.map((g) => g.name).join(', ') || 'none'}`)
for (const t of TIERS) {
  const r = recommend({ board, owned, gpus: gpus as unknown as Gpu[], adapters: adapters as unknown as Adapter[], psus: psus as unknown as Psu[], budgetUsd: t.usd })
  console.log(`\n${t.name} $${t.usd}: ${r.options.length} option(s)`)
  for (const o of r.options.slice(0, 4))
    console.log(`  ${o.n} x ${o.gpu.id}: ${o.vram} GB total, $${o.costLow}-$${o.costHigh}, $${o.perGbLow.toFixed(0)}-${o.perGbHigh.toFixed(0)}/GB, needs: ${o.needs.join(', ') || 'nothing'}`)
  if (!r.options.length && r.cheapest) console.log(`  nothing fits; cheapest is ${r.cheapest.n} x ${r.cheapest.gpu.id} at $${r.cheapest.costLow}-$${r.cheapest.costHigh}`)
}
