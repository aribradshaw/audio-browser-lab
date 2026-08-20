export const REPORT_SCHEMA = 'audio-browser-lab/report@0.2' as const

export type Confidence = 'high' | 'medium' | 'low'
export type FindingSeverity = 'pass' | 'info' | 'warning' | 'error'
export type NumericRange = [start: number, end: number]

export interface BrowserIdentity {
  userAgent: string
  platform?: string
  language?: string
  cores?: number | null
  memoryGb?: number | null
  crossOriginIsolated?: boolean
  audioContext?: boolean
  mediaCapabilities?: boolean
}

export interface FileIdentity {
  name: string
  type?: string
  size: number
  modified?: number
  sha256?: string
}

export interface CodecSignal {
  label: string
  mime: string
  result: 'probably' | 'maybe' | 'no'
}

export interface MediaElementEvidence {
  duration: number | null
  readyState?: number
  networkState?: number
  seekable?: NumericRange[]
  buffered?: NumericRange[]
  error?: string
}

export interface WebAudioEvidence {
  duration?: number
  sampleRate?: number
  channels?: number
  frames?: number
  decodeMs?: number
  estimatedPcmBytes?: number
  error?: string
}

export interface SeekEvidence {
  requested: number
  reported: number
  delta: number
  completedMs?: number
  audibleFingerprint?: string
}

export interface NetworkEvidence {
  url?: string
  status?: number
  contentType?: string | null
  contentLength?: number | null
  acceptRanges?: string | null
  contentRange?: string | null
  corsReadable?: boolean
  rangeRequestStatus?: number
  error?: string
}

export interface IntegrationEvidence {
  library: 'howler' | 'wavesurfer' | 'custom'
  version?: string
  backend?: 'webaudio' | 'html5' | 'media-element' | 'unknown'
  duration?: number
  currentTime?: number
  events?: Array<{ event: string; at: string; value?: number | string }>
  details?: Record<string, unknown>
}

export interface Id3v2Inspection {
  present: boolean
  version?: string
  flags?: number
  payloadBytes?: number
  totalBytes?: number
}

export interface MpegFrameInspection {
  offset: number
  version: '1' | '2' | '2.5'
  layer: 1 | 2 | 3
  bitrateKbps: number
  sampleRate: number
  padding: boolean
  channels: 1 | 2
  channelMode: 'stereo' | 'joint-stereo' | 'dual-channel' | 'mono'
  frameBytes: number
  samplesPerFrame: number
}

export interface Mp3SeekTableInspection {
  kind: 'Xing' | 'Info' | 'VBRI'
  offset: number
  frames?: number
  bytes?: number
  duration?: number
  hasToc?: boolean
  quality?: number
}

export interface Mp3Inspection {
  recognized: boolean
  fileBytes: number
  id3v2: Id3v2Inspection
  id3v1: boolean
  firstFrame?: MpegFrameInspection
  seekTable?: Mp3SeekTableInspection
  bitrateMode?: 'CBR' | 'VBR' | 'unknown'
  sampledBitratesKbps?: number[]
  sampledFrames?: number
  audioBytes?: number
  estimatedDuration?: number
  durationConfidence?: Confidence
  notes: string[]
}

export interface DiagnosticEvidence {
  label: string
  value: string | number | boolean | null
  source: 'file' | 'mp3' | 'media-element' | 'web-audio' | 'network' | 'integration' | 'comparison'
}

export interface DiagnosticFinding {
  id: string
  questionId: string
  severity: FindingSeverity
  confidence: Confidence
  title: string
  summary: string
  evidence: DiagnosticEvidence[]
  recommendation?: string
}

export interface AudioBrowserReport {
  schema: typeof REPORT_SCHEMA
  generatedAt: string
  browser?: BrowserIdentity
  file?: FileIdentity | null
  codecs?: CodecSignal[]
  media?: MediaElementEvidence | null
  webAudio?: WebAudioEvidence | null
  seeks?: SeekEvidence[]
  network?: NetworkEvidence | null
  integration?: IntegrationEvidence | null
  mp3?: Mp3Inspection | null
  findings?: DiagnosticFinding[]
  events?: Array<{ at: string; event: string; detail?: string }>
}

export interface QuestionDefinition {
  id: string
  title: string
  shortAnswer: string
  evidenceNeeded: string[]
  relatedFindingIds: string[]
}

export interface ReportDifference {
  path: string
  left: unknown
  right: unknown
  delta?: number
  meaningful: boolean
}

export interface ReportComparison {
  compatible: boolean
  sameFile: boolean | null
  differences: ReportDifference[]
  summary: string
}
