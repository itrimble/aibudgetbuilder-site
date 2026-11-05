import { CONTEXT_GB, OS_RESERVE_GB, OVERHEAD_GB } from './constants'

// Where a model's weights can live. This is a memory-fit check only. It says nothing about speed,
// because tokens per second depends on memory bandwidth, the backend and the quantisation, and none of that is measured here.
//   vram    : everything fits on the cards.
//   offload : a mixture-of-experts model whose experts spill into system RAM. Each token only reads the active experts,
//             so this is the case where system RAM is genuinely useful.
//   slow    : a dense model that only fits by spilling into system RAM. Every token reads every weight over system memory.
//   no      : does not fit in VRAM plus system RAM.
export type Fit = 'vram' | 'offload' | 'slow' | 'no'

export type FitInput = { vramGb: number; cards: number; ramGb: number; weightsGb: number; moe: boolean }
export type FitResult = { fit: Fit; vramUsableGb: number; ramUsableGb: number; neededGb: number; spillGb: number }

export function classifyFit(i: FitInput): FitResult {
  const vramUsableGb = Math.max(0, i.vramGb - OVERHEAD_GB * i.cards)
  const ramUsableGb = Math.max(0, i.ramGb - OS_RESERVE_GB)
  const neededGb = i.weightsGb + CONTEXT_GB
  const spillGb = Math.max(0, neededGb - vramUsableGb)
  let fit: Fit
  if (neededGb <= vramUsableGb) fit = 'vram'
  else if (neededGb <= vramUsableGb + ramUsableGb) fit = i.moe ? 'offload' : 'slow'
  else fit = 'no'
  return { fit, vramUsableGb, ramUsableGb, neededGb, spillGb }
}

export const FIT_LABEL: Record<Fit, string> = {
  vram: 'Fits in VRAM',
  offload: 'Fits with experts in system RAM',
  slow: 'Fits only by spilling into system RAM (dense: slow)',
  no: 'Does not fit',
}

export type StackPick<T> = { role: string; pick: T | null; gb: number }
/** Memory for a set of models used together: all resident at once, versus one at a time (swapped in and out). */
export function stackTotals(gbs: number[]): { allAtOnce: number; oneAtATime: number } {
  return { allAtOnce: gbs.reduce((a, b) => a + b, 0), oneAtATime: gbs.reduce((a, b) => Math.max(a, b), 0) }
}
