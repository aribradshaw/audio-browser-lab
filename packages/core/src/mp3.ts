import type { Id3v2Inspection, Mp3Inspection, Mp3SeekTableInspection, MpegFrameInspection } from './types'

const BITRATES_MPEG1: Record<number, number[]> = {
  1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
}

const BITRATES_MPEG2: Record<number, number[]> = {
  1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}

const SAMPLE_RATES = {
  '1': [44_100, 48_000, 32_000],
  '2': [22_050, 24_000, 16_000],
  '2.5': [11_025, 12_000, 8_000],
} as const

const ascii = (bytes: Uint8Array, offset: number, length: number) => {
  if (offset < 0 || offset + length > bytes.length) return ''
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

const u32be = (bytes: Uint8Array, offset: number) => {
  if (offset < 0 || offset + 4 > bytes.length) return 0
  return ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0
}

const synchsafe = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset] & 0x7f) << 21) |
  ((bytes[offset + 1] & 0x7f) << 14) |
  ((bytes[offset + 2] & 0x7f) << 7) |
  (bytes[offset + 3] & 0x7f)

function inspectId3v2(bytes: Uint8Array): Id3v2Inspection {
  if (bytes.length < 10 || ascii(bytes, 0, 3) !== 'ID3') return { present: false }
  const payloadBytes = synchsafe(bytes, 6)
  const flags = bytes[5]
  const footerBytes = flags & 0x10 ? 10 : 0
  return {
    present: true,
    version: `2.${bytes[3]}.${bytes[4]}`,
    flags,
    payloadBytes,
    totalBytes: Math.min(bytes.length, 10 + payloadBytes + footerBytes),
  }
}

export function parseMpegFrame(bytes: Uint8Array, offset: number): MpegFrameInspection | null {
  if (offset < 0 || offset + 4 > bytes.length) return null
  const header = u32be(bytes, offset)
  if (((header & 0xffe00000) >>> 0) !== 0xffe00000) return null

  const versionBits = (header >>> 19) & 0x3
  const layerBits = (header >>> 17) & 0x3
  const bitrateIndex = (header >>> 12) & 0xf
  const sampleRateIndex = (header >>> 10) & 0x3
  if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null

  const version = versionBits === 3 ? '1' : versionBits === 2 ? '2' : '2.5'
  const layer = (4 - layerBits) as 1 | 2 | 3
  const bitrateTable = version === '1' ? BITRATES_MPEG1 : BITRATES_MPEG2
  const bitrateKbps = bitrateTable[layer][bitrateIndex]
  const sampleRate = SAMPLE_RATES[version][sampleRateIndex]
  const padding = Boolean((header >>> 9) & 1)
  const channelModeBits = (header >>> 6) & 0x3
  const channelMode = ['stereo', 'joint-stereo', 'dual-channel', 'mono'][channelModeBits] as MpegFrameInspection['channelMode']
  const channels = channelModeBits === 3 ? 1 : 2
  const samplesPerFrame = layer === 1 ? 384 : layer === 2 || version === '1' ? 1152 : 576
  const frameBytes = layer === 1
    ? Math.floor((12 * bitrateKbps * 1000) / sampleRate + Number(padding)) * 4
    : Math.floor(((layer === 3 && version !== '1' ? 72 : 144) * bitrateKbps * 1000) / sampleRate) + Number(padding)

  if (!frameBytes || offset + frameBytes > bytes.length + 4) return null
  return { offset, version, layer, bitrateKbps, sampleRate, padding, channels, channelMode, frameBytes, samplesPerFrame }
}

function findFirstFrame(bytes: Uint8Array, start: number): MpegFrameInspection | undefined {
  const end = Math.min(bytes.length - 4, start + 1024 * 1024)
  for (let offset = start; offset <= end; offset += 1) {
    const frame = parseMpegFrame(bytes, offset)
    if (!frame) continue
    const nextOffset = offset + frame.frameBytes
    if (nextOffset + 4 > bytes.length || parseMpegFrame(bytes, nextOffset)) return frame
  }
  return undefined
}

function inspectSeekTable(bytes: Uint8Array, frame: MpegFrameInspection): Mp3SeekTableInspection | undefined {
  if (frame.layer !== 3) return undefined
  const sideInfoBytes = frame.version === '1'
    ? frame.channels === 1 ? 17 : 32
    : frame.channels === 1 ? 9 : 17
  const xingOffset = frame.offset + 4 + sideInfoBytes
  const xingKind = ascii(bytes, xingOffset, 4)
  if (xingKind === 'Xing' || xingKind === 'Info') {
    let cursor = xingOffset + 8
    const flags = u32be(bytes, xingOffset + 4)
    const result: Mp3SeekTableInspection = { kind: xingKind, offset: xingOffset }
    if (flags & 0x1) {
      result.frames = u32be(bytes, cursor)
      cursor += 4
      result.duration = result.frames * frame.samplesPerFrame / frame.sampleRate
    }
    if (flags & 0x2) {
      result.bytes = u32be(bytes, cursor)
      cursor += 4
    }
    if (flags & 0x4) {
      result.hasToc = cursor + 100 <= bytes.length
      cursor += 100
    }
    if (flags & 0x8 && cursor + 4 <= bytes.length) result.quality = u32be(bytes, cursor)
    return result
  }

  const vbriOffset = frame.offset + 4 + 32
  if (ascii(bytes, vbriOffset, 4) === 'VBRI' && vbriOffset + 18 <= bytes.length) {
    const result: Mp3SeekTableInspection = {
      kind: 'VBRI',
      offset: vbriOffset,
      quality: (bytes[vbriOffset + 8] << 8) | bytes[vbriOffset + 9],
      bytes: u32be(bytes, vbriOffset + 10),
      frames: u32be(bytes, vbriOffset + 14),
      hasToc: true,
    }
    if (result.frames) result.duration = result.frames * frame.samplesPerFrame / frame.sampleRate
    return result
  }
  return undefined
}

function scanFrames(bytes: Uint8Array, first: MpegFrameInspection, limit = 256) {
  const bitrates = new Set<number>()
  let offset = first.offset
  let count = 0
  let totalBitrate = 0
  while (count < limit && offset + 4 <= bytes.length) {
    const frame = parseMpegFrame(bytes, offset)
    if (!frame) break
    bitrates.add(frame.bitrateKbps)
    totalBitrate += frame.bitrateKbps
    count += 1
    offset += frame.frameBytes
  }
  return { bitrates: [...bitrates].sort((a, b) => a - b), count, averageBitrate: count ? totalBitrate / count : 0 }
}

export function inspectMp3(input: ArrayBuffer | Uint8Array): Mp3Inspection {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const id3v2 = inspectId3v2(bytes)
  const id3v1 = bytes.length >= 128 && ascii(bytes, bytes.length - 128, 3) === 'TAG'
  const firstFrame = findFirstFrame(bytes, id3v2.totalBytes || 0)
  const notes: string[] = []
  if (!firstFrame) return { recognized: false, fileBytes: bytes.length, id3v2, id3v1, notes: ['No valid MPEG audio frame was found in the first megabyte after ID3v2.'] }

  const seekTable = inspectSeekTable(bytes, firstFrame)
  const scan = scanFrames(bytes, firstFrame)
  const audioBytes = Math.max(0, bytes.length - firstFrame.offset - (id3v1 ? 128 : 0))
  const bitrateMode = scan.bitrates.length > 1 || seekTable?.kind === 'Xing' ? 'VBR' : scan.count > 1 ? 'CBR' : 'unknown'
  let estimatedDuration = seekTable?.duration
  let durationConfidence: Mp3Inspection['durationConfidence'] = seekTable?.duration ? 'high' : undefined
  if (!estimatedDuration && bitrateMode === 'CBR') {
    estimatedDuration = audioBytes * 8 / (firstFrame.bitrateKbps * 1000)
    durationConfidence = 'medium'
  } else if (!estimatedDuration && scan.averageBitrate) {
    estimatedDuration = audioBytes * 8 / (scan.averageBitrate * 1000)
    durationConfidence = 'low'
  }

  if (id3v2.present && (id3v2.totalBytes || 0) > 64 * 1024) notes.push('The leading ID3v2 block is larger than 64 KiB.')
  if (bitrateMode === 'VBR' && !seekTable) notes.push('Variable bitrate frames were sampled without a Xing, Info, or VBRI seek table.')
  if (seekTable?.kind === 'Info' && bitrateMode === 'VBR') notes.push('The stream varies in bitrate but advertises an Info header normally associated with CBR.')
  if (!seekTable) notes.push('No Xing, Info, or VBRI header was found in the first MPEG frame.')

  return {
    recognized: true,
    fileBytes: bytes.length,
    id3v2,
    id3v1,
    firstFrame,
    seekTable,
    bitrateMode,
    sampledBitratesKbps: scan.bitrates,
    sampledFrames: scan.count,
    audioBytes,
    estimatedDuration,
    durationConfidence,
    notes,
  }
}
