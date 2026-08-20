import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

const entry = process.argv[2]
if (!entry) throw new Error('Pass the MCP server JavaScript entry path.')

const transport = new StdioClientTransport({ command: process.execPath, args: [entry], stderr: 'pipe' })
const client = new Client({ name: 'audio-browser-lab-smoke', version: '1.0.0' })

try {
  await client.connect(transport)
  const tools = await client.listTools()
  if (tools.tools.length !== 6) throw new Error(`Expected 6 tools, received ${tools.tools.length}.`)
  const result = await client.callTool({ name: 'list_audio_questions', arguments: {} })
  if (!JSON.stringify(result).includes('howler-cross-browser-seek')) throw new Error('Question tool did not return the Howler evidence path.')
  console.log(`MCP handshake passed with ${tools.tools.length} tools.`)
} finally {
  await client.close()
}
