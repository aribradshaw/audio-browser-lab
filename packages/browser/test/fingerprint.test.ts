import { describe, expect, it } from 'vitest'
import { fingerprintPcm } from '../src'

describe('fingerprintPcm', () => {
  it('is deterministic and changes with the audible window', () => {
    const samples = new Float32Array(48_000)
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.sin(2 * Math.PI * 440 * index / 48_000)
    const first = fingerprintPcm([samples], 48_000, 0, 100)
    const repeated = fingerprintPcm([samples], 48_000, 0, 100)
    const silence = fingerprintPcm([new Float32Array(48_000)], 48_000, 0, 100)
    expect(first.fingerprint).toBe(repeated.fingerprint)
    expect(first.fingerprint).not.toBe(silence.fingerprint)
    expect(first.rms).toBeGreaterThan(0.7)
  })
})
