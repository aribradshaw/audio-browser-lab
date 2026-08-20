import { describe, expect, it } from 'vitest'
import { compareReports, REPORT_SCHEMA, type AudioBrowserReport } from '../src'

const report = (browser: string, duration: number): AudioBrowserReport => ({
  schema: REPORT_SCHEMA,
  generatedAt: new Date(0).toISOString(),
  browser: { userAgent: browser },
  file: { name: 'test.mp3', size: 100, sha256: 'same' },
  media: { duration },
})

describe('compareReports', () => {
  it('detects meaningful cross-browser differences for the same file', () => {
    const result = compareReports(report('Chrome', 3600), report('Safari', 3580))
    expect(result.sameFile).toBe(true)
    expect(result.compatible).toBe(false)
    expect(result.differences[0]).toMatchObject({ path: 'media.duration', delta: -20, meaningful: true })
  })
})
