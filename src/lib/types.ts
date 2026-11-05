export type Source = { source_url: string; checked_on: string; note?: string; placeholder?: boolean }

export type Gpu = Source & {
  id: string
  name: string
  vendor: 'NVIDIA' | 'AMD' | 'Intel'
  vram_gb: number
  arch?: string // optional: left blank when the maker page does not state it
  slot_width: number // physical slots occupied
  tdp_w: number
  power_connectors: string // e.g. "1x 8-pin EPS"
  connector_count: number
  cooling: 'active' | 'passive'
  stacks: { cuda: boolean; rocm: boolean; vulkan: boolean }
  price_low: number
  price_high: number
  brand?: string
  image_query?: string
  owned_only?: boolean
  rocm_hint?: string
  spec_source_url?: string
  spec_checked_on?: string
  spec_verified?: string[]
  spec_unverified?: string[]
  spec_note?: string
  note: string
}

export type PcieSlot = { id: string; lanes: number; gen: number; source: 'cpu' | 'chipset' | 'unknown'; sharesWithM2?: string }
export type M2Slot = { id: string; lanes: number | null; gen: number | null; source: 'cpu' | 'chipset' | 'unknown' }

export type Board = Source & {
  id: string
  name: string
  socket: string
  ram_type: 'DDR4' | 'DDR5'
  ram_slots: number
  max_ram_gb: number | null
  gpu_slots: PcieSlot[]
  m2_slots: M2Slot[]
  bifurcation: boolean | 'unknown'
  price_low?: number | null
  price_high?: number | null
  brand?: string
  image_query?: string
  note: string
}

export type Adapter = Source & {
  id: string
  name: string
  kind: 'riser' | 'm2-to-pcie' | 'oculink'
  consumes_m2: boolean
  lanes: number
  price: number
}

export type Psu = Source & { id: string; name: string; watts: number; pcie_8pin: number; price: number }

export type Build = {
  boardId: string
  gpuIds: string[] // one entry per card
  adapterIds: string[] // one entry per adapter used
  psuId: string
  nvmeDrives: number
  caseOpenFrame: boolean
  airflowForPassive: boolean
}

export type Severity = 'error' | 'warn' | 'info'
export type Finding = { severity: Severity; code: string; message: string }

export type MyPc = { id: string; name: string; blurb: string; board: string | null; owned_gpus: string[]; psu_w: number; psu_8pin: number; story: string; icon: string; note?: string }
