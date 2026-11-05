const EBAY_POLICY = 'https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210'
const MEMTEST = 'https://www.memtest.org/'

type Item = { title: string; body: string; basis: 'site' | 'sourced' | 'general'; link?: { href: string; label: string } }

const BASIS: Record<Item['basis'], string> = {
  site: 'The Builder checks this for you',
  sourced: 'From a source we opened',
  general: 'General practice, not measured by us',
}

const BEFORE: Item[] = [
  { title: 'Slots and lanes', body: 'Count the card widths against the board\'s real slots, and check which slots hang off the chipset and run at x4. The Placement panel shows what fits and at what speed.', basis: 'site' },
  { title: 'Power supply watts and connectors', body: 'The Checks panel adds every card, the board and a 20% margin, and counts the PCIe connectors each card needs. It also warns when the total is more than a 120 V outlet can carry (1,440 W).', basis: 'site' },
  { title: 'The card you already own', body: 'Your current card draws power too. Tick "Keep the card already in your PC" only if it will stay installed; if you pull it, nothing is plugged into the monitor.', basis: 'site' },
  { title: 'Cooling for passive cards', body: 'Datacenter cards such as the Tesla P40 have no fan. They need forced airflow through the card and often an adapter cable for the power connector. The Checks panel flags a passive card.', basis: 'site' },
  { title: 'Memory sticks', body: 'No 32 GB DDR4 stick is single rank, so the board\'s faster single-rank rating does not apply to it. With two sticks, use one stick per channel in the slots the manual names.', basis: 'site' },
  { title: 'Drivers and operating system', body: 'Check the card\'s software column before you buy: some old cards only work with a pinned driver or only through Vulkan. We list CUDA, ROCm and Vulkan support per card, and the Windows, Linux, Mac tab says what each operating system supports, card family by card family.', basis: 'site' },
  { title: 'Physical size and the case', body: 'The site does not yet check card length against a case. Measure it yourself; open frames and risers are the usual answer for four or more cards.', basis: 'general' },
]

const ARRIVAL: Item[] = [
  { title: 'Open the box on camera and start the clock', body: 'On eBay, a buyer can ask for a "not as described" return up to 30 days after delivery, or within the seller\'s stated window if that is longer, even when the seller says no returns. Items sold as not working or for parts only get just 3 days. So test within days, not weeks.', basis: 'sourced', link: { href: EBAY_POLICY, label: 'eBay Money Back Guarantee policy' } },
  { title: 'Check it identifies itself correctly', body: 'The operating system should report the model name and the full memory size the listing promised. A card that reports less memory, or a different name, is not what was advertised.', basis: 'general' },
  { title: 'Run it under sustained load', body: 'Run a model benchmark in a loop for 20 to 30 minutes and watch temperatures, fan noise and errors in the system log. Cards that fail often pass a one-minute test.', basis: 'general' },
  { title: 'Look at the board', body: 'Check for missing parts, burn marks, bent pins, heat-sink paste that has dried out, and a card that is not the version in the photos.', basis: 'general' },
  { title: 'Seller checks before you pay', body: 'Prefer sellers with history, listings with real photos of the actual card, and a returns policy. Be wary of a price far below every other listing.', basis: 'general' },
]

function List({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.title} className="rounded border border-line bg-panel p-3">
          <h3 className="font-mono text-base text-accent">{i.title}</h3>
          <p className="mt-1 text-sm">{i.body}</p>
          <p className="mt-1 text-xs text-subtle">
            {BASIS[i.basis]}.{i.link && <> <a className="text-link underline" href={i.link.href}>{i.link.label}</a></>}
          </p>
        </li>
      ))}
    </ul>
  )
}

/** A pre-purchase checklist, a used-card arrival test, and the memory test. Each item says whether the site checks it, whether it comes from a source we opened, or whether it is general practice we have not measured. */
export function BuyingGuide() {
  return (
    <div className="space-y-8">
      <section aria-label="How to read this page" className="rounded border border-line bg-panel p-3 text-sm text-muted">
        <h2 className="mb-1 font-mono text-lg text-accent">Before you buy, and when it arrives</h2>
        <p>Each line says where it comes from: a check the Builder runs, a source we opened, or general practice that we have not measured. Used cards are bought on asking prices from sellers we do not vouch for.</p>
      </section>
      <section aria-label="Before you buy"><h2 className="mb-2 font-mono text-lg text-accent">Before you buy</h2><List items={BEFORE} /></section>
      <section aria-label="When a used card arrives"><h2 className="mb-2 font-mono text-lg text-accent">When a used card arrives</h2><List items={ARRIVAL} /></section>
      <section aria-label="Test the memory" className="rounded border border-line bg-panel p-3 text-sm">
        <h2 className="mb-1 font-mono text-lg text-accent">Test the memory first</h2>
        <p>
          If a PC crashes under load, test its memory before blaming a new card. <a className="text-link underline" href={MEMTEST}>Memtest86+</a> is an open-source tester that boots from a USB drive; its current
          version can save a full text report, with the memory modules and results, to a FAT32 USB drive by pressing F6. Run it on any new memory kit when it arrives and keep the old sticks as a control.
        </p>
        <p className="mt-2 text-muted">
          <strong className="text-fg">Our own case:</strong> the omarchy box&apos;s four 16 GB sticks failed Memtest86+ at the standard 2133 speed. We never recorded the pair-by-pair and single-stick tests that would say whether the
          sticks or the board are at fault, so we do not know which it is. That is why the plan buys a new kit and tests it, instead of assuming.
        </p>
      </section>
    </div>
  )
}
