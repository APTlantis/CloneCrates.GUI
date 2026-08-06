import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Box,
  ChevronRight,
  Clipboard,
  Code2,
  Database,
  FileCode2,
  Layers3,
  Play,
  Radio,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import {
  fetchDownloadStatus,
  onLog,
  runCloneIndex,
  runExtractBundles,
  runGenerateSidecars,
  type DownloadStatus,
} from '@/lib/commands'

type View = 'index' | 'monitor' | 'metadata' | 'extractor'

const navItems: { id: View; label: string; caption: string; icon: typeof Box }[] = [
  { id: 'index', label: 'Clone index', caption: 'Update index & download', icon: Box },
  { id: 'monitor', label: 'Monitor', caption: 'Live run telemetry', icon: Activity },
  { id: 'metadata', label: 'Sidecars', caption: 'generate-sidecars', icon: FileCode2 },
  { id: 'extractor', label: 'Extractor', caption: 'extract-bundles', icon: Layers3 },
]

const fieldClass = 'h-9 w-full border border-[var(--line)] bg-[var(--ink)] px-3 font-mono text-[12px] text-[var(--paper)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]/30'

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between border-b border-[var(--line)] pb-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--cyan)]">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl uppercase tracking-[0.08em] text-[var(--paper)]">{title}</h2>
      </div>
      {detail && <p className="font-mono text-[10px] text-[var(--muted)]">{detail}</p>}
    </div>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`border border-[var(--line)] bg-[var(--surface)]/80 p-4 shadow-[0_0_0_1px_rgba(126,173,191,0.03)] ${className}`}>{children}</section>
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{children}</label>
}

function StatusChip({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'cyan' | 'amber' | 'violet' | 'muted' }) {
  return <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${tone === 'green' ? 'border-[var(--green)]/40 text-[var(--green)]' : tone === 'cyan' ? 'border-[var(--cyan)]/40 text-[var(--cyan)]' : tone === 'amber' ? 'border-[var(--amber)]/50 text-[var(--amber)]' : tone === 'violet' ? 'border-[var(--violet)]/50 text-[var(--violet)]' : 'border-[var(--line)] text-[var(--muted)]'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>
}

function Button({ children, onClick, variant = 'primary', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'quiet'; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 border px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${variant === 'primary' ? 'border-[var(--cyan)] bg-[var(--cyan)] text-[var(--ink)] hover:bg-[var(--paper)]' : variant === 'secondary' ? 'border-[var(--cyan)]/60 text-[var(--cyan)] hover:bg-[var(--cyan)]/10' : 'border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--paper)]'}`}>{children}</button>
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-[var(--muted)]"><input type="checkbox" className="accent-[var(--cyan)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>
}

function LogPanel({ lines }: { lines: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [lines.length])
  return (
    <div className="h-56 overflow-y-auto border border-[var(--line)] bg-[var(--ink)] p-3 font-mono text-[11px] leading-6 text-[var(--muted)]">
      {lines.length === 0 && <p className="text-[var(--muted)]">[no output yet]</p>}
      {lines.map((line, i) => <div key={i} className="whitespace-pre-wrap text-[var(--paper)]">{line}</div>)}
      <div ref={bottomRef} />
    </div>
  )
}

function CloneIndexView() {
  const [form, setForm] = useState({
    indexDir: 'C:\\Rust-Crates\\crates.io-index',
    outputDir: 'C:\\Rust-Crates\\mirror',
    threads: '128',
    includeYanked: false,
    verifyExisting: false,
    bundle: false,
    bundleMode: 'only' as 'only' | 'add',
    bundleSizeGb: '8',
    bundlesOut: 'C:\\Rust-Crates\\bundles',
    manifest: 'C:\\Rust-Crates\\manifest.jsonl',
    listen: ':9090',
    skipIndexUpdate: false,
    dryRun: false,
    baseUrl: 'https://static.crates.io/crates',
    limit: '0',
    timeout: '300',
    logFormat: 'text' as 'text' | 'json',
    logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
    progressInterval: '5s',
    progressEvery: '0',
    retries: '6',
    retryBase: '500ms',
    retryMax: '30s',
    maxConnsPerHost: '0',
    maxIdleConns: '0',
    maxIdlePerHost: '0',
    idleTimeout: '',
    tlsTimeout: '',
  })
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    onLog('clone-index://log', (line) => setLogs((prev) => [...prev.slice(-499), line])).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [])

  const command = useMemo(() => {
    const parts = ['clone/update crates.io-index', 'download-crates', `-index-dir ${form.indexDir}`, `-out ${form.outputDir}`, `-concurrency ${form.threads}`, `-manifest ${form.manifest}`, `-listen ${form.listen}`]
    if (form.includeYanked) parts.push('--include-yanked')
    if (form.verifyExisting) parts.push('--verify-existing')
    if (form.bundle) parts.push(`-bundle -bundle-mode ${form.bundleMode} -bundle-size-gb ${form.bundleSizeGb} -bundles-out ${form.bundlesOut}`)
    if (form.skipIndexUpdate) parts.push('--skip-index-update')
    if (form.dryRun) parts.push('-dry-run')
    if (form.baseUrl) parts.push(`-crates-base-url ${form.baseUrl}`)
    if (Number(form.limit) > 0) parts.push(`-limit ${form.limit}`)
    if (Number(form.timeout) > 0) parts.push(`-timeout ${form.timeout}`)
    if (form.logFormat !== 'text') parts.push(`-log-format ${form.logFormat}`)
    if (form.logLevel !== 'info') parts.push(`-log-level ${form.logLevel}`)
    if (form.progressInterval) parts.push(`-progress-interval ${form.progressInterval}`)
    if (Number(form.progressEvery) > 0) parts.push(`-progress-every ${form.progressEvery}`)
    if (Number(form.retries) !== 6) parts.push(`-retries ${form.retries}`)
    if (form.retryBase !== '500ms') parts.push(`-retry-base ${form.retryBase}`)
    if (form.retryMax !== '30s') parts.push(`-retry-max ${form.retryMax}`)
    return parts.join(' ')
  }, [form])

  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))
  const applyPreset = (preset: 'balanced' | 'bundle' | 'integrity') => {
    setForm((current) => {
      if (preset === 'bundle') return { ...current, bundle: true, bundleMode: 'only', bundleSizeGb: '8', verifyExisting: false, threads: '128', dryRun: false }
      if (preset === 'integrity') return { ...current, verifyExisting: true, bundle: false, threads: '64', dryRun: false }
      return { ...current, bundle: false, verifyExisting: false, threads: '128', dryRun: false }
    })
  }

  const start = async () => {
    setRunning(true)
    setNotice('Run started')
    setLogs([])
    try {
      const code = await runCloneIndex({
        indexDir: form.indexDir,
        outputDir: form.outputDir,
        threads: Number(form.threads) || 0,
        includeYanked: form.includeYanked,
        verifyExisting: form.verifyExisting,
        bundle: form.bundle,
        bundleMode: form.bundleMode,
        bundleSizeGb: Number(form.bundleSizeGb) || 0,
        bundlesOut: form.bundlesOut,
        manifest: form.manifest,
        listen: form.listen,
        skipIndexUpdate: form.skipIndexUpdate,
        dryRun: form.dryRun,
        baseUrl: form.baseUrl,
        limit: Number(form.limit) || 0,
        timeout: Number(form.timeout) || 0,
        logFormat: form.logFormat,
        logLevel: form.logLevel,
        progressInterval: form.progressInterval,
        progressEvery: Number(form.progressEvery) || 0,
        retries: Number(form.retries) || 0,
        retryBase: form.retryBase,
        retryMax: form.retryMax,
        maxConnsPerHost: Number(form.maxConnsPerHost) || 0,
        maxIdleConns: Number(form.maxIdleConns) || 0,
        maxIdlePerHost: Number(form.maxIdlePerHost) || 0,
        idleTimeout: form.idleTimeout,
        tlsTimeout: form.tlsTimeout,
      })
      setNotice(code === 0 ? 'Run completed' : `Run exited with code ${code}`)
    } catch (err) {
      setNotice(`Run failed: ${err}`)
    } finally {
      setRunning(false)
    }
  }

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--cyan)]">01 / acquisition workflow</p><h1 className="mt-2 font-display text-3xl uppercase tracking-[0.06em] text-[var(--paper)] md:text-4xl">Clone index</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Clone or update the local crates.io-index checkout, then invoke the packaged Go downloader.</p></div>
      <StatusChip tone={running ? 'amber' : 'green'}>{running ? 'run active' : 'workspace ready'}</StatusChip>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
      <Panel><SectionHeading eyebrow="Configuration" title="Workflow parameters" detail="packaged runtime" />
      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <Button variant="secondary" onClick={() => applyPreset('balanced')}>Balanced mirror</Button>
        <Button variant="secondary" onClick={() => applyPreset('bundle')}>Bundle archive</Button>
        <Button variant="secondary" onClick={() => applyPreset('integrity')}>Integrity sweep</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label>index dir</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" /><input className={`${fieldClass} pl-9`} value={form.indexDir} onChange={(e) => update('indexDir', e.target.value)} /></div></div>
        <div><Label>output dir</Label><input className={fieldClass} value={form.outputDir} onChange={(e) => update('outputDir', e.target.value)} /></div>
        <div><Label>threads (-concurrency)</Label><input type="number" min="1" max="512" className={fieldClass} value={form.threads} onChange={(e) => update('threads', e.target.value)} /></div>
        <div><Label>manifest path</Label><input className={fieldClass} value={form.manifest} onChange={(e) => update('manifest', e.target.value)} /></div>
        <div><Label>listen addr (metrics)</Label><input className={fieldClass} value={form.listen} onChange={(e) => update('listen', e.target.value)} /></div>
        {form.bundle && <>
          <div><Label>bundle mode</Label><select className={fieldClass} value={form.bundleMode} onChange={(e) => update('bundleMode', e.target.value)}><option value="only">only</option><option value="add">add</option></select></div>
          <div><Label>bundle size (GB)</Label><input type="number" min="1" className={fieldClass} value={form.bundleSizeGb} onChange={(e) => update('bundleSizeGb', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>bundles out</Label><input className={fieldClass} value={form.bundlesOut} onChange={(e) => update('bundlesOut', e.target.value)} /></div>
        </>}
      </div><div className="mt-5 grid gap-2 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
        <Checkbox checked={form.includeYanked} onChange={(v) => update('includeYanked', v)} label="include yanked" />
        <Checkbox checked={form.verifyExisting} onChange={(v) => update('verifyExisting', v)} label="verify existing" />
        <Checkbox checked={form.bundle} onChange={(v) => update('bundle', v)} label="bundle output" />
        <Checkbox checked={form.skipIndexUpdate} onChange={(v) => update('skipIndexUpdate', v)} label="skip index update" />
        <Checkbox checked={form.dryRun} onChange={(v) => update('dryRun', v)} label="dry run" />
      </div>
      {(form.verifyExisting || form.bundleMode === 'add') && <div className="mt-4 border border-[var(--amber)]/40 bg-[var(--amber)]/5 p-3 font-mono text-[11px] leading-5 text-[var(--amber)]">{form.verifyExisting ? 'verify-existing hashes existing crate files before trusting them' : 'bundle-mode add keeps loose files and bundle copies'}</div>}
      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <Button variant="quiet" onClick={() => setAdvancedOpen(!advancedOpen)}><Settings2 className="h-3.5 w-3.5" />{advancedOpen ? 'Hide advanced settings' : 'Show advanced settings'}</Button>
      </div>
      {advancedOpen && <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 md:grid-cols-3">
        <div className="md:col-span-3"><Label>crates base url</Label><input className={fieldClass} value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} /></div>
        <div><Label>limit</Label><input type="number" min="0" className={fieldClass} value={form.limit} onChange={(e) => update('limit', e.target.value)} /></div>
        <div><Label>timeout seconds</Label><input type="number" min="1" className={fieldClass} value={form.timeout} onChange={(e) => update('timeout', e.target.value)} /></div>
        <div><Label>retries</Label><input type="number" min="0" className={fieldClass} value={form.retries} onChange={(e) => update('retries', e.target.value)} /></div>
        <div><Label>retry base</Label><input className={fieldClass} value={form.retryBase} onChange={(e) => update('retryBase', e.target.value)} /></div>
        <div><Label>retry max</Label><input className={fieldClass} value={form.retryMax} onChange={(e) => update('retryMax', e.target.value)} /></div>
        <div><Label>progress interval</Label><input className={fieldClass} value={form.progressInterval} onChange={(e) => update('progressInterval', e.target.value)} /></div>
        <div><Label>progress every</Label><input type="number" min="0" className={fieldClass} value={form.progressEvery} onChange={(e) => update('progressEvery', e.target.value)} /></div>
        <div><Label>log format</Label><select className={fieldClass} value={form.logFormat} onChange={(e) => update('logFormat', e.target.value)}><option value="text">text</option><option value="json">json</option></select></div>
        <div><Label>log level</Label><select className={fieldClass} value={form.logLevel} onChange={(e) => update('logLevel', e.target.value)}><option value="debug">debug</option><option value="info">info</option><option value="warn">warn</option><option value="error">error</option></select></div>
        <div><Label>max conns per host</Label><input type="number" min="0" className={fieldClass} value={form.maxConnsPerHost} onChange={(e) => update('maxConnsPerHost', e.target.value)} /></div>
        <div><Label>max idle conns</Label><input type="number" min="0" className={fieldClass} value={form.maxIdleConns} onChange={(e) => update('maxIdleConns', e.target.value)} /></div>
        <div><Label>max idle per host</Label><input type="number" min="0" className={fieldClass} value={form.maxIdlePerHost} onChange={(e) => update('maxIdlePerHost', e.target.value)} /></div>
        <div><Label>idle timeout</Label><input className={fieldClass} value={form.idleTimeout} onChange={(e) => update('idleTimeout', e.target.value)} /></div>
        <div><Label>tls timeout</Label><input className={fieldClass} value={form.tlsTimeout} onChange={(e) => update('tlsTimeout', e.target.value)} /></div>
      </div>}
      </Panel>
      <Panel className="flex flex-col"><SectionHeading eyebrow="Command preview" title="Staged invocation" detail="shell / safe" /><div className="flex-1 border border-[var(--line)] bg-[var(--ink)] p-3"><div className="mb-3 flex items-center justify-between font-mono text-[10px] text-[var(--muted)]"><span>CloneCratesio</span><Code2 className="h-3.5 w-3.5" /></div><code className="block break-words font-mono text-[12px] leading-6 text-[var(--green)]"><span className="text-[var(--muted)]">$</span> {command}</code></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={start} disabled={running}><Play className="h-3.5 w-3.5" />{running ? 'Running…' : 'Start download'}</Button><Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(command); setNotice('Command copied') }}><Clipboard className="h-3.5 w-3.5" />Copy command</Button></div>{notice && <p className="mt-3 font-mono text-[10px] text-[var(--green)]">[{notice}]</p>}</Panel>
    </div>
    <Panel><SectionHeading eyebrow="Output" title="Wrapper & downloader log" detail="stdout + stderr" /><LogPanel lines={logs} /></Panel>
  </div>
}

function MonitorView() {
  const [listenAddr, setListenAddr] = useState(':9090')
  const [polling, setPolling] = useState(true)
  const [status, setStatus] = useState<DownloadStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const rate = status ? Number(status.rate_per_sec) : NaN

  useEffect(() => {
    const unlisteners: Array<() => void> = []
    for (const event of ['clone-index://log', 'download-crates://log', 'generate-sidecars://log', 'extract-bundles://log'] as const) {
      onLog(event, (line) => setLogs((prev) => [...prev.slice(-499), line])).then((fn) => unlisteners.push(fn))
    }
    return () => unlisteners.forEach((fn) => fn())
  }, [])

  useEffect(() => {
    if (!polling) return
    let cancelled = false
    const tick = async () => {
      try {
        const next = await fetchDownloadStatus(listenAddr)
        if (!cancelled) { setStatus(next); setStatusError('') }
      } catch (err) {
        if (!cancelled) setStatusError(String(err))
      }
    }
    tick()
    const id = window.setInterval(tick, 2000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [polling, listenAddr])

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--cyan)]">02 / runtime telemetry</p><h1 className="mt-2 font-display text-3xl uppercase tracking-[0.06em] text-[var(--paper)]">Monitor</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Poll download-crates' /api/status endpoint and tail streamed process output.</p></div>
      <Button variant="secondary" onClick={() => setPolling(!polling)}>{polling ? <><X className="h-3.5 w-3.5" />Pause polling</> : <><Play className="h-3.5 w-3.5" />Resume polling</>}</Button>
    </div>
    <Panel><SectionHeading eyebrow="Active run" title={status ? `${status.processed} processed` : 'no data yet'} detail={statusError || 'auto-refresh / 2s'} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="ok" value={String(status?.ok ?? '—')} accent="green" />
      <Metric label="errors" value={String(status?.errors ?? '—')} accent="amber" />
      <Metric label="rate/sec" value={Number.isFinite(rate) ? rate.toFixed(1) : '—'} accent="cyan" />
      <Metric label="uptime (s)" value={String(status?.uptime_sec ?? '—')} accent="violet" />
    </div></Panel>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel><SectionHeading eyebrow="Event stream" title="Process output" detail="tail -f" /><LogPanel lines={logs} /></Panel>
      <Panel><SectionHeading eyebrow="Endpoint" title="Telemetry surface" detail="download-crates -listen" /><Label>listen address</Label><div className="flex gap-2"><input className={fieldClass} value={listenAddr} onChange={(e) => setListenAddr(e.target.value)} placeholder=":9090 or host:port" /></div><div className="mt-5 space-y-3"><div className="flex items-center justify-between"><span className="font-mono text-[11px] text-[var(--muted)]">status endpoint</span><StatusChip tone={statusError ? 'amber' : 'green'}>{statusError ? 'unreachable' : 'healthy'}</StatusChip></div><div className="flex items-center justify-between"><span className="font-mono text-[11px] text-[var(--muted)]">downloaded</span><span className="font-mono text-[11px] text-[var(--paper)]">{status?.downloaded ?? '—'}</span></div><div className="flex items-center justify-between"><span className="font-mono text-[11px] text-[var(--muted)]">verified existing</span><span className="font-mono text-[11px] text-[var(--paper)]">{status?.verified_existing ?? '—'}</span></div></div></Panel>
    </div>
  </div>
}

function Metric({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'green' | 'amber' | 'violet' }) { return <div className="border-l-2 bg-[var(--ink)] p-3" style={{ borderColor: `var(--${accent})` }}><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p><p className="mt-2 font-display text-2xl tracking-[0.04em] text-[var(--paper)]">{value}</p></div> }

function MetadataView() {
  const [form, setForm] = useState({
    indexDir: 'C:\\Rust-Crates\\crates.io-index',
    out: 'C:\\Rust-Crates\\mirror',
    outputMode: 'files' as 'files' | 'jsonl',
    jsonlOut: 'C:\\Rust-Crates\\sidecars.jsonl',
    includeYanked: false,
    manifest: '',
    limit: '0',
    concurrency: '128',
    progressInterval: '5s',
    progressEvery: '0',
    logFormat: 'text' as 'text' | 'json',
    logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
    baseUrl: 'https://static.crates.io/crates',
  })
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    let unlisten: (() => void) | undefined
    onLog('generate-sidecars://log', (line) => setLogs((prev) => [...prev.slice(-499), line])).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [])

  const command = useMemo(() => {
    const parts = ['generate-sidecars', `-index-dir ${form.indexDir}`]
    if (form.outputMode === 'jsonl') parts.push(`-output-mode jsonl -jsonl-out ${form.jsonlOut}`)
    else parts.push(`-out ${form.out}`)
    if (form.includeYanked) parts.push('-include-yanked')
    if (form.manifest) parts.push(`-manifest ${form.manifest}`)
    if (Number(form.limit) > 0) parts.push(`-limit ${form.limit}`)
    if (Number(form.concurrency) !== 128) parts.push(`-concurrency ${form.concurrency}`)
    if (form.progressInterval) parts.push(`-progress-interval ${form.progressInterval}`)
    if (Number(form.progressEvery) > 0) parts.push(`-progress-every ${form.progressEvery}`)
    if (form.logFormat !== 'text') parts.push(`-log-format ${form.logFormat}`)
    if (form.logLevel !== 'info') parts.push(`-log-level ${form.logLevel}`)
    return parts.join(' ')
  }, [form])

  const run = async () => {
    setRunning(true)
    setNotice('Run started')
    setLogs([])
    try {
      const code = await runGenerateSidecars({
        indexDir: form.indexDir,
        out: form.out,
        outputMode: form.outputMode,
        jsonlOut: form.jsonlOut,
        includeYanked: form.includeYanked,
        manifest: form.manifest,
        limit: Number(form.limit) || 0,
        concurrency: Number(form.concurrency) || 0,
        progressInterval: form.progressInterval,
        progressEvery: Number(form.progressEvery) || 0,
        logFormat: form.logFormat,
        logLevel: form.logLevel,
        baseUrl: form.baseUrl,
      })
      setNotice(code === 0 ? 'Run completed' : `Run exited with code ${code}`)
    } catch (err) {
      setNotice(`Run failed: ${err}`)
    } finally {
      setRunning(false)
    }
  }

  return <div className="space-y-5">
    <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--cyan)]">03 / metadata workflow</p><div className="mt-2 flex items-center gap-3"><Database className="h-7 w-7 text-[var(--cyan)]" /><h1 className="font-display text-3xl uppercase tracking-[0.06em] text-[var(--paper)]">Sidecars</h1></div><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Generate per-crate metadata from the local index, as loose .crate.json files or one aggregated JSONL stream.</p></div>
    <Panel><SectionHeading eyebrow="Configuration" title="generate-sidecars parameters" detail="files / jsonl" /><div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><Label>index dir</Label><input className={fieldClass} value={form.indexDir} onChange={(e) => update('indexDir', e.target.value)} /></div>
      <div><Label>output mode</Label><select className={fieldClass} value={form.outputMode} onChange={(e) => update('outputMode', e.target.value)}><option value="files">files (.crate.json)</option><option value="jsonl">jsonl (aggregated)</option></select></div>
      {form.outputMode === 'files' ? <div><Label>mirror out dir</Label><input className={fieldClass} value={form.out} onChange={(e) => update('out', e.target.value)} /></div>
        : <div><Label>jsonl out path</Label><input className={fieldClass} value={form.jsonlOut} onChange={(e) => update('jsonlOut', e.target.value)} /></div>}
      <div><Label>manifest (enrichment, optional)</Label><input className={fieldClass} value={form.manifest} onChange={(e) => update('manifest', e.target.value)} placeholder="downloader manifest.jsonl" /></div>
      <div><Label>limit (0 = unlimited)</Label><input type="number" min="0" className={fieldClass} value={form.limit} onChange={(e) => update('limit', e.target.value)} /></div>
    </div><div className="mt-5 border-t border-[var(--line)] pt-4"><Checkbox checked={form.includeYanked} onChange={(v) => update('includeYanked', v)} label="include yanked" /></div>
    <div className="mt-4 border-t border-[var(--line)] pt-4"><Button variant="quiet" onClick={() => setAdvancedOpen(!advancedOpen)}><Settings2 className="h-3.5 w-3.5" />{advancedOpen ? 'Hide advanced settings' : 'Show advanced settings'}</Button></div>
    {advancedOpen && <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 md:grid-cols-3">
      <div><Label>concurrency</Label><input type="number" min="1" className={fieldClass} value={form.concurrency} onChange={(e) => update('concurrency', e.target.value)} /></div>
      <div><Label>progress interval</Label><input className={fieldClass} value={form.progressInterval} onChange={(e) => update('progressInterval', e.target.value)} /></div>
      <div><Label>progress every</Label><input type="number" min="0" className={fieldClass} value={form.progressEvery} onChange={(e) => update('progressEvery', e.target.value)} /></div>
      <div><Label>log format</Label><select className={fieldClass} value={form.logFormat} onChange={(e) => update('logFormat', e.target.value)}><option value="text">text</option><option value="json">json</option></select></div>
      <div><Label>log level</Label><select className={fieldClass} value={form.logLevel} onChange={(e) => update('logLevel', e.target.value)}><option value="debug">debug</option><option value="info">info</option><option value="warn">warn</option><option value="error">error</option></select></div>
      <div className="md:col-span-3"><Label>crates base url</Label><input className={fieldClass} value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} /></div>
    </div>}
    </Panel>
    <Panel><SectionHeading eyebrow="Command preview" title="Staged invocation" detail="shell / safe" /><div className="border border-[var(--line)] bg-[var(--ink)] p-4 font-mono text-xs text-[var(--green)]"><span className="text-[var(--muted)]">$</span> {command}</div><div className="mt-4 flex gap-2"><Button onClick={run} disabled={running}><Play className="h-3.5 w-3.5" />{running ? 'Running…' : 'Run staged task'}</Button><Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(command); setNotice('Command copied') }}><Clipboard className="h-3.5 w-3.5" />Copy command</Button></div>{notice && <p className="mt-3 font-mono text-[10px] text-[var(--green)]">[{notice}]</p>}</Panel>
    <Panel><SectionHeading eyebrow="Output" title="generate-sidecars log" detail="stdout + stderr" /><LogPanel lines={logs} /></Panel>
  </div>
}

function ExtractorView() {
  const [form, setForm] = useState({ bundlesDir: 'C:\\Rust-Crates\\bundles', out: 'C:\\Rust-Crates\\restored-mirror', pattern: '', overwrite: false })
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    let unlisten: (() => void) | undefined
    onLog('extract-bundles://log', (line) => setLogs((prev) => [...prev.slice(-499), line])).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [])

  const command = useMemo(() => {
    const parts = ['extract-bundles', `-bundles-dir ${form.bundlesDir}`, `-out ${form.out}`]
    if (form.pattern) parts.push(`-pattern ${form.pattern}`)
    if (form.overwrite) parts.push('-overwrite')
    return parts.join(' ')
  }, [form])

  const run = async () => {
    setRunning(true)
    setNotice('Run started')
    setLogs([])
    try {
      const code = await runExtractBundles({ bundlesDir: form.bundlesDir, out: form.out, pattern: form.pattern, overwrite: form.overwrite })
      setNotice(code === 0 ? 'Run completed' : `Run exited with code ${code}`)
    } catch (err) {
      setNotice(`Run failed: ${err}`)
    } finally {
      setRunning(false)
    }
  }

  return <div className="space-y-5">
    <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--cyan)]">04 / restoration workflow</p><div className="mt-2 flex items-center gap-3"><Layers3 className="h-7 w-7 text-[var(--cyan)]" /><h1 className="font-display text-3xl uppercase tracking-[0.06em] text-[var(--paper)]">Extractor</h1></div><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Restore .tar.zst bundles back into the normal crates.io shard layout.</p></div>
    <Panel><SectionHeading eyebrow="Configuration" title="extract-bundles parameters" detail="restore / shard layout" /><div className="grid gap-4 md:grid-cols-2">
      <div><Label>bundles dir</Label><input className={fieldClass} value={form.bundlesDir} onChange={(e) => update('bundlesDir', e.target.value)} /></div>
      <div><Label>output dir</Label><input className={fieldClass} value={form.out} onChange={(e) => update('out', e.target.value)} /></div>
      <div className="md:col-span-2"><Label>glob pattern (optional)</Label><input className={fieldClass} value={form.pattern} onChange={(e) => update('pattern', e.target.value)} placeholder="bundle-*.tar.zst" /></div>
    </div><div className="mt-5 border-t border-[var(--line)] pt-4"><Checkbox checked={form.overwrite} onChange={(v) => update('overwrite', v)} label="overwrite existing files" /></div></Panel>
    <Panel><SectionHeading eyebrow="Command preview" title="Staged invocation" detail="shell / safe" /><div className="border border-[var(--line)] bg-[var(--ink)] p-4 font-mono text-xs text-[var(--green)]"><span className="text-[var(--muted)]">$</span> {command}</div><div className="mt-4 flex gap-2"><Button onClick={run} disabled={running}><Play className="h-3.5 w-3.5" />{running ? 'Running…' : 'Run staged task'}</Button><Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(command); setNotice('Command copied') }}><Clipboard className="h-3.5 w-3.5" />Copy command</Button></div>{notice && <p className="mt-3 font-mono text-[10px] text-[var(--green)]">[{notice}]</p>}</Panel>
    <Panel><SectionHeading eyebrow="Output" title="extract-bundles log" detail="stdout + stderr" /><LogPanel lines={logs} /></Panel>
  </div>
}

export default function BlueSlateConsole() {
  const [view, setView] = useState<View>('index')
  const active = navItems.find((item) => item.id === view)!
  return <main className="min-h-screen bg-[var(--background)] text-[var(--paper)]"><div className="mx-auto flex min-h-screen max-w-[1500px] flex-col border-x border-[var(--line)]"><header className="flex min-h-20 items-center justify-between gap-5 border-b border-[var(--line)] px-5 py-4 lg:px-8"><div className="flex items-center gap-4"><div className="grid h-10 w-10 place-items-center border border-[var(--cyan)] text-[var(--cyan)]"><CompassMark /></div><div><p className="font-display text-lg uppercase tracking-[0.12em]">Clone Crates</p><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">CloneCratesio operator console</p></div></div><div className="hidden items-center gap-5 md:flex"><StatusChip tone="cyan">local mode</StatusChip></div></header><div className="flex flex-1 flex-col lg:flex-row"><aside className="w-full shrink-0 border-b border-[var(--line)] p-3 lg:w-64 lg:border-b-0 lg:border-r lg:p-5"><p className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Workflows</p><nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Console workflows">{navItems.map((item) => { const Icon = item.icon; const selected = item.id === view; return <button key={item.id} type="button" onClick={() => setView(item.id)} aria-current={selected ? 'page' : undefined} className={`group flex items-center gap-3 border px-3 py-3 text-left transition ${selected ? 'border-[var(--cyan)]/60 bg-[var(--cyan)]/10' : 'border-transparent hover:border-[var(--line)] hover:bg-[var(--surface)]'}`}><Icon className={`h-4 w-4 ${selected ? 'text-[var(--cyan)]' : 'text-[var(--muted)]'}`} /><span className="min-w-0"><span className={`block font-mono text-xs uppercase tracking-[0.1em] ${selected ? 'text-[var(--paper)]' : 'text-[var(--muted)]'}`}>{item.label}</span><span className="mt-1 block font-mono text-[10px] text-[var(--muted)]">{item.caption}</span></span>{selected && <ChevronRight className="ml-auto h-4 w-4 text-[var(--cyan)]" />}</button> })}</nav><div className="mt-8 hidden border-t border-[var(--line)] pt-5 lg:block"><p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Environment</p><div className="mt-3 space-y-3 px-2"><div className="flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]"><Radio className="h-3.5 w-3.5 text-[var(--green)]" />tauri backend connected</div><div className="flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]"><Settings2 className="h-3.5 w-3.5 text-[var(--muted)]" />CloneCratesio v1.1.0</div></div></div></aside><div className="flex-1 p-5 lg:p-8"><div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-3"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"><span>workspace</span><ChevronRight className="h-3 w-3" /><span className="text-[var(--paper)]">{active.label}</span></div></div>{view === 'index' && <CloneIndexView />}{view === 'monitor' && <MonitorView />}{view === 'metadata' && <MetadataView />}{view === 'extractor' && <ExtractorView />}</div></div><footer className="flex flex-col gap-2 border-t border-[var(--line)] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>Clone-Index.py / download-crates / generate-sidecars / extract-bundles</span><span>CloneCratesio local systems</span></footer></div></main>
}

function CompassMark() { return <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 fill-none stroke-current"><circle cx="16" cy="16" r="11" strokeWidth="1" /><path d="M16 7l2.5 6.5L25 16l-6.5 2.5L16 25l-2.5-6.5L7 16l6.5-2.5L16 7Z" strokeWidth="1" /><circle cx="16" cy="16" r="2" strokeWidth="1" /></svg> }
