# @audio-browser-lab/howler

Small optional adapter that captures Howler backend, duration, position, and lifecycle evidence without patching Howler.

```sh
npm install @audio-browser-lab/howler howler
```

```ts
import { observeHowl } from '@audio-browser-lab/howler'

const observation = observeHowl(howl, {
  version: '2.2.4',
  backend: Howler.usingWebAudio ? 'webaudio' : 'html5',
})

const evidence = observation.snapshot()
observation.stop()
```

Use the adapter alongside the [web lab](https://aribradshaw.github.io/audio-browser-lab/) to separate asset, browser, delivery, and Howler behavior.
