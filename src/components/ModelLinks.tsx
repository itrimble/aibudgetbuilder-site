import linkData from '../data/models/links.json'
import torrentData from '../data/models/torrents.json'
import { cautions, repoFromUrl, type RepoCheck, type Torrent } from '../lib/modelLinks'

const REPOS = (linkData as unknown as { checked_on: string; repos: Record<string, RepoCheck> }).repos
const CHECKED = (linkData as { checked_on: string }).checked_on
const TORRENTS = torrentData as unknown as Torrent[]
const lower = (s: string) => s.toLowerCase()
const lookup = (repo: string) => REPOS[repo] ?? Object.entries(REPOS).find(([k]) => lower(k) === lower(repo))?.[1]

/** Where to get a model's weights, from the maker's Hugging Face page, with a dated check and plain cautions. Torrents appear only when the maker published one. */
export function ModelLinks({ url, gguf, id, maker }: { url?: string | null; gguf?: string | null; id?: string; maker?: string }) {
  const repo = repoFromUrl(url)
  const rec = repo ? lookup(repo) : undefined
  const ggufRec = gguf ? lookup(gguf) : undefined
  const torrent = id ? TORRENTS.find((t) => t.model === id) : undefined
  if (!repo && !gguf && !torrent) return null
  const ggufOrg = gguf?.split('/')[0]
  const makerOrg = maker ?? repo?.split('/')[0]
  const warn = [...(repo ? cautions(rec) : []), ...(gguf ? cautions(ggufRec).filter((c) => !c.startsWith('No link check')) : [])]
  return (
    <div className="mt-1 text-xs text-muted">
      <span className="font-semibold">Get it:</span>{' '}
      {repo && <a className="text-link underline" href={`https://huggingface.co/${rec?.canonical ?? repo}`}>{rec?.canonical ?? repo}</a>}
      {rec?.last_modified && <span className="text-subtle"> · changed on Hugging Face {rec.last_modified}</span>}
      {rec?.licence && <span className="text-subtle"> · licence field: {rec.licence}</span>}
      {gguf && <> · GGUF files: <a className="text-link underline" href={`https://huggingface.co/${gguf}`}>{gguf}</a><span className="text-subtle"> (a re-quantised copy by {ggufOrg}{makerOrg && lower(ggufOrg ?? '') !== lower(makerOrg) ? ', not by the maker' : ''})</span></>}
      <span className="text-subtle"> · links checked {CHECKED}</span>
      {torrent && (
        <div className="mt-1 rounded border border-line p-2">
          <span className="font-semibold">Torrent published by {torrent.published_by}:</span> <a className="text-link underline" href={torrent.magnet}>magnet link</a> (<a className="text-link underline" href={torrent.published_at}>where {torrent.published_by} says so</a>). {torrent.note}
        </div>
      )}
      {warn.map((w) => <div key={w} className="text-warn">{w}</div>)}
    </div>
  )
}

/** General guidance, not measured by this site. Collapsed by default. */
export function SafeDownloads() {
  return (
    <details className="rounded border border-line bg-panel p-3 text-sm">
      <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wide text-muted">Downloading weights safely, and about torrents</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
        <li>Every model here links to the maker&apos;s own Hugging Face page. Check that the account name matches the maker before you download, and prefer the maker&apos;s copy over a re-upload.</li>
        <li>Prefer .safetensors or .gguf files. Older .bin, .pt, .pth and .ckpt files are pickle-based and can run code when loaded. The cards that only ship those say so.</li>
        <li>Compare the SHA-256 of what you downloaded with the hash Hugging Face shows for that file on the repo&apos;s Files tab. A match means the bytes are the ones the repo holds.</li>
        <li>Gated models need a Hugging Face account and your acceptance of the maker&apos;s terms. Read the licence: several here are not open-source, and some bar commercial use.</li>
        <li>Torrents: the maker-published ones the site knows about are listed on the model&apos;s card, with the page where the maker says so. Most makers publish none, so Hugging Face (or the maker&apos;s own hub) is the official route. Community torrent indexes exist; this site does not link them. A magnet&apos;s infohash guarantees consistent bytes, not authentic ones, and peers in a swarm can see your IP address.</li>
        <li>Link checks are a dated snapshot taken from Hugging Face&apos;s public metadata. If a card says a repo moved, is gated or has gone, trust that over an older link elsewhere.</li>
      </ul>
    </details>
  )
}
