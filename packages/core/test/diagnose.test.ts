import { describe, expect, it } from 'vitest'
import { diagnoseReport, REPORT_SCHEMA, type AudioBrowserReport } from '../src'

const base = (): AudioBrowserReport => ({ schema: REPORT_SCHEMA, generatedAt: new Date(0).toISOString() })

describe('diagnoseReport', () => {
  it('flags browser duration disagreement', () => {
    expect(diagnoseReport({ ...base(), media: { duration: 3600 }, webAudio: { duration: 3580 } })).toContainEqual(expect.objectContaining({ id: 'duration-source-disagreement', severity: 'error' }))
  })

  it('flags VBR MP3 files without a seek table', () => {
    const findings = diagnoseReport({ ...base(), mp3: { recognized: true, fileBytes: 1000, id3v2: { present: false }, id3v1: false, bitrateMode: 'VBR', sampledBitratesKbps: [96, 128, 192], notes: [] } })
    expect(findings).toContainEqual(expect.objectContaining({ id: 'mp3-vbr-without-index', questionId: 'howler-cross-browser-seek' }))
  })

  it('warns about large decoded PCM allocations', () => {
    expect(diagnoseReport({ ...base(), webAudio: { duration: 7200, sampleRate: 48_000, channels: 2 } })).toContainEqual(expect.objectContaining({ id: 'webaudio-large-allocation' }))
  })
})
