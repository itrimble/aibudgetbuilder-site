import { QUANTS, type QuantId } from '../lib/quant'
import { speedBound } from '../lib/speed'
import type { Gpu } from '../lib/types'

type Model = { name: string; params_b?: number | null; active_params_b?: number | null; quant_suggested?: string }

// One measured example from a source we read, used to show how far real speeds fall below the bound.
// Joshua Warren's RTX 5060 Ti runs Qwen3.8-27B Q4_0: weights 14,367 MiB, 20 tok/s in his article and 22.52 / 24.63 in his setup notes (Vulkan / CUDA).
const CAL = { card: 'RTX 5060 Ti', bandwidth: 448, weightsGb: (14367 * 1.048576) / 1000, measured: [20, 24.63], sources: [
  { label: 'article', url: 'https://joshuawarren.com/blog/egpu-setup-under-1000-for-omarchy/' },
  { label: 'setup notes', url: 'https://github.com/joshuaswarren/omarchy-egpu/blob/main/cards/rtx-5060-ti/setup.md' }] }

const quantOf = (m: Model, chosen: QuantId | ''): QuantId => (chosen || (QUANTS.find((q) => q.id === m.quant_suggested)?.id ?? 'Q4_K_M'))
const isMoeName = (n: string) => /A\d+B|MoE|mixture/i.test(n)

/** An upper bound on generation speed from sourced memory bandwidth, always labelled as an estimate, with one measured example and the evidence caveats. */
export function SpeedNote({ model, quant, cards }: { model: Model; quant: QuantId | ''; cards: Gpu[] }) {
  const q = quantOf(model, quant)
  const active = model.active_params_b ?? (isMoeName(model.name) ? null : model.params_b)
  if (!active) return <p className="mt-2 text-xs text-subtle">Speed: not estimated. This looks like a mixture-of-experts model whose active size the data does not give, so a dense-model bound would understate it.</p>
  const s = speedBound(cards, active, q)
  if ('missing' in s) return <p className="mt-2 text-xs text-subtle">Speed: not estimated, because {s.missing.includes('no cards') ? 'there are no cards yet' : 'a card in this build has no sourced memory bandwidth'}.</p>
  const weak = cards.filter((c) => c.bandwidth_basis && c.bandwidth_basis !== 'maker page, read').length
  const calBound = CAL.bandwidth / CAL.weightsGb
  const pct = CAL.measured.map((m) => Math.round((m / calBound) * 100))
  return (
    <div className="mt-2 space-y-1 text-xs text-muted">
      <p><strong className="text-fg">Speed, an estimate:</strong> at most about {s.tokPerSec.toFixed(s.tokPerSec < 10 ? 1 : 0)} tokens per second when writing, for {active}B {model.active_params_b ? 'active ' : ''}parameters at {q} ({s.bytesGb.toFixed(1)} GB read per token). Real speed is lower.</p>
      <p className="text-subtle">
        How: each token reads the model once from the cards&apos; memory, one card after another, so the bound is the sum over cards of the data on the card divided by its memory bandwidth (the makers&apos; figures). It ignores compute, software and long prompts.
        For scale, the same formula gives {calBound.toFixed(1)} tok/s for a 27B model on an {CAL.card} ({CAL.bandwidth} GB/s); its owner measured {CAL.measured[0]} to {CAL.measured[1]} ({pct[0]}% to {pct[1]}% of the bound; {CAL.sources.map((x, i) => <span key={x.url}>{i > 0 && ', '}<a className="text-link underline" href={x.url}>{x.label}</a></span>)}).
        {weak > 0 && ` ${weak} card figure(s) in this build rest on weaker evidence than a maker page we read; see the card details.`}
      </p>
    </div>
  )
}
