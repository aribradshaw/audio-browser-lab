import type { IntegrationEvidence } from '@audio-browser-lab/core'

export interface WaveSurferLike {
  getDuration(): number
  getCurrentTime(): number
  isPlaying?(): boolean
  getScroll?(): number
  getWidth?(): number
  on(event: string, callback: (...args: unknown[]) => void): (() => void) | unknown
}

export interface ObserveWaveSurferOptions {
  version?: string
  backend?: IntegrationEvidence['backend']
  source?: string
}

const EVENTS = ['ready', 'decode', 'load', 'error', 'play', 'pause', 'finish', 'seeking', 'scroll', 'redraw'] as const

export function observeWaveSurfer(wavesurfer: WaveSurferLike, options: ObserveWaveSurferOptions = {}) {
  const events: NonNullable<IntegrationEvidence['events']> = []
  const unsubscribers: Array<() => void> = []
  for (const event of EVENTS) {
    const unsubscribe = wavesurfer.on(event, (...args) => {
      const first = args[0]
      events.push({ event, at: new Date().toISOString(), value: typeof first === 'number' || typeof first === 'string' ? first : undefined })
    })
    if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe as () => void)
  }
  return {
    snapshot(): IntegrationEvidence {
      return {
        library: 'wavesurfer',
        version: options.version,
        backend: options.backend || 'media-element',
        duration: wavesurfer.getDuration(),
        currentTime: wavesurfer.getCurrentTime(),
        events: [...events],
        details: { playing: wavesurfer.isPlaying?.(), scroll: wavesurfer.getScroll?.(), width: wavesurfer.getWidth?.(), source: options.source },
      }
    },
    stop() {
      for (const unsubscribe of unsubscribers.splice(0)) unsubscribe()
    },
  }
}
