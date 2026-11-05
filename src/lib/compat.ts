import type { Adapter, Board, Build, Finding, Gpu, Psu } from './types'

export const SYSTEM_BASE_W = 150 // CPU + board + drives + fans, rough allowance
export const PSU_HEADROOM = 1.2 // transient spikes; the plan calls for headroom
/** Assumptions, not measurements: supply efficiency, and the continuous load a 15 A / 120 V circuit is normally held to (80% of 1,800 W, the common US rule). */
export const ASSUMED_EFFICIENCY = 0.9
export const MAINS_120V_LIMIT_W = 1440

export type Totals = { vram: number; watts: number; priceLow: number; priceHigh: number; cards: number }

export function totals(gpus: Gpu[], adapters: Adapter[], psu?: Psu): Totals {
  const extra = adapters.reduce((s, a) => s + a.price, 0) + (psu?.price ?? 0)
  return {
    cards: gpus.length,
    vram: gpus.reduce((s, g) => s + g.vram_gb, 0),
    watts: SYSTEM_BASE_W + gpus.reduce((s, g) => s + g.tdp_w, 0),
    priceLow: gpus.reduce((s, g) => s + g.price_low, 0) + extra,
    priceHigh: gpus.reduce((s, g) => s + g.price_high, 0) + extra,
  }
}

/**
 * Place cards on a board. Real slots with 4+ lanes first (widest first), then adapters,
 * then x1 slots (which need a riser). Returns where each card landed and how many M.2 slots adapters consumed.
 */
export function placeCards(board: Board, gpus: Gpu[], adapters: Adapter[]) {
  const slots = [...board.gpu_slots].sort((a, b) => b.lanes - a.lanes)
  const placements: { gpu: Gpu; where: string; lanes: number }[] = []
  let adapterIdx = 0
  let usedM2 = 0
  const wideFree = slots.filter((s) => s.lanes >= 4)
  const x1Free = slots.filter((s) => s.lanes < 4)

  for (const gpu of gpus) {
    const slot = wideFree.shift()
    if (slot) {
      placements.push({ gpu, where: slot.id, lanes: slot.lanes })
      continue
    }
    const adapter = adapters[adapterIdx]
    if (adapter) {
      adapterIdx++
      if (adapter.consumes_m2) usedM2++
      placements.push({ gpu, where: adapter.name, lanes: adapter.lanes })
      continue
    }
    const x1 = x1Free.shift()
    if (x1) {
      placements.push({ gpu, where: `${x1.id} (needs a riser)`, lanes: x1.lanes })
      continue
    }
    placements.push({ gpu, where: 'NO SLOT', lanes: 0 })
  }
  return { placements, usedM2 }
}

export function checkBuild(build: Build, board: Board, gpus: Gpu[], adapters: Adapter[], psu: Psu): Finding[] {
  const f: Finding[] = []
  const t = totals(gpus, adapters, psu)
  const { placements, usedM2 } = placeCards(board, gpus, adapters)

  // slots and lanes
  for (const p of placements) {
    if (p.where === 'NO SLOT')
      f.push({ severity: 'error', code: 'no-slot', message: `${p.gpu.name} has no slot or adapter left on ${board.name}.` })
    else if (p.lanes <= 1)
      f.push({ severity: 'warn', code: 'x1-link', message: `${p.gpu.name} would run at x${p.lanes}. PCIe 3.0 x1 moves about 1 GB/s, so a 16 GB model takes roughly 16 seconds or more to load. Once loaded, the speed loss is small (one measurement: about 3% for an RTX 4090 on a single lane), and a model split by layers across cards is the setup that tolerates it.` })
    else if (p.lanes <= 4)
      f.push({ severity: 'info', code: 'x4-link', message: `${p.gpu.name} sits at x${p.lanes} (${p.where}).` })
  }

  // physical fit: more than two double-slot cards will not fit an ATX case
  const wide = gpus.filter((g) => g.slot_width >= 2).length
  if (wide > 2 && !build.caseOpenFrame)
    f.push({ severity: 'error', code: 'no-room', message: `${wide} double-slot cards will not fit an ATX case. Use an open frame and risers.` })

  // M.2 conflicts
  const m2Free = board.m2_slots.length - usedM2
  if (usedM2 > 0)
    f.push({ severity: 'warn', code: 'm2-consumed', message: `${usedM2} M.2 slot(s) used by GPU adapters; ${m2Free} left for NVMe.` })
  if (build.nvmeDrives > m2Free)
    f.push({ severity: 'error', code: 'm2-conflict', message: `Build wants ${build.nvmeDrives} NVMe drive(s) but only ${m2Free} M.2 slot(s) remain.` })

  // cooling
  if (gpus.some((g) => g.cooling === 'passive') && !build.airflowForPassive)
    f.push({ severity: 'error', code: 'passive-no-airflow', message: 'Passive server cards need forced airflow (shroud + fan). They will throttle or overheat without it.' })

  // power
  if (t.watts * PSU_HEADROOM > psu.watts)
    f.push({ severity: 'error', code: 'psu-watts', message: `Estimated ${t.watts} W x ${PSU_HEADROOM} headroom exceeds the ${psu.watts} W PSU.` })
  const wallW = Math.round(t.watts / ASSUMED_EFFICIENCY)
  if (wallW > MAINS_120V_LIMIT_W)
    f.push({ severity: 'warn', code: 'mains-120v', message: `At full load this build could draw about ${wallW} W from the wall (assuming ${Math.round(ASSUMED_EFFICIENCY * 100)}% efficiency). A 15 A, 120 V circuit is normally held to about ${MAINS_120V_LIMIT_W} W continuous, shared with everything else on it. Plan a 240 V outlet or a dedicated circuit, and check the PSU's input range: ASUS lists its Pro WS 1600W as 200-240 V only. This is a general rule, not electrical advice; wiring rules differ by country.` })
  const connectors = gpus.reduce((s, g) => s + g.connector_count, 0)
  if (connectors > psu.pcie_8pin)
    f.push({ severity: 'error', code: 'psu-connectors', message: `Cards need ${connectors} 8-pin connectors, PSU provides ${psu.pcie_8pin}.` })
  if (gpus.some((g) => g.id === 'tesla-p40'))
    f.push({ severity: 'info', code: 'p40-eps', message: 'Tesla P40 uses an 8-pin EPS (CPU) connector, not PCIe 8-pin. Use a PCIe-to-EPS adapter cable; do not plug a PCIe cable into it.' })

  // driver stacks
  for (const g of gpus.filter((x, i) => gpus.findIndex((y) => y.id === x.id) === i)) { // once per model, not once per card
    if (g.vendor === 'AMD' && !g.stacks.rocm)
      f.push({ severity: 'warn', code: 'no-rocm', message: `${g.name}: ROCm is not officially supported. Vulkan works in llama.cpp. ${g.rocm_hint ?? ''}`.trim() })
    if (g.id === 'tesla-p40')
      f.push({ severity: 'warn', code: 'old-arch', message: 'P40 is Pascal: no tensor cores, slow FP16. Fine for quantised llama.cpp, poor for image and video models.' })
  }
  if (new Set(gpus.map((g) => g.vendor)).size > 1)
    f.push({ severity: 'info', code: 'mixed-vendor', message: 'Mixed NVIDIA and AMD: use llama.cpp with the Vulkan backend to span them in one process.' })

  // 32 GB cards need a big PCIe memory window (reported by a reader of Country Boy Computers, not verified here)
  if (gpus.some((g) => g.vram_gb >= 32))
    f.push({ severity: 'warn', code: 'bar-window', message: 'Cards with 32 GB need Above 4G Decoding on and a large MMIO window in BIOS. One reader reports a workstation would not POST until MMIO granularity was raised. The MSI Tomahawk manual does list an "Above 4G memory" switch (off by default); whether 32 GB cards need more than that was not verified.' })

  // vram target
  if (t.vram < 128)
    f.push({ severity: 'warn', code: 'below-target', message: `${t.vram} GB total is under the 128 GB target.` })

  // ram
  if (board.ram_slots === 4)
    f.push({ severity: 'info', code: 'ram-1dpc', message: 'Use 2 DIMMs in DIMMA2/DIMMB2 (one per channel) for the easiest load on the memory controller. MSI rates this board up to 4600 MHz for one single-rank DIMM per channel and 3866 MHz for dual-rank; 32 GB DDR4 sticks are listed as dual rank by every maker table we found, so expect the 3866 figure with 2x32 GB.' })

  return f
}

export function fitsModel(totalVramGb: number, modelVramGb: number, perCardOverheadGb: number, cards: number) {
  return totalVramGb - perCardOverheadGb * cards >= modelVramGb
}

/** Plain-language list of what a build still needs, from its error findings. */
export function needsFrom(findings: { severity: string; code: string }[]): string[] {
  const codes = new Set(findings.filter((f) => f.severity === 'error').map((f) => f.code))
  const out: string[] = []
  if (codes.has('psu-watts') || codes.has('psu-connectors')) out.push('a bigger PSU')
  if (codes.has('no-room')) out.push('an open frame')
  if (codes.has('no-slot')) out.push('adapters (no free slot)')
  if (codes.has('m2-conflict')) out.push('fewer NVMe drives or adapters')
  if (codes.has('passive-no-airflow')) out.push('forced airflow')
  return out
}
