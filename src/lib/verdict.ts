import type { Gpu } from './types'

/**
 * One line of what to know about a card, built only from facts the site already checked:
 *  - cooling comes from the maker's datasheet field;
 *  - Pascal and Volta: NVIDIA's CUDA Toolkit 13.5 release notes say Maxwell, Pascal and Volta support was removed (read 2026-11-05);
 *  - AMD Windows support: AMD's HIP SDK 7.2.0 Windows table (read 2026-11-05) lists RX 6000 as unsupported and RX 7000, RX 9000, W7000 and R9700 as supported;
 *  - MI50/MI60 (gfx906): ROCm 7.0 release notes, seen as a search excerpt.
 * The long research note stays on the card behind a Details drawer.
 */
export function cardVerdict(g: Gpu): string {
  const text = `${g.arch ?? ''} ${g.name}`
  const parts: string[] = []
  if (g.cooling === 'passive') parts.push('Passive: needs forced airflow')

  if (/Pascal|GTX 10\d0|P40|P100/i.test(text)) parts.push('Pascal: no tensor cores, slow FP16; the CUDA 13 toolkit dropped it')
  else if (/Volta|V100/i.test(text)) parts.push('Volta: the CUDA 13 toolkit dropped it, so use an older toolkit or driver')
  else if (/Vega 20|MI50|MI60|gfx906/i.test(text)) parts.push('ROCm dropped it in 7.0: use Vulkan or an old ROCm')
  else if (/RDNA ?2|gfx103|RX 6\d00|V620|W6800/i.test(text)) parts.push('ROCm on Linux only; Vulkan on Windows')
  else if (g.vendor === 'Intel') parts.push('Vulkan only on this list, not benchmarked by us')
  else if (!g.stacks.cuda && !g.stacks.rocm) parts.push('Vulkan only')
  else if (g.vendor === 'AMD') parts.push('ROCm on Linux and Windows, or Vulkan')
  else if (/Turing|2080/i.test(text)) parts.push('CUDA 13 still targets Turing')
  else parts.push('CUDA, current drivers')

  return `${parts.join('. ')}.`
}
