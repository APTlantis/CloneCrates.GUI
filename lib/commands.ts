import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface CloneIndexArgs {
  indexDir: string
  outputDir: string
  threads: number
  includeYanked: boolean
  verifyExisting: boolean
  bundle: boolean
  bundleMode: 'only' | 'add'
  bundleSizeGb: number
  bundlesOut: string
  manifest: string
  listen: string
  skipIndexUpdate: boolean
  dryRun: boolean
  baseUrl?: string
  limit?: number
  timeout?: number
  logFormat?: 'text' | 'json'
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  progressInterval?: string
  progressEvery?: number
  retries?: number
  retryBase?: string
  retryMax?: string
  maxConnsPerHost?: number
  maxIdleConns?: number
  maxIdlePerHost?: number
  idleTimeout?: string
  tlsTimeout?: string
}

export interface DownloadCratesArgs {
  indexDir: string
  out: string
  concurrency: number
  includeYanked: boolean
  verifyExisting: boolean
  manifest: string
  bundle: boolean
  bundleMode: 'only' | 'add'
  bundleSizeGb: number
  bundlesOut: string
  listen: string
  dryRun: boolean
  baseUrl?: string
  limit?: number
  timeout?: number
  logFormat?: 'text' | 'json'
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  progressInterval?: string
  progressEvery?: number
  retries?: number
  retryBase?: string
  retryMax?: string
  maxConnsPerHost?: number
  maxIdleConns?: number
  maxIdlePerHost?: number
  idleTimeout?: string
  tlsTimeout?: string
}

export interface GenerateSidecarsArgs {
  indexDir: string
  out: string
  outputMode: 'files' | 'jsonl'
  jsonlOut: string
  includeYanked: boolean
  manifest: string
  limit: number
  concurrency?: number
  progressInterval?: string
  progressEvery?: number
  logFormat?: 'text' | 'json'
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  baseUrl?: string
}

export interface ExtractBundlesArgs {
  bundlesDir: string
  out: string
  pattern: string
  overwrite: boolean
}

export interface DownloadStatus {
  processed: number
  ok: number
  errors: number
  downloaded: number
  existing: number
  verified_existing: number
  uptime_sec: number
  rate_per_sec: number | string
}

export function runCloneIndex(args: CloneIndexArgs) {
  return invoke<number>('run_clone_index', { args })
}

export function runDownloadCrates(args: DownloadCratesArgs) {
  return invoke<number>('run_download_crates', { args })
}

export function runGenerateSidecars(args: GenerateSidecarsArgs) {
  return invoke<number>('run_generate_sidecars', { args })
}

export function runExtractBundles(args: ExtractBundlesArgs) {
  return invoke<number>('run_extract_bundles', { args })
}

export function fetchDownloadStatus(listenAddr: string) {
  return invoke<DownloadStatus>('fetch_download_status', { listenAddr })
}

export type LogEvent = 'clone-index://log' | 'download-crates://log' | 'generate-sidecars://log' | 'extract-bundles://log'

export function onLog(event: LogEvent, handler: (line: string) => void): Promise<UnlistenFn> {
  return listen<string>(event, (e) => handler(e.payload))
}
