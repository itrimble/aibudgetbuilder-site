# User stories for AI Budget Build

Written 2026-11-03. Each story names the person, what they own, and what "solved" looks like on the site.
**Phase** = when it ships: **P1** first public launch, **P2** behind a flag until tested, **P3** later.
**Needs** = the page or data the story depends on. These are design inputs, not claims about real users:
nobody has been interviewed yet, and the first job after launch is to check these against what visitors actually do.

## A. I already own a PC and want to add AI to it

| # | Story | Solved when | Needs | Phase |
|-|-|-|-|-|
| 1 | As a gamer with an RTX 3060 12GB desktop, I want to know the cheapest card I can add to run a 27B coding model, so I don't replace my whole PC. | I pick "my PC", see free slots, PSU headroom and the top 3 add-ons with price per extra GB. | My PC picker, add-on ranking | P1 |
| 2 | As someone with a Ryzen desktop and one x16 slot, I want to know if a second GPU will fit and at what speed. | The site shows slot, lane width (x16/x4) and warns about chipset slots. | Board slot data, lane checks | P1 |
| 3 | As an owner of a 650 W PSU, I want to know if my power supply can take a second card. | Watts with headroom and connector count are checked, with a "needs a bigger PSU" cost. | PSU check, PSU shortlist | P1 |
| 4 | As someone with a small-form-factor PC, I want to know if an external GPU over OCuLink or Thunderbolt makes sense. | A path lists the adapter, dock, PSU and the speed penalty. | eGPU path, adapter data | P2 |
| 5 | As a laptop owner, I want to know what an external GPU gives me compared with cloud pricing. | Cost and tok/s estimate versus API pricing, dated. | eGPU path, cloud-vs-local | P3 |
| 6 | As an owner of an old HP Z4 or Dell workstation, I want to know how many cards it takes and what it costs. | Pick the model, see slots, PSU limit, and a card count that works. | Workstation profiles | P1 |
| 7 | As an owner of a Mac, I want to know if buying a GPU box beats upgrading my Mac. | A comparison row with unified-memory Macs, flagged "not verified" where untested. | Mac comparison | P3 |
| 8 | As Ian, I want my own omarchy box loaded as the starting point so every recommendation is for my hardware. | The Tomahawk, 5950X, RX 6600 XT, PSU and the free slots are prefilled. | Saved profile | P1 |
| 9 | As someone with a PC that crashes under load, I want to know if my RAM could be the problem before I buy GPUs. | A short RAM test guide with the Memtest86+ steps and what each result means. | Guide page | P2 |
| 10 | As an owner who isn't sure what is in my PC, I want to read it from my machine instead of typing. | Paste the output of one command and the site fills in CPU, RAM, GPU and PSU where known. | System-info paste | P2 |

## B. I'm buying a new machine for a target

| # | Story | Solved when | Needs | Phase |
|-|-|-|-|-|
| 11 | As a developer, I want to run a coding model that is good enough to replace a cloud assistant, so I pick a model first and get a parts list. | Choose "coding agent", see models that fit and a build that reaches the VRAM. | Goal-first flow | P1 |
| 12 | As a hobbyist, I want a budget cap and the site to tell me the most VRAM I can get. | Enter dollars, see the best VRAM per dollar and the trade-offs. | Build-from-budget | P2 |
| 13 | As someone who wants 128 GB, I want every way to reach it, sorted by price and risk. | A table of combinations with price, watts, noise, software risk. | Presets, ranking | P1 |
| 14 | As a buyer on a tight budget, I want to know which cards are cheap per GB and what they give up. | $/GB plus a plain "what you give up" line on each card. | Card notes | P1 |
| 15 | As a Linux-comfortable buyer, I want to know which cards need a pinned old driver. | A driver and OS matrix per card. | Driver matrix | P1 |
| 16 | As a Windows-only buyer, I want to know which cards work without a Linux install. | Windows column on each card, with "not verified" where unknown. | Driver matrix | P1 |
| 17 | As a parent building a home server, I want it quiet. | Noise rating per card and cooling option, with measured dB where we have it. | Noise data | P2 |
| 18 | As someone paying a high electricity bill, I want to know the monthly cost of running it. | Watts, hours per day and a local price per kWh give a monthly figure. | Power cost | P2 |
| 19 | As a first-time builder, I want a checklist so I don't buy something that doesn't fit. | A pre-purchase list: slots, PSU connectors, BIOS settings, cooling, physical size. | Checklist | P1 |
| 20 | As a buyer who wants it all in one box, I want to see a full parts list with a 2 TB drive and RAM. | A complete BOM including board, CPU, RAM, 2 TB NVMe, PSU, case. | Full BOM | P1 |

## C. I want to know what I can run

| # | Story | Solved when | Needs | Phase |
|-|-|-|-|-|
| 21 | As someone with 24 GB of VRAM, I want to know the best coding model that fits. | Models by task filtered to my VRAM, with the quant and context length. | Models page | P1 |
| 22 | As a writer, I want a private assistant for long documents. | Long-context models and the VRAM they need at 32k and 128k. | Context calculator | P2 |
| 23 | As a podcaster, I want local speech-to-text and voice generation. | Speech tasks with sizes and speeds. | Models page | P1 |
| 24 | As a musician, I want to generate music locally. | Music models with VRAM and licence (commercial or not). | Models + licence flag | P1 |
| 25 | As a game developer, I want to make 3D assets and images locally. | Image and 3D models with VRAM and the cards that run them well. | Models page | P2 |
| 26 | As a video creator, I want to know if my card can make short clips. | Measured clip times where known, and a "too slow" warning otherwise. | Benchmarks | P2 |
| 27 | As a small business owner, I want a private assistant on my own data. | A document-QA recipe with the model, embedder and reranker. | Recipe pages | P3 |
| 28 | As a student, I want the cheapest setup that still runs a decent chat model. | A "starter" preset under a low budget with honest speed. | Presets | P1 |
| 29 | As someone who cares about speed, I want to see real tok/s for my card and model. | Benchmarks table with source, card count, backend and caveats. | Benchmarks page | P1 |
| 30 | As a developer, I want the exact command to start the model. | A copyable llama.cpp command for my cards and backend. | Command generator | P2 |

## D. I'm worried about risk

| # | Story | Solved when | Needs | Phase |
|-|-|-|-|-|
| 31 | As a buyer of used cards, I want to avoid scams and dead cards. | A used-card guide: seller checks, test commands, return window advice. | Guide page | P1 |
| 32 | As a cautious buyer, I want to know how old the prices are. | Every price shows date and source, with a stale badge. | Price freshness | P1 |
| 33 | As a buyer, I want to know if a card will stop being supported soon. | A support-status line per card with a source. | Card data | P1 |
| 34 | As someone who doesn't trust ads, I want to know how the site makes money. | A disclosure at the top and a methodology page. | Trust pages | P1 |
| 35 | As a reader, I want to see what the site has not verified. | A "not verified" label on unproven claims. | Data flags | P1 |
| 36 | As a buyer, I want to know what could go wrong with my exact combination. | The checks list names the problem and the fix. | Compatibility engine | P1 |

## E. Staying current and sharing

| # | Story | Solved when | Needs | Phase |
|-|-|-|-|-|
| 37 | As a returning visitor, I want my build saved. | A shareable link and a saved list in the browser. | Share URL | P1 |
| 38 | As a buyer, I want an alert when a card drops in price. | Email me when a card falls below my number. | Price alerts | P3 |
| 39 | As a builder, I want to post my result to help others. | Submit your build and measured tok/s for review. | Community builds | P3 |
| 40 | As a blogger, I want a clean export of my build to share. | A CSV and a text summary of the build. | Export | P2 |

## How the stories shape the site

1. **Start from what you own.** A "my PC" picker comes first (stories 1-10), then goals (11-20).
2. **Every answer is a plain sentence and a reason.** The checks list names the problem and the fix (36).
3. **Every number has a date and a source** (32, 35).
4. **Anything not tested stays behind a flag** (the P2 and P3 rows).
