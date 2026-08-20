import type { IntegrationEvidence } from '@audio-browser-lab/core'

export interface HowlLike {
  duration(id?: number): number
  seek(): number | unknown
  state?(): string
  playing?(id?: number): boolean
  on(event: string, callback: (id?: number, detail?: unknown) => void): unknown
  off(event: string, callback?: (id?: number, detail?: unknown) => void): unknown
}

export interface ObserveHowlerOptions {
  version?: string
  backend?: IntegrationEvidence['backend']
  usingWebAudio?: boolean
  source?: string
}

export interface HowlerObserver {
  snapshot(): IntegrationEvidence
  stop(): void
}

const EVENTS = ['load', 'loaderror', 'play', 'pause', 'stop', 'end', 'seek', 'rate', 'unlock'] as const

export function observeHowl(howl: HowlLike, options: ObserveHowlerOptions = {}): HowlerObserver {
  const events: NonNullable<IntegrationEvidence['events']> = []
  const listeners = new Map<string, (id?: number, detail?: unknown) => void>()
  for (const event of EVENTS) {
    const listener = (id?: number, detail?: unknown) => {
      const rawSeek = howl.seek()
      const value = event === 'loaderror'
        ? String(detail ?? id ?? 'unknown load error')
        : typeof rawSeek === 'number' ? rawSeek : id
      events.push({ event, at: new Date().toISOString(), value })
    }
    listeners.set(event, listener)
    howl.on(event, listener)
  }

  return {
    snapshot() {
      const rawSeek = howl.seek()
      return {
        library: 'howler',
        version: options.version,
        backend: options.backend ?? (options.usingWebAudio == null ? 'unknown' : options.usingWebAudio ? 'webaudio' : 'html5'),
        duration: howl.duration(),
        currentTime: typeof rawSeek === 'number' ? rawSeek : undefined,
        events: [...events],
        details: { state: howl.state?.(), playing: howl.playing?.(), source: options.source },
      }
    },
    stop() {
      for (const [event, listener] of listeners) howl.off(event, listener)
      listeners.clear()
    },
  }
}
