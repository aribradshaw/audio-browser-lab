# @audio-browser-lab/browser

Local browser measurements for media duration, Web Audio decoding, repeated seek probes, PCM fingerprints, codecs, file hashing, and remote range delivery.

```ts
const report = await analyzeBrowserFile(file, {
  seekTargets: [146.52],
  seekRepeats: 5,
})
```

Repeated probes record an `attempt` number on each seek result and are capped at ten attempts per target.
