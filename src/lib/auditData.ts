import gpus from '../data/parts/gpus.json'
import boards from '../data/parts/boards.json'
import adapters from '../data/parts/adapters.json'
import psus from '../data/parts/psu.json'
import moe from '../data/models/moe.json'
import gamedev from '../data/models/gamedev.json'
import tasks from '../data/models/tasks.json'
import benchmarks from '../data/builds/community-benchmarks.json'
import heldGpus from '../data/parts/gpus-incomplete.json'
import drives from '../data/parts/nvme-catalogue.json'
import modelLinks from '../data/models/links.json'
import torrents from '../data/models/torrents.json'
import cases from '../data/parts/cases-catalogue.json'
import ram from '../data/parts/ram-catalogue.json'
import videos from '../data/builds/video-reports.json'
import images from '../data/images.json'
import pcs from '../data/builds/my-pcs.json'
import presets from '../data/builds/presets.json'
import affiliate from '../data/affiliate.json'
import rates from '../data/rates.json'
import currencies from '../data/currencies.json'
import budgets from '../data/builds/budgets.json'
import { disclosure } from './affiliate'
import type { AuditInput } from './audit'

/** The live site data, in the shape the audit expects. Used by the tests and by scripts/update-methodology.ts. */
export function liveAuditInput(today?: string): AuditInput {
  const files = Object.keys(import.meta.glob('../assets/parts/*.webp')).map((p) => p.split('/').pop()!)
  return {
    gpus, boards, adapters, psus, tasks: tasks.tasks as AuditInput['tasks'], benchmarks: benchmarks as AuditInput['benchmarks'],
    images: images as AuditInput['images'], imageFiles: files, pcs, presets, moe, gamedev, videos, drives, ram, cases, modelLinks, torrents, heldGpus, rates, currencies, budgets, affiliate, disclosureText: disclosure(), today,
  } as unknown as AuditInput
}
