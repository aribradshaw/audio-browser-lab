# @audio-browser-lab/cli

Run `abl inspect`, `diagnose`, `compare`, `inspect-url`, or `questions`. Local file inspection never uploads audio.

```sh
npx @audio-browser-lab/cli inspect ./problem.mp3
npx @audio-browser-lab/cli inspect-url https://example.com/problem.mp3
npx @audio-browser-lab/cli compare chrome.json safari.json
```

Install it in a project when you want reproducible CI or fixture checks:

```sh
npm install --save-dev @audio-browser-lab/cli
npx abl --version
```

[Open the browser lab](https://aribradshaw.github.io/audio-browser-lab/) or [read the documentation](https://aribradshaw.github.io/audio-browser-lab/docs/).
