import { CONTEXT_GB } from './constants'

/** Approximate bits per weight for common llama.cpp quantisations. Our arithmetic, in line with the ~4.85 bits the model estimates already use for Q4_K_M; real files vary by model. */
export const QUANTS = [
  { id: 'Q3_K_M', bits: 3.9 },
  { id: 'Q4_K_M', bits: 4.85 },
  { id: 'Q5_K_M', bits: 5.7 },
  { id: 'Q6_K', bits: 6.6 },
  { id: 'Q8_0', bits: 8.5 },
] as const
export type QuantId = (typeof QUANTS)[number]['id']
export const bitsOf = (id: QuantId) => QUANTS.find((q) => q.id === id)!.bits

/** Weights in GB for a parameter count (billions) at a quantisation. */
export const weightsGb = (paramsB: number, id: QuantId) => (paramsB * bitsOf(id)) / 8

type Sized = { params_b?: number | null; vram_gb_estimate: number }

/** Memory a model needs: its stored estimate, or, when a quantisation is chosen, weights at that quantisation plus the same context allowance the estimates use. */
export function needGb(m: Sized, quant: QuantId | ''): number {
  if (!quant || !m.params_b) return m.vram_gb_estimate
  return Math.round(weightsGb(m.params_b, quant) + CONTEXT_GB)
}
