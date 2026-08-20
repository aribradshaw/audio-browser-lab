import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import {
  REPORT_SCHEMA,
  compareReports,
  diagnoseReport,
  inspectMp3,
  questionCatalog,
  type AudioBrowserReport,
} from '@audio-browser-lab/core'

export interface ApiOptions { maxBodyBytes?: number; corsOrigin?: string }

const send = (response: ServerResponse, status: number, value: unknown, origin: string) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(value, null, 2))
}

async function body(request: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += value.length
    if (size > limit) throw new Error(`Request body exceeds ${limit} bytes`)
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

const parseJson = async (request: IncomingMessage, limit: number) => JSON.parse((await body(request, limit)).toString('utf8')) as unknown

export function createAudioBrowserLabApi(options: ApiOptions = {}) {
  const limit = options.maxBodyBytes ?? 64 * 1024 * 1024
  const origin = options.corsOrigin ?? 'http://localhost'
  return createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') return send(response, 204, null, origin)
      const url = new URL(request.url || '/', 'http://localhost')
      if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { ok: true, service: 'audio-browser-lab', schema: REPORT_SCHEMA }, origin)
      if (request.method === 'GET' && url.pathname === '/v1/questions') return send(response, 200, questionCatalog, origin)
      if (request.method === 'POST' && url.pathname === '/v1/diagnose') {
        const report = await parseJson(request, limit) as AudioBrowserReport
        return send(response, 200, { findings: diagnoseReport(report) }, origin)
      }
      if (request.method === 'POST' && url.pathname === '/v1/compare') {
        const payload = await parseJson(request, limit) as { left: AudioBrowserReport; right: AudioBrowserReport }
        return send(response, 200, compareReports(payload.left, payload.right), origin)
      }
      if (request.method === 'POST' && url.pathname === '/v1/inspect/mp3') {
        const bytes = await body(request, limit)
        const mp3 = inspectMp3(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
        const report: AudioBrowserReport = { schema: REPORT_SCHEMA, generatedAt: new Date().toISOString(), file: { name: request.headers['x-file-name']?.toString() || 'upload.mp3', size: bytes.length }, mp3 }
        report.findings = diagnoseReport(report)
        return send(response, 200, report, origin)
      }
      return send(response, 404, { error: 'Not found' }, origin)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return send(response, message.includes('exceeds') ? 413 : 400, { error: message }, origin)
    }
  })
}
