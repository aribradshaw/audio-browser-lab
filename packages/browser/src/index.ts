import {
  REPORT_SCHEMA,
  diagnoseReport,
  inspectMp3,
  type AudioBrowserReport,
  type BrowserIdentity,
  type CodecSignal,
  type MediaElementEvidence,
  type NetworkEvidence,
  type SeekEvidence,
  type WebAudioEvidence,
} from '@audio-browser-lab/core'

type NavigatorWithMemory = Navigator & { deviceMemory?: number }

export interface AnalyzeBrowserFileOptions {
  decode?: boolean
  seekTargets?: number[]
  seekRepeats?: number
  timeoutMs?: number
}

export interface PcmFingerprint {
  fingerprint: string
  rms: number
  peak: number
  zeroCrossings: number
  samples: number
}

const CODECS = [
  ['MP3', 'audio/mpeg'],
  ['AAC / M4A', 'audio/mp4; codecs="mp4a.40.2"'],
  ['WAV PCM', 'audio/wav; codecs="1"'],
  ['Ogg Vorbis', 'audio/ogg; codecs="vorbis"'],
  ['Opus / WebM', 'audio/webm; codecs="opus"'],
  ['FLAC', 'audio/flac'],
] as const

const rangesToArray = (ranges: TimeRanges): Array<[number, number]> =>
  Array.from({ length: ranges.length }, (_, index) => [ranges.start(index), ranges.end(index)])

const timeout = <T>(promise: Promise<T>, timeoutMs: number, message: string) => new Promise<T>((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  promise.then((value) => { window.clearTimeout(timer); resolve(value) }, (error) => { window.clearTimeout(timer); reject(error) })
})

export function getBrowserIdentity(): BrowserIdentity {
  const nav = navigator as NavigatorWithMemory
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || undefined,
    language: navigator.language,
    cores: navigator.hardwareConcurrency || null,
    memoryGb: nav.deviceMemory || null,
    crossOriginIsolated: window.crossOriginIsolated,
    audioContext: Boolean(window.AudioContext),
    mediaCapabilities: 'mediaCapabilities' in navigator,
  }
}

export function getCodecSignals(): CodecSignal[] {
  const audio = document.createElement('audio')
  return CODECS.map(([label, mime]) => ({ label, mime, result: (audio.canPlayType(mime) || 'no') as CodecSignal['result'] }))
}

export async function sha256(input: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', input)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function fingerprintPcm(channels: Float32Array[], sampleRate: number, timeSeconds: number, windowMs = 250): PcmFingerprint {
  const start = Math.max(0, Math.floor(timeSeconds * sampleRate))
  const count = Math.max(1, Math.floor(windowMs / 1000 * sampleRate))
  let sumSquares = 0
  let peak = 0
  let zeroCrossings = 0
  let previous = 0
  const buckets = new Array(16).fill(0)
  let samples = 0
  for (let index = 0; index < count; index += 1) {
    let sample = 0
    for (const channel of channels) sample += channel[start + index] || 0
    sample /= Math.max(1, channels.length)
    sumSquares += sample * sample
    peak = Math.max(peak, Math.abs(sample))
    if (index > 0 && (sample >= 0) !== (previous >= 0)) zeroCrossings += 1
    previous = sample
    buckets[index % buckets.length] += Math.abs(sample)
    samples += 1
  }
  const maxBucket = Math.max(...buckets, Number.EPSILON)
  const signature = buckets.map((value) => Math.min(15, Math.round(value / maxBucket * 15)).toString(16)).join('')
  return {
    fingerprint: `${Math.round(timeSeconds * 1000).toString(36)}-${signature}-${zeroCrossings.toString(36)}`,
    rms: Math.sqrt(sumSquares / samples),
    peak,
    zeroCrossings,
    samples,
  }
}

export function fingerprintAudioBuffer(buffer: AudioBuffer, timeSeconds: number, windowMs = 250): PcmFingerprint {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index))
  return fingerprintPcm(channels, buffer.sampleRate, timeSeconds, windowMs)
}

export function buildSeekPlan(seekTargets: number[], seekRepeats = 1): Array<{ target: number, attempt: number }> {
  const repeats = Math.max(1, Math.min(10, Math.floor(seekRepeats) || 1))
  return seekTargets
    .filter((target) => Number.isFinite(target) && target >= 0)
    .flatMap((target) => Array.from({ length: repeats }, (_, index) => ({ target, attempt: index + 1 })))
}

async function measureMedia(url: string, seekTargets: number[], seekRepeats: number, timeoutMs: number): Promise<{ media: MediaElementEvidence; seeks: SeekEvidence[] }> {
  const audio = new Audio()
  audio.preload = 'metadata'
  audio.src = url
  try {
    await timeout(new Promise<void>((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => resolve(), { once: true })
      audio.addEventListener('error', () => reject(new Error(audio.error?.message || `Media error code ${audio.error?.code || 'unknown'}`)), { once: true })
      audio.load()
    }), timeoutMs, `Metadata load timed out after ${timeoutMs} ms.`)
  } catch (error) {
    return { media: { duration: null, error: error instanceof Error ? error.message : String(error) }, seeks: [] }
  }

  const media: MediaElementEvidence = {
    duration: Number.isFinite(audio.duration) ? audio.duration : null,
    readyState: audio.readyState,
    networkState: audio.networkState,
    seekable: rangesToArray(audio.seekable),
    buffered: rangesToArray(audio.buffered),
  }
  const seeks: SeekEvidence[] = []
  for (const { target, attempt } of buildSeekPlan(seekTargets, seekRepeats)) {
    if (!media.duration) break
    const requested = Math.max(0, Math.min(target, media.duration - 0.001))
    const started = performance.now()
    try {
      await timeout(new Promise<void>((resolve) => {
        audio.addEventListener('seeked', () => resolve(), { once: true })
        audio.currentTime = requested
      }), timeoutMs, `Seek to ${requested} seconds timed out.`)
      seeks.push({ requested, reported: audio.currentTime, delta: audio.currentTime - requested, attempt, completedMs: performance.now() - started })
    } catch {
      seeks.push({ requested, reported: audio.currentTime, delta: audio.currentTime - requested, attempt, completedMs: performance.now() - started })
    }
  }
  audio.removeAttribute('src')
  audio.load()
  return { media, seeks }
}

export async function analyzeBrowserFile(file: File, options: AnalyzeBrowserFileOptions = {}): Promise<AudioBrowserReport> {
  const { decode = true, seekTargets = [5], seekRepeats = 1, timeoutMs = 10_000 } = options
  const data = await file.arrayBuffer()
  const objectUrl = URL.createObjectURL(file)
  const { media, seeks } = await measureMedia(objectUrl, seekTargets, seekRepeats, timeoutMs)
  let webAudio: WebAudioEvidence | null = null
  if (decode) {
    const context = new AudioContext()
    const started = performance.now()
    try {
      const buffer = await context.decodeAudioData(data.slice(0))
      webAudio = {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        frames: buffer.length,
        decodeMs: performance.now() - started,
        estimatedPcmBytes: buffer.length * buffer.numberOfChannels * 4,
      }
      for (const seek of seeks) seek.audibleFingerprint = fingerprintAudioBuffer(buffer, seek.requested).fingerprint
    } catch (error) {
      webAudio = { error: error instanceof Error ? error.message : String(error) }
    } finally {
      await context.close()
    }
  }
  URL.revokeObjectURL(objectUrl)

  const report: AudioBrowserReport = {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    browser: getBrowserIdentity(),
    file: { name: file.name, type: file.type, size: file.size, modified: file.lastModified, sha256: await sha256(data) },
    codecs: getCodecSignals(),
    media,
    webAudio,
    seeks,
    mp3: file.type === 'audio/mpeg' || /\.mp3$/i.test(file.name) ? inspectMp3(data) : null,
  }
  return { ...report, findings: diagnoseReport(report) }
}

export async function probeRemoteAudio(url: string): Promise<NetworkEvidence> {
  try {
    const head = await fetch(url, { method: 'HEAD' })
    const range = await fetch(url, { headers: { Range: 'bytes=0-0' } })
    await range.body?.cancel()
    return {
      url,
      status: head.status,
      contentType: head.headers.get('content-type'),
      contentLength: Number(head.headers.get('content-length')) || null,
      acceptRanges: head.headers.get('accept-ranges'),
      contentRange: range.headers.get('content-range'),
      corsReadable: true,
      rangeRequestStatus: range.status,
    }
  } catch (error) {
    return { url, corsReadable: false, error: error instanceof Error ? error.message : String(error) }
  }
}
