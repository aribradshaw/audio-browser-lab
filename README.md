# Audio Browser Lab

Browser-audio forensics without guesswork. Audio Browser Lab inspects the asset, measures independent browser clocks, probes real seeks and HTTP range delivery, and produces portable evidence for cross-browser comparison.

**[Open the web lab](https://aribradshaw.github.io/audio-browser-lab/)**

**[Read the public DevLog](https://aribradshaw.github.io/audio-browser-lab/devlog/)**

**[Read the documentation](https://aribradshaw.github.io/audio-browser-lab/docs/)**

It is a Flygon LC project with a local-first rule: audio files selected in the web lab are analyzed in your browser and are not uploaded. The CLI and MCP server read local files directly. No account, usage tracking, or hosted backend is required.

## The Howler question

> Why can the same Howler timestamp play different audio in Chrome, Firefox, and Safari?

Howler is only one layer. Its Web Audio and HTML5 backends can inherit different browser timelines from the same compressed asset. A variable-bitrate MP3 without a Xing, Info, or VBRI seek index makes the problem worse because each decoder may estimate time-to-byte positions differently.

Audio Browser Lab tests that explanation instead of assuming it. It reports:

1. MP3 frames, bitrate mode, ID3 offset, and seek-table metadata
2. Native `HTMLMediaElement.duration`
3. Fully decoded Web Audio duration and PCM memory cost
4. Requested versus reported seek positions
5. Decoded-window fingerprints around seek targets
6. Howler backend, duration, position, and event evidence through the adapter
7. The same measurements in a portable report that another browser can compare

See [the full Howler case study](docs/HOWLER-CASE-STUDY.md).

## Seven ways to use it

| Surface | Best use |
| --- | --- |
| Web lab | Reproduce and export browser evidence with no install |
| `@audio-browser-lab/core` | Inspect MP3s, diagnose reports, or compare reports in any JS project |
| `@audio-browser-lab/browser` | Add the complete local browser analysis flow to an app |
| `@audio-browser-lab/howler` | Capture Howler backend, timeline, and events |
| `@audio-browser-lab/wavesurfer` | Capture waveform timeline and rendering evidence |
| `@audio-browser-lab/cli` | Inspect files or gate fixtures in a terminal and CI |
| `@audio-browser-lab/api` / `mcp` | Connect other stacks or give coding agents the same evidence tools |

## Quick start

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. Choose an audio file, export its report, repeat in another browser, then select both JSON files in the comparison panel. The build generates a sitemap for the public lab and DevLog pages.

## Release practice

Public updates use the same Phoenix-calendar three-part cadence as the sister projects. Updates in the same month increment the third number. A new month advances the second number and resets the third to `1`. A new year advances the first number, sets the second number to the zero-based Arizona month, and resets the third to `1`. Every version must have a plain-English entry in `config/devlog-releases.json`; `npm run release:check` enforces the calendar sequence and keeps the package and public DevLog in sync. The newest entry appears first at `/devlog/`.

### CLI

```sh
npm run build:packages
npm run abl -- inspect ./problem.mp3
npm run abl -- inspect ./problem.mp3 --json > chrome-asset.json
npm run abl -- questions
npm run abl -- inspect-url https://example.com/problem.mp3
npm run abl -- compare chrome.json safari.json
```

Install the repository as a Git dependency in another project to expose the `abl` and `audio-browser-lab-mcp` binaries immediately:

```sh
npm install --save-dev github:aribradshaw/audio-browser-lab
npx abl inspect ./problem.mp3
```

### SDK

```ts
import { analyzeBrowserFile } from '@audio-browser-lab/browser'

const report = await analyzeBrowserFile(file, {
  seekTargets: [1, 30, 120],
})
```

### Howler adapter

```ts
import { observeHowl } from '@audio-browser-lab/howler'

const observation = observeHowl(howl, {
  version: '2.2.4',
  backend: Howler.usingWebAudio ? 'webaudio' : 'html5',
})

const integrationEvidence = observation.snapshot()
```

### Local HTTP API

```ts
import { createAudioBrowserLabApi } from '@audio-browser-lab/api'

createAudioBrowserLabApi({ corsOrigin: 'http://localhost:3000' }).listen(8787)
```

Routes: `GET /health`, `GET /v1/questions`, `POST /v1/diagnose`, `POST /v1/compare`, and `POST /v1/inspect/mp3`.

### MCP

After the Git dependency install above:

```json
{
  "mcpServers": {
    "audio-browser-lab": {
      "command": "npx",
      "args": ["audio-browser-lab-mcp"]
    }
  }
}
```

The server exposes `inspect_audio_file`, `diagnose_audio_report`, `compare_browser_reports`, `inspect_remote_audio`, `list_audio_questions`, and `generate_repair_plan`.

The seven audio packages are independently built, typed, licensed, and ready for npm publication. They are not claimed as npm-hosted until the `@audio-browser-lab` scope is connected to a publisher account.

The monorepo also pilots `@aribradshaw/devlog`, a project-neutral headless package for author metadata, GitHub commit links, feature policies, search, and pagination. Audio Browser Lab owns the package's first visual integration. It is intentionally not published yet while the API is proven here.

## Questions covered

The engine currently answers eight evidence paths, including the Howler mismatch, cross-browser duration differences, WaveSurfer timeline drift, audio sprite drift, Safari decode failures, broken remote seeks, long-audio memory crashes, and `canPlayType` false confidence. Read [the question catalog](docs/QUESTIONS.md).

## Verification

```sh
npm run check
npm test
npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Reusable DevLog pilot](docs/DEVLOG-PILOT.md)
- [Integrations](docs/INTEGRATION.md)
- [Howler case study](docs/HOWLER-CASE-STUDY.md)
- [Diagnostic questions](docs/QUESTIONS.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

MIT
