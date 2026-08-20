import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { inspectFile, repairPlan, runCli } from '../src/library'

describe('CLI', () => {
  it('lists the diagnostic question catalog', async () => {
    const output: string[] = []
    expect(await runCli(['questions', '--json'], { out: (value) => output.push(value), error: (value) => output.push(value) })).toBe(0)
    expect(JSON.parse(output[0])).toHaveLength(8)
  })

  it('inspects a local file without uploading it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'abl-'))
    const path = join(directory, 'sample.bin')
    await writeFile(path, 'audio-ish')
    const report = await inspectFile(path)
    expect(report.file?.sha256).toHaveLength(64)
    expect(report.file?.name).toBe('sample.bin')
  })

  it('offers indexed VBR and CBR repair paths', () => {
    expect(repairPlan([{ id: 'mp3-vbr-without-index' } as never], 'song.mp3')).toHaveLength(2)
  })
})
