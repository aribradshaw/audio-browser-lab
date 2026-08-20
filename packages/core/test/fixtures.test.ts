import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseReport, inspectMp3, REPORT_SCHEMA } from '../src'

describe('real synthetic MP3 fixtures', () => {
  it('distinguishes unindexed and indexed variable bitrate files', async () => {
    const root = resolve(import.meta.dirname, '../../..', 'test-fixtures')
    const unindexed = inspectMp3(await readFile(resolve(root, 'vbr-no-xing.mp3')))
    const indexed = inspectMp3(await readFile(resolve(root, 'vbr-indexed.mp3')))
    expect(unindexed).toMatchObject({ recognized: true, bitrateMode: 'VBR', seekTable: undefined })
    expect(indexed).toMatchObject({ recognized: true, bitrateMode: 'VBR', seekTable: { kind: 'Xing' }, durationConfidence: 'high' })
    const findings = diagnoseReport({ schema: REPORT_SCHEMA, generatedAt: new Date().toISOString(), mp3: unindexed })
    expect(findings.some((finding) => finding.id === 'mp3-vbr-without-index' && finding.confidence === 'high')).toBe(true)
  })
})
