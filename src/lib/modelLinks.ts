// Links to model weights. Every link points at a trusted host, and each Hugging Face repo carries a dated check
// (does it still exist, did it move, is it gated, what file types does it hold). Nothing here fetches at run time.

/** Hosts a model link may point at: the maker's own hub or code host. Torrent magnets are separate (see torrents.json). */
export const TRUSTED_HOSTS = ['huggingface.co', 'github.com', 'modelscope.cn', 'modelscope.ai', 'kaggle.com', 'catalog.ngc.nvidia.com', 'ollama.com'] as const

export type RepoCheck = {
  checked_on: string
  status: 'ok' | 'not_found' | 'gated_or_private' | 'error'
  canonical?: string; moved_to?: string; last_modified?: string | null; sha?: string | null
  gated?: false | 'auto' | 'manual'; disabled?: boolean; licence?: string | null
  safetensors?: boolean; gguf?: boolean; pickle_only?: boolean; file_count?: number
}

export function repoFromUrl(url: string | undefined | null): string | null {
  const m = /^https:\/\/huggingface\.co\/([^/]+\/[^/?#]+)/.exec(url ?? '')
  return m ? m[1] : null
}

export function hostOk(url: string): boolean {
  try { const h = new URL(url).host.replace(/^www\./, ''); return TRUSTED_HOSTS.some((t) => h === t || h.endsWith('.' + t)) } catch { return false }
}

/** Plain-language cautions for a repo, from its latest check. Empty when there is nothing to say. */
export function cautions(r: RepoCheck | undefined): string[] {
  if (!r) return ['No link check on file for this repo.']
  const out: string[] = []
  if (r.status === 'not_found') out.push('Hugging Face no longer finds this repo. The link may be dead.')
  else if (r.status === 'gated_or_private') out.push('Hugging Face asked for a login on this repo.')
  else if (r.status === 'error') out.push('The last link check could not reach Hugging Face.')
  if (r.moved_to) out.push(`The repo moved to ${r.moved_to}.`)
  if (r.disabled) out.push('Hugging Face has disabled this repo.')
  if (r.gated) out.push('Gated: you must accept the maker\'s terms on Hugging Face (with an account) before you can download.')
  if (r.pickle_only) out.push('Weights are in pickle-based files (.bin, .pt or .ckpt), which can run code when loaded. Open them only in a sandbox, or find a safetensors or GGUF copy from the same maker.')
  return out
}

export function ageDays(checkedOn: string, today = new Date()): number {
  const t = Date.parse(checkedOn + 'T00:00:00Z')
  return Number.isFinite(t) ? Math.floor((today.getTime() - t) / 86400000) : Infinity
}

export type Torrent = { model: string; infohash: string; magnet: string; published_by: string; published_at: string; note: string; checked_on: string }
export const MAGNET_RE = /^magnet:\?xt=urn:btih:[0-9a-f]{40}(&[A-Za-z0-9._%=\-]*)?$/
