# @audio-browser-lab/api

Embeddable Node HTTP server for MP3 inspection, report diagnosis, comparison, and the diagnostic question catalog.

```sh
npm install @audio-browser-lab/api
```

```ts
import { createAudioBrowserLabApi } from '@audio-browser-lab/api'

createAudioBrowserLabApi({
  corsOrigin: 'http://localhost:3000',
  maxBodyBytes: 10_000_000,
}).listen(8787, '127.0.0.1')
```

Routes include `/health`, `/v1/questions`, `/v1/diagnose`, `/v1/compare`, and `/v1/inspect/mp3`. Bind it to a trusted interface and use a narrow CORS origin.
