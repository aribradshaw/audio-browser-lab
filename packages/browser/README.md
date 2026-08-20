# @audio-browser-lab/browser

Local browser measurements for media duration, Web Audio decoding, repeated seek probes, PCM fingerprints, codecs, file hashing, and remote range delivery.

```sh
npm install @audio-browser-lab/browser
```

```ts
import { analyzeBrowserFile } from '@audio-browser-lab/browser'

const report = await analyzeBrowserFile(file, {
  seekTargets: [146.52],
  seekRepeats: 5,
})
```

Repeated probes record an `attempt` number on each seek result and are capped at ten attempts per target.

The selected file stays in the browser. Export the report and compare it with the same asset in another browser using [Audio Browser Lab](https://aribradshaw.github.io/audio-browser-lab/).
