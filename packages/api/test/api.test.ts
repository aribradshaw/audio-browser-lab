import { afterEach, describe, expect, it } from 'vitest'
import type { Server } from 'node:http'
import { createAudioBrowserLabApi } from '../src'

let server: Server | undefined
afterEach(() => new Promise<void>((resolve) => server?.close(() => resolve()) ?? resolve()))

async function start() {
  server = createAudioBrowserLabApi()
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test address')
  return `http://127.0.0.1:${address.port}`
}

describe('HTTP API', () => {
  it('serves health and all questions', async () => {
    const base = await start()
    expect((await (await fetch(`${base}/health`)).json()).ok).toBe(true)
    expect(await (await fetch(`${base}/v1/questions`)).json()).toHaveLength(8)
  })

  it('diagnoses a submitted report', async () => {
    const base = await start()
    const response = await fetch(`${base}/v1/diagnose`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schema: 'audio-browser-lab/report@0.2', generatedAt: new Date().toISOString(), webAudio: { error: 'decode failed' } }) })
    const result = await response.json() as { findings: Array<{ id: string }> }
    expect(result.findings.some((finding) => finding.id === 'webaudio-decode-failure')).toBe(true)
  })
})
