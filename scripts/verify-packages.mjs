import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const rootPackage = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const packageNames = ['core', 'browser', 'howler', 'wavesurfer', 'cli', 'api', 'mcp']
const npmCli = process.env.npm_execpath
  || path.resolve(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
const workspace = mkdtempSync(path.join(tmpdir(), 'audio-browser-lab-packages-'))

try {
  const tarballs = []
  for (const packageName of packageNames) {
    const packageDirectory = path.join(root, 'packages', packageName)
    const manifest = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'))
    if (manifest.version !== rootPackage.version) {
      throw new Error(`${manifest.name} ${manifest.version} does not match release ${rootPackage.version}.`)
    }
    for (const [dependency, version] of Object.entries(manifest.dependencies || {})) {
      if (dependency.startsWith('@audio-browser-lab/') && version !== rootPackage.version) {
        throw new Error(`${manifest.name} must pin ${dependency} to ${rootPackage.version}.`)
      }
    }
    for (const [binary, target] of Object.entries(manifest.bin || {})) {
      if (typeof target !== 'string' || target.startsWith('.')) {
        throw new Error(`${manifest.name} has an invalid ${binary} binary path: ${target}`)
      }
    }
    const output = execFileSync(process.execPath, [npmCli, 'pack', packageDirectory, '--json', '--pack-destination', workspace], {
      cwd: root,
      encoding: 'utf8',
    })
    const result = JSON.parse(output)[0]
    if (!result.files.some((file) => file.path.startsWith('dist/'))) {
      throw new Error(`${manifest.name} package contains no built dist files.`)
    }
    tarballs.push(path.join(workspace, result.filename))
  }

  writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  execFileSync(process.execPath, [npmCli, 'install', '--ignore-scripts', ...tarballs], {
    cwd: workspace,
    stdio: 'inherit',
  })
  writeFileSync(path.join(workspace, 'verify.mjs'), [
    "import { inspectMp3 } from '@audio-browser-lab/core'",
    "import { analyzeBrowserFile } from '@audio-browser-lab/browser'",
    "import { observeHowl } from '@audio-browser-lab/howler'",
    "import { observeWaveSurfer } from '@audio-browser-lab/wavesurfer'",
    "import { VERSION } from '@audio-browser-lab/cli'",
    "import { createAudioBrowserLabApi } from '@audio-browser-lab/api'",
    "import { createAudioBrowserLabMcpServer } from '@audio-browser-lab/mcp'",
    `if (VERSION !== '${rootPackage.version}') process.exit(1)`,
    "for (const value of [inspectMp3, analyzeBrowserFile, observeHowl, observeWaveSurfer, createAudioBrowserLabApi, createAudioBrowserLabMcpServer]) if (typeof value !== 'function') process.exit(1)",
  ].join('\n'))
  execFileSync(process.execPath, ['verify.mjs'], { cwd: workspace, stdio: 'inherit' })
  for (const binary of ['abl', 'audio-browser-lab-mcp']) {
    const shim = path.join(workspace, 'node_modules', '.bin', `${binary}${process.platform === 'win32' ? '.cmd' : ''}`)
    if (!existsSync(shim)) throw new Error(`Packed install did not expose the ${binary} executable.`)
  }
  const cliVersion = execFileSync(process.execPath, [
    path.join(workspace, 'node_modules', '@audio-browser-lab', 'cli', 'dist', 'index.js'), '--version',
  ], { cwd: workspace, encoding: 'utf8' }).trim()
  if (cliVersion !== rootPackage.version) throw new Error(`Packed CLI reports ${cliVersion}.`)
  console.log(`Verified seven packed Audio Browser Lab ${rootPackage.version} packages in a fresh consumer.`)
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
