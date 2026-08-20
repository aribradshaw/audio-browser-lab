import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseReport, inspectMp3, REPORT_SCHEMA } from '../src'

describe('real synthetic MP3 fixtures', () => {
  const root = resolve(import.meta.dirname, '../../..', 'test-fixtures')

  it('keeps the redistributable fixture manifest aligned with the exact files', async () => {
    const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8')) as {
      schema: string
      license: string
      fixtures: Array<{
        id: string
        file: string
        sha256: string
        bytes: number
        mimeType: string
        license: string
        source: { kind: string; description: string; generator: string; command: string }
        format: { container: string; codec: string; sampleRate: number; channels: number; durationSeconds: number; bitrateMode: string; seekTable: string | null }
        bugClass: string
        expectedBehavior: string
      }>
    }

    expect(manifest).toMatchObject({ schema: 'audio-browser-lab/fixtures@1', license: 'CC0-1.0' })
    expect(manifest.fixtures).toHaveLength(2)
    for (const fixture of manifest.fixtures) {
      const bytes = await readFile(resolve(root, fixture.file))
      expect(createHash('sha256').update(bytes).digest('hex'), fixture.id).toBe(fixture.sha256)
      expect(bytes.byteLength, fixture.id).toBe(fixture.bytes)
      expect(fixture).toMatchObject({ mimeType: 'audio/mpeg', license: 'CC0-1.0' })
      expect(fixture.source).toMatchObject({ kind: 'generated', generator: 'FFmpeg libmp3lame' })
      expect(fixture.source.description.length, fixture.id).toBeGreaterThan(20)
      expect(fixture.source.command, fixture.id).toContain('ffmpeg')
      expect(fixture.format).toMatchObject({ container: 'MP3', codec: 'MPEG-1 Audio Layer III', sampleRate: 44100, channels: 1, bitrateMode: 'VBR' })
      expect(fixture.format.durationSeconds, fixture.id).toBeGreaterThan(0)
      expect(fixture.bugClass.length, fixture.id).toBeGreaterThan(5)
      expect(fixture.expectedBehavior.length, fixture.id).toBeGreaterThan(20)
    }
  })

  it('distinguishes unindexed and indexed variable bitrate files', async () => {
    const unindexed = inspectMp3(await readFile(resolve(root, 'vbr-no-xing.mp3')))
    const indexed = inspectMp3(await readFile(resolve(root, 'vbr-indexed.mp3')))
    expect(unindexed).toMatchObject({ recognized: true, bitrateMode: 'VBR', seekTable: undefined })
    expect(indexed).toMatchObject({ recognized: true, bitrateMode: 'VBR', seekTable: { kind: 'Xing' }, durationConfidence: 'high' })
    const findings = diagnoseReport({ schema: REPORT_SCHEMA, generatedAt: new Date().toISOString(), mp3: unindexed })
    expect(findings.some((finding) => finding.id === 'mp3-vbr-without-index' && finding.confidence === 'high')).toBe(true)
    const indexedFindings = diagnoseReport({ schema: REPORT_SCHEMA, generatedAt: new Date().toISOString(), mp3: indexed })
    expect(indexedFindings.some((finding) => finding.id === 'mp3-vbr-without-index')).toBe(false)
  })
})
