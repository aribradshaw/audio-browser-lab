import { describe, expect, it } from 'vitest'
import { inspectMp3, parseMpegFrame } from '../src/mp3'

const header = Uint8Array.from([0xff, 0xfb, 0x90, 0x00])

const makeFrames = (count: number, withXing = false) => {
  const frameBytes = 417
  const bytes = new Uint8Array(frameBytes * count)
  for (let frame = 0; frame < count; frame += 1) bytes.set(header, frame * frameBytes)
  if (withXing) {
    const offset = 4 + 32
    bytes.set(new TextEncoder().encode('Xing'), offset)
    bytes.set([0, 0, 0, 3], offset + 4)
    const view = new DataView(bytes.buffer)
    view.setUint32(offset + 8, count, false)
    view.setUint32(offset + 12, bytes.length, false)
  }
  return bytes
}

describe('parseMpegFrame', () => {
  it('parses an MPEG-1 Layer III frame', () => {
    expect(parseMpegFrame(makeFrames(2), 0)).toMatchObject({ bitrateKbps: 128, sampleRate: 44_100, channels: 2, frameBytes: 417, samplesPerFrame: 1152 })
  })
})

describe('inspectMp3', () => {
  it('finds a Xing duration and seek metadata', () => {
    const result = inspectMp3(makeFrames(100, true))
    expect(result.recognized).toBe(true)
    expect(result.seekTable?.kind).toBe('Xing')
    expect(result.seekTable?.frames).toBe(100)
    expect(result.estimatedDuration).toBeCloseTo(100 * 1152 / 44_100)
  })

  it('accounts for a leading ID3v2 block', () => {
    const frames = makeFrames(3)
    const bytes = new Uint8Array(30 + frames.length)
    bytes.set(new TextEncoder().encode('ID3'))
    bytes.set([4, 0, 0, 0, 0, 0, 20], 3)
    bytes.set(frames, 30)
    const result = inspectMp3(bytes)
    expect(result.id3v2.totalBytes).toBe(30)
    expect(result.firstFrame?.offset).toBe(30)
  })
})
