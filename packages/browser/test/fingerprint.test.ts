import { describe, expect, it } from 'vitest'
import { buildSeekPlan, fingerprintPcm } from '../src'

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

  it('builds repeated seek probes with bounded attempts', () => {
    expect(buildSeekPlan([10, 146.52], 2)).toEqual([
      { target: 10, attempt: 1 },
      { target: 10, attempt: 2 },
      { target: 146.52, attempt: 1 },
      { target: 146.52, attempt: 2 },
    ])
    expect(buildSeekPlan([10], 99)).toHaveLength(10)
  })
})
