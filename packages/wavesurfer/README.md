# @audio-browser-lab/wavesurfer

Small optional adapter that captures WaveSurfer duration, position, scroll, rendering dimensions, and lifecycle evidence.

```sh
npm install @audio-browser-lab/wavesurfer wavesurfer.js
```

```ts
import { observeWaveSurfer } from '@audio-browser-lab/wavesurfer'

const observation = observeWaveSurfer(wavesurfer, { version: '7.10.1' })
const evidence = observation.snapshot()
observation.stop()
```

Pair the adapter with repeated native seek probes from [Audio Browser Lab](https://aribradshaw.github.io/audio-browser-lab/) before assigning a timeline bug to the library layer.
