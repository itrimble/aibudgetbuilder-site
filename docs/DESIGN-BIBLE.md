# AI Budget Build design bible

A living file. Update it in the same change as the thing it describes, and add a line to the change log at the bottom.
If code and this file disagree, fix whichever is wrong the same day. Started 2026-11-03.

## 1. What the site is for

Help someone who owns a PC, or is about to buy one, get more VRAM for local AI at a low price, and tell them the truth about
it. The 40 user stories in `USER-STORIES.md` are the brief. A design choice is right if it helps one of those stories get solved.

## 2. Principles

1. **Start from what the visitor owns.** The first question is "what do you have?", not "what do you want to buy?".
2. **Say it in a sentence, with the reason.** A warning names the problem and what to do about it.
3. **Every number carries a date and a source.** No bare figure. A figure we did not verify says so.
4. **Never guess a picture or a claim.** No photo yet means an icon tile that says so.
5. **Money is never hidden.** Affiliate links are marked, the disclosure matches what is actually switched on, and links never change what we recommend.
6. **Nothing untested reaches visitors.** Unproven features stay behind a flag (see section 10).
7. **Quiet by default.** One accent colour. Motion only when it explains something.

## 3. Colour

Light is the default for every visitor. Dark is a manual choice from the header button, stored in `localStorage`
(wrapped in try/catch, the site works without it). This departs from `site-templates/docs/WEB-DESIGN.md`, which says
"dark theme only" for product sites. Ian asked for light by default on this site (2026-11-03). Decision recorded here.

All colour comes from CSS variables in `src/index.css`, exposed to Tailwind in `tailwind.config.js`. **Never use a literal
colour or a stock Tailwind palette class** (`zinc-*`, `red-400`) in a component.

| Token | Light | Dark | Use |
|-|-|-|-|
| `bg` | `#f6f7f9` | `#0f1318` | page ground |
| `panel` | `#ffffff` | `#171c23` | cards, inputs, summary boxes |
| `panel2` | `#eceff3` | `#222933` | image tiles, pressed and hover fill, secondary buttons |
| `line` | `#d9dde4` | `#2c3440` | borders |
| `fg` | `#14181f` | `#e8ecf1` | body text |
| `muted` | `#4b5563` | `#aab4c0` | secondary text |
| `subtle` | `#66707e` | `#8a95a3` | notes, footers (still 4.5:1 or better on its ground) |
| `accent` | `#0b6e6e` | `#3cc4c4` | brand, headings, primary button, selected state |
| `onaccent` | `#ffffff` | `#08191a` | text on an accent fill |
| `err` / `warn` / `info` | `#b42318` / `#8f5200` / `#1d5fa8` | `#ff8a80` / `#f2b24c` / `#7db7f5` | checks and status |
| `link` | `#1d5fa8` | `#7db7f5` | links |

Rules:
- **Accent is the only brand colour.** Status colours (`err`, `warn`, `info`) are separate and mean only severity.
- Contrast: body text 4.5:1 or better on its ground in both themes. Check any new token pair before adding it.
- Maker logos are single-colour marks. They follow the theme through the `.logo` class (inverted in dark). Never recolour a logo.

## 4. Type

- Headings, labels and numbers: system monospace (`font-mono`). Body: system sans. No web fonts, per the "fonts self-hosted, no third-party requests" rule.
- Scale (Tailwind): page title `text-2xl font-bold`, big number `text-3xl font-bold`, body `text-sm`, notes `text-xs`.
- Section labels: `font-mono text-xs font-semibold uppercase tracking-wide text-muted`, written as a numbered step when the order matters
  ("1. What do you have?") and unnumbered when it does not ("Presets"). Do not number things that are not a sequence.
- Digits that line up in a column use `tabular-nums`.
- Running text stays under about 65 characters wide.

## 5. Layout

- Page: `mx-auto max-w-6xl px-4 py-6`. The side gutter is never under 16 px.
- Desktop: two columns of parts (2/3) and a sticky summary (1/3). Phone: one column, summary after parts.
- Anything that holds running text in a flex or grid cell gets `min-w-0` so it wraps instead of widening the page.
- No horizontal page scroll at 390 px. Wide tables get their own `overflow-x-auto` box.
- Space between sibling blocks uses `space-y-*` or `gap-*`, not margins on each child.

## 6. Components

| Component | Spec |
|-|-|
| Card | `rounded border border-line bg-panel p-3` (list rows) or `p-4` (summary boxes). Border only, no shadow. Use cards for objects (a part, a result), not to decorate a section |
| Button | `rounded border border-line bg-panel px-3 py-1 text-sm hover:bg-panel2`. Primary and selected: `bg-accent text-onaccent` |
| Step button (PC profile) | Card that is a button. Selected: `border-accent ring-1 ring-accent`, `aria-pressed` set |
| Stepper (+ / −) | 32 px square buttons, count between them, `aria-live="polite"` on the count, `aria-label` names the part |
| Check line | Icon + severity word + message. Colour comes from the severity token. Icon: `alert-circle-outline` for warn and error, `information-outline` for info |
| Disclosure note | Boxed note at the top of every page that has shopping links. Text comes from `disclosure()` in `src/lib/affiliate.ts`, never typed by hand |
| Source line | `price source, checked <date>` as a link, directly under the thing it supports |
| Focus | 2 px accent outline, offset 2 px, on every interactive element |

State is shown in form as well as colour: a selected profile has a ring, a check has an icon and a word.

## 7. Icons, logos and images

Three kinds of picture, each with its own rule.

**Icons** (what kind of thing this is): open-licence sets only, fetched from Iconify's API into `src/assets/icons/` and inlined so they take
the text colour. Material Design Icons (Apache-2.0) for most; Bootstrap Icons (MIT) for the motherboard. Name files `<set>-<icon>.svg`.
Record any new set and its licence in the log below. draw.io's repo is Apache-2.0, but we found no usable GPU or rack stencils there, so it is not a source.

**Logos** (who made it): Simple Icons (CC0 icons; the marks remain the owners' trademarks), in `src/assets/logos/`. Use a logo only to name the
maker of the thing it sits next to. Never use one as site branding, and never imply endorsement. ASRock is not in the set yet.

**Part images** (what it looks like). Order of preference, first match wins:
1. **Our own photo** in `src/assets/parts-own/<id>.webp`. Best: no licence question. Photograph parts we own (the RX 6600 XT, the board, the RAM kit), plain background, same angle.
2. **Wikimedia Commons**, fetched by `scripts/fetch-images.mjs`. Only Creative Commons or public-domain files. The file title must contain the model number.
   Author, licence and file page are written to `src/data/images.json` and shown in the footer credits.
3. **Icon tile**, 96 x 72, category icon plus the maker's logo, labelled "no photo yet" in its accessible name. This is the fallback and it is honest.
4. **Planned, off until approved:** images from the eBay Browse API and the Amazon Product Advertising API. Both come with terms (display rules, refresh limits) and need an approved affiliate account. Add only after reading the current terms.

Not used: images scraped from eBay listings, retailer pages or manufacturer sites without a written licence. Photos belong to their owners.

Image specs: WebP, 480 px wide, quality 78, 10 to 25 KB, shown at 96 x 72 with `object-cover`, `loading="lazy"`, real `alt` ("Photo of <name>").
Refresh: the fetch script skips anything under 30 days old, runs four at a time, sends an identifying User-Agent, and records misses so reruns are free.

## 8. Affiliate links

Accounts (eBay Partner Network, Amazon Associates) are not active yet. The code is built so turning them on is one file.

- All outbound shop links come from `shopLink(merchant, query, id)`. No other code builds a shop URL.
- IDs live in `src/data/affiliate.json` (`ebay.campid`, `amazon.tag`). Empty means inactive: links are plain and the disclosure says no affiliate links are active.
- When active, links are tagged and carry `rel="sponsored nofollow noopener"`. eBay links include a `customid` of the form `abb-<part id>` for per-part reporting.
- The disclosure text comes from `disclosure()`. When Amazon is active it includes Amazon's required sentence ("As an Amazon Associate I earn from qualifying purchases.").
- Affiliate status never changes ranking, order or wording of a recommendation. Sort is by price, fit and risk only.
- Before switching on: read each program's current terms (price display, image use, link format, cookie windows), confirm the link parameters in the dashboard, and test one link end to end.

## 9. Copy and voice

- Plain and specific. First person ("I") only on blog posts, not in the tool. Short sentences. No mannered devices.
- Say what happens: "Add to build", not "Proceed". A warning says what to do: "Use the Vulkan backend", not "Unsupported".
- Dates as `2026-11-03` in data and footers. Money as `$1,234`; ranges with an en dash (`$240–$315`).
- Units: GB for memory (not GiB), W for power, tok/s for speed.
- "Asking price" for what we show, never "price", unless the number is a list price from the maker.
- Anything not proven is labelled **not verified** in plain words, on the same line as the claim.

## 10. Data rules

- Every record has `source_url` and `checked_on`. A figure without them does not ship.
- Prices are asking prices from listing pages and trackers, never quotes. Refresh by a scheduled job that commits a new snapshot; never scrape live in the browser.
- Model VRAM is our arithmetic unless the record says it was measured, and the `vram_basis` field says how it was worked out.
- Speeds shown come from a named source with card count, backend and caveats (`src/data/builds/community-benchmarks.json`). A whole-system comparison lives in that file's `system_comparisons` list and is rendered in its own table, with the same source, date, author and caveats. Our own measurements get a separate badge.
- Features that are not tested sit behind flags, default off in production (the P2 and P3 rows in `USER-STORIES.md`).

## 11. Accessibility

Skip link, visible focus, semantic landmarks (`header`, `main`, `aside`, `footer`), `aria-pressed` on toggles and selected cards, `aria-live` on counts and
results, alt text on every image, reduced motion respected (no animation is needed for any function), usable at 390 px and at 1440 px,
usable with keyboard alone.

## 12. Privacy and performance

No third-party requests. No analytics until opted in. First load under 1 MB before images. Icons and logos are inlined or local. No fonts to download.

## 13. Change log

| Date | Change |
|-|-|
| 2026-11-03 | Bible started. Light default, token set, step-first layout, icon and logo policy, image source order, affiliate rules. Sources recorded: Material Design Icons (Apache-2.0), Bootstrap Icons (MIT), Simple Icons 13.21.0 (CC0), Wikimedia Commons (per-file licence) |
| 2026-11-12 | Community benchmarks can hold a system comparison in its own table | A concurrency comparison of whole machines does not fit a single-GPU llama-bench row |
