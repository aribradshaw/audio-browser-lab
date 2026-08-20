# @audio-browser-lab/core

Browser-neutral MP3 inspection, report diagnosis, question catalog, and cross-browser report comparison.

```sh
npm install @audio-browser-lab/core
```

```ts
import { diagnoseReport, inspectMp3 } from '@audio-browser-lab/core'

const mp3 = inspectMp3(await file.arrayBuffer())
const findings = diagnoseReport({
  schema: 'audio-browser-lab/report@0.2',
  generatedAt: new Date().toISOString(),
  mp3,
})
```

The package has no browser, UI, or framework dependency. [Open the lab](https://aribradshaw.github.io/audio-browser-lab/) or [read the documentation](https://aribradshaw.github.io/audio-browser-lab/docs/).
