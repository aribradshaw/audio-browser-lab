import type { AudioBrowserReport, ReportComparison, ReportDifference } from './types'

const addNumeric = (differences: ReportDifference[], path: string, left: number | null | undefined, right: number | null | undefined, tolerance = 0.000001) => {
  if (left == null && right == null) return
  const delta = left != null && right != null ? right - left : undefined
  differences.push({ path, left, right, delta, meaningful: delta == null || Math.abs(delta) > tolerance })
}

export function compareReports(left: AudioBrowserReport, right: AudioBrowserReport): ReportComparison {
  const differences: ReportDifference[] = []
  addNumeric(differences, 'media.duration', left.media?.duration, right.media?.duration, 0.01)
  addNumeric(differences, 'webAudio.duration', left.webAudio?.duration, right.webAudio?.duration, 0.01)
  addNumeric(differences, 'webAudio.sampleRate', left.webAudio?.sampleRate, right.webAudio?.sampleRate, 0)
  addNumeric(differences, 'mp3.estimatedDuration', left.mp3?.estimatedDuration, right.mp3?.estimatedDuration, 0.01)
  addNumeric(differences, 'integration.duration', left.integration?.duration, right.integration?.duration, 0.01)

  const maxSeeks = Math.max(left.seeks?.length || 0, right.seeks?.length || 0)
  for (let index = 0; index < maxSeeks; index += 1) addNumeric(differences, `seeks[${index}].reported`, left.seeks?.[index]?.reported, right.seeks?.[index]?.reported, 0.01)

  const sameFile = left.file?.sha256 && right.file?.sha256
    ? left.file.sha256 === right.file.sha256
    : left.file && right.file
      ? left.file.name === right.file.name && left.file.size === right.file.size
      : null
  const meaningful = differences.filter((difference) => difference.meaningful)
  const compatible = sameFile !== false && meaningful.length === 0
  const summary = sameFile === false
    ? 'The reports describe different files, so browser comparisons are not reliable.'
    : meaningful.length
      ? `${meaningful.length} meaningful cross-environment difference${meaningful.length === 1 ? '' : 's'} detected.`
      : 'No meaningful timeline differences were detected.'
  return { compatible, sameFile, differences, summary }
}
