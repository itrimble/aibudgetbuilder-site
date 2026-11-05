import os from '../data/builds/os-support.json'
import type { Gpu } from './types'

export type OsCell = { status: string; backend: string | null; note: string | null }
export type OsSupport = { family: string; windows: OsCell; linux: OsCell; macos: OsCell; extra?: string }
type Row = { family: string; windows: OsCell; linux: OsCell; macos: OsCell }
const ROWS = os.matrix as unknown as Row[]
const row = (prefix: string) => ROWS.find((r) => r.family.startsWith(prefix))!

/**
 * Where a card runs, taken from the Windows, Linux, Mac tab's table (AMD's HIP SDK Windows table and NVIDIA's CUDA notes were read by us on 2026-11-05).
 * The card is matched to a family by its name and architecture; the family row carries the status, backend and caveat for each system.
 */
export function osSupport(g: Gpu): OsSupport {
  const t = `${g.arch ?? ''} ${g.name}`
  let r: Row
  if (/Pascal|GTX 10\d0|P40|P100|Volta|V100/i.test(t)) r = row('NVIDIA Pascal')
  else if (/Turing|2080|RTX 8000|T4\b/i.test(t)) r = row('NVIDIA Turing')
  else if (g.vendor === 'NVIDIA') r = row('NVIDIA Ampere')
  else if (/Vega 20|MI50|MI60|gfx906/i.test(t)) r = row('AMD Instinct')
  else if (/RDNA ?2|gfx103|RX 6\d00|V620|W6800/i.test(t)) r = row('AMD RDNA2')
  else if (g.vendor === 'AMD') r = row('AMD RDNA3')
  else r = row('Intel Arc')
  const dataCentre = g.vendor === 'NVIDIA' && g.cooling === 'passive'
  return {
    family: r.family, windows: r.windows, linux: r.linux, macos: r.macos,
    extra: dataCentre ? 'A data-centre card has no video output, and on Windows NVIDIA says graphics APIs such as Vulkan need vGPU licensing, so use it for CUDA with another card or the CPU\'s graphics driving the screen.' : undefined,
  }
}
