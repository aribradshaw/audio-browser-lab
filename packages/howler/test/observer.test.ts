import { describe, expect, it } from 'vitest'
import { observeHowl } from '../src'

describe('observeHowl', () => {
  it('captures public Howler measurements and events', () => {
    const listeners = new Map<string, (id?: number) => void>()
    const howl = {
      duration: () => 120,
      seek: () => 30,
      state: () => 'loaded',
      playing: () => true,
      on: (event: string, callback: (id?: number) => void) => listeners.set(event, callback),
      off: (event: string) => listeners.delete(event),
    }
    const observer = observeHowl(howl, { version: '2.2.4', usingWebAudio: true })
    listeners.get('seek')?.(1)
    expect(observer.snapshot()).toMatchObject({ library: 'howler', backend: 'webaudio', duration: 120, currentTime: 30 })
    expect(observer.snapshot().events).toHaveLength(1)
    observer.stop()
    expect(listeners.size).toBe(0)
  })
})
