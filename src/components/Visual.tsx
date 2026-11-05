import images from '../data/images.json'

// Image source order (see docs/DESIGN-BIBLE.md, "Images"):
//  1. own photo   src/assets/parts-own/<id>.webp   (taken by us: best, no licence question)
//  2. Commons     src/assets/parts/<id>.webp       (licence-checked, credited in the footer)
//  3. icon tile   category icon + maker logo       (always available, never a guessed image)
const ownImgs = import.meta.glob('../assets/parts-own/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const partImgs = import.meta.glob('../assets/parts/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const logos = import.meta.glob('../assets/logos/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const icons = import.meta.glob('../assets/icons/*.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

type Meta = { status: string; license?: string; author?: string; source?: string; title?: string }
const meta = images as Record<string, Meta>

export const logoUrl = (brand?: string) => (brand ? logos[`../assets/logos/${brand}.svg`] : undefined)

export function Logo({ brand, size = 18 }: { brand?: string; size?: number }) {
  const u = logoUrl(brand)
  if (!u) return null
  return <img src={u} alt={`${brand} logo`} width={size} height={size} className="logo inline-block" style={{ height: size, width: size }} />
}

/** Open-licence icon (Material Design Icons, Apache-2.0; Bootstrap Icons, MIT). Inline so it takes the text colour. */
export function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  const svg = icons[`../assets/icons/${name}.svg`]
  if (!svg) return null
  return <span aria-hidden="true" className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg', `<svg width="${size}" height="${size}"`) }} />
}

export const KIND_ICON = { gpu: 'mdi-expansion-card', board: 'bi-motherboard', ram: 'mdi-memory', storage: 'mdi-harddisk', psu: 'mdi-power-plug', fan: 'mdi-fan' } as const

/** A photo when we have a licensed or our own one, otherwise a labelled icon tile. Never a guessed image. */
export function PartImage({ id, name, brand, kind = 'gpu' }: { id: string; name: string; brand?: string; kind?: keyof typeof KIND_ICON }) {
  const own = ownImgs[`../assets/parts-own/${id}.webp`]
  const url = own ?? (meta[id]?.status === 'ok' ? partImgs[`../assets/parts/${id}.webp`] : undefined)
  const box = { width: 96, height: 72 }
  if (url) return <img src={url} alt={`Photo of ${name}`} loading="lazy" width={96} height={72} className="shrink-0 rounded bg-panel2 object-cover" style={box} />
  return (
    <div role="img" aria-label={`${name}: no photo yet, showing a category icon`} className="relative flex shrink-0 items-center justify-center rounded bg-panel2 text-muted" style={box}>
      <Icon name={KIND_ICON[kind]} size={40} />
      {brand && <span className="absolute bottom-1 right-1"><Logo brand={brand} size={16} /></span>}
    </div>
  )
}

export function credits() {
  return Object.entries(meta).filter(([id, m]) => m.status === 'ok' && !ownImgs[`../assets/parts-own/${id}.webp`]).map(([id, m]) => ({ id, ...m }))
}
