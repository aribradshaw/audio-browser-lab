import { describe, expect, it } from 'vitest'
import { observeWaveSurfer } from '../src'

describe('observeWaveSurfer', () => {
  it('captures public duration, time, scroll, and events', () => {
    const listeners = new Map<string, (...args: unknown[]) => void>()
    const ws = {
      getDuration: () => 90,
      getCurrentTime: () => 12,
      isPlaying: () => false,
      getScroll: () => 400,
      getWidth: () => 800,
      on: (event: string, callback: (...args: unknown[]) => void) => { listeners.set(event, callback); return () => listeners.delete(event) },
    }
    const observer = observeWaveSurfer(ws, { version: '7.12.11' })
    listeners.get('scroll')?.(10, 20)
    expect(observer.snapshot()).toMatchObject({ library: 'wavesurfer', duration: 90, currentTime: 12, details: { scroll: 400, width: 800 } })
    expect(observer.snapshot().events).toHaveLength(1)
    observer.stop()
    expect(listeners.size).toBe(0)
  })
})
