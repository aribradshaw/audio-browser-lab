import type { QuestionDefinition } from './types'

export const questionCatalog: QuestionDefinition[] = [
  {
    id: 'howler-cross-browser-seek',
    title: 'Why does the same Howler timestamp play different audio in Chrome, Firefox, and Safari?',
    shortAnswer: 'Separate Howler from the browser timeline, inspect the MP3 seek metadata, and compare HTML media with Web Audio before adding any offset.',
    evidenceNeeded: ['MP3 structure', 'HTML media duration', 'Web Audio duration', 'Howler backend', 'seek probes'],
    relatedFindingIds: ['mp3-vbr-without-index', 'duration-source-disagreement', 'howler-duration-disagreement', 'seek-report-delta'],
  },
  {
    id: 'duration-differs-by-browser',
    title: 'Why does an audio file report a different duration in different browsers?',
    shortAnswer: 'Compare the media-element clock, decoded PCM clock, and duration declared by the file seek table.',
    evidenceNeeded: ['HTML media duration', 'Web Audio duration', 'MP3 duration estimate'],
    relatedFindingIds: ['duration-source-disagreement', 'mp3-browser-duration-disagreement'],
  },
  {
    id: 'waveform-player-length-mismatch',
    title: 'Why is a waveform longer or shorter than the player?',
    shortAnswer: 'Waveform libraries often use decoded PCM while the player may use a media-element duration. Comparing those clocks identifies the mismatch.',
    evidenceNeeded: ['wavesurfer duration', 'HTML media duration', 'Web Audio duration'],
    relatedFindingIds: ['wavesurfer-duration-disagreement', 'duration-source-disagreement'],
  },
  {
    id: 'audio-sprite-drift',
    title: 'Why do long audio sprites or game cues drift out of alignment?',
    shortAnswer: 'Check encoder delay, compressed seek indexing, requested-versus-reported seek values, and the decoded timeline before changing cue offsets.',
    evidenceNeeded: ['seek probes', 'MP3 index', 'decoded duration'],
    relatedFindingIds: ['seek-report-delta', 'mp3-vbr-without-index', 'mp3-large-leading-tag'],
  },
  {
    id: 'safari-decode-failure',
    title: 'Why does an audio file play in one browser but fail to decode in Safari or Web Audio?',
    shortAnswer: 'Record codec support separately from a real decode attempt because canPlayType is only a hint.',
    evidenceNeeded: ['codec signal', 'Web Audio decode result', 'media-element error'],
    relatedFindingIds: ['webaudio-decode-failure', 'media-load-failure', 'codec-unsupported'],
  },
  {
    id: 'remote-seek-slow-or-broken',
    title: 'Why is seeking slow or broken for remote audio?',
    shortAnswer: 'Verify Content-Length, Content-Type, byte-range support, CORS visibility, and a real Range request.',
    evidenceNeeded: ['HTTP headers', 'Range response', 'seekable ranges'],
    relatedFindingIds: ['network-no-byte-ranges', 'network-range-request-failed', 'network-content-type'],
  },
  {
    id: 'long-audio-memory',
    title: 'Why does a long audio file freeze or crash when using Web Audio?',
    shortAnswer: 'Decoded PCM can be hundreds of megabytes even when the compressed file is small. Estimate the decoded allocation before choosing a backend.',
    evidenceNeeded: ['duration', 'sample rate', 'channels', 'estimated PCM bytes'],
    relatedFindingIds: ['webaudio-large-allocation'],
  },
  {
    id: 'codec-claim-vs-reality',
    title: 'Why does canPlayType say probably when the real file still fails?',
    shortAnswer: 'The codec claim covers a MIME and codec family, not every profile, container, file structure, or network response.',
    evidenceNeeded: ['codec signal', 'decode result', 'media error', 'content type'],
    relatedFindingIds: ['codec-claim-but-decode-failed', 'network-content-type'],
  },
]

export const getQuestion = (id: string) => questionCatalog.find((question) => question.id === id)
