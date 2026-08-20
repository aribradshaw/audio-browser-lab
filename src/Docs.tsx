import { currentVersion } from './release-data'
import { PageFrame } from './SiteChrome'

const base = import.meta.env.BASE_URL
const repository = 'https://github.com/aribradshaw/audio-browser-lab'

const packageCards = [
  ['@audio-browser-lab/core', 'Use the shared report schema, MP3 inspection, diagnosis, question catalog, and cross-browser comparison in any JavaScript project.'],
  ['@audio-browser-lab/browser', 'Run the full local browser flow: native media, Web Audio, codec, seek, hashing, and remote-delivery evidence.'],
  ['@audio-browser-lab/howler', 'Capture the Howler backend, timeline, position, and lifecycle events without patching Howler.'],
  ['@audio-browser-lab/wavesurfer', 'Capture WaveSurfer duration, position, scroll, rendering dimensions, and lifecycle evidence.'],
]

function CodeBlock({ children, label }: { children: string, label: string }) {
  return <div className="docs-code-block">
    <span className="docs-code-label">{label}</span>
    <pre><code>{children}</code></pre>
  </div>
}

export default function Docs() {
  return <PageFrame page="docs">
    <main id="main-content" className="docs-page">
      <section className="docs-hero">
        <div className="docs-hero-copy">
          <nav className="docs-breadcrumbs" aria-label="Breadcrumb"><a href={base}>Lab</a><span aria-hidden="true">/</span><span aria-current="page">Docs</span></nav>
          <p className="kicker">Documentation / v{currentVersion}</p>
          <h1>USE THE LAB.<br/><span>YOUR WAY.</span></h1>
          <p className="docs-lede">Audio Browser Lab turns browser-audio bugs into evidence. Start in the web lab, embed the measurements in your app, automate checks in CI, or give an agent the same tools.</p>
          <div className="docs-hero-actions"><a className="pixel-button primary" href={`${base}#choose`}>CHOOSE A PATH</a><a className="pixel-button" href={repository}>VIEW SOURCE</a></div>
        </div>
        <aside className="docs-start-card" aria-label="Recommended starting point">
          <span className="tiny-label">Start here</span>
          <strong>Have an audio bug in front of you?</strong>
          <p>Open the lab, drop in the exact file, and export a report before changing player settings.</p>
          <a className="text-link" href={base}>OPEN THE LAB ↗</a>
        </aside>
      </section>

      <section className="docs-layout" id="choose">
        <nav className="docs-toc" aria-label="Documentation sections">
          <span className="tiny-label">On this page</span>
          <a href="#web-lab">Web lab</a>
          <a href="#javascript">JavaScript</a>
          <a href="#terminal">CLI and CI</a>
          <a href="#services">API and MCP</a>
          <a href="#evidence">Evidence model</a>
          <a href="#project">Project rules</a>
        </nav>

        <div className="docs-content">
          <section className="docs-section" id="web-lab">
            <div className="docs-section-heading"><span className="tiny-label">01 / NO INSTALL</span><h2>USE THE WEB LAB</h2><p>Best for reproducing a bug in a real browser and comparing results across browsers.</p></div>
            <div className="docs-step-grid">
              <article><b>01</b><h3>Drop the exact asset</h3><p>Files stay in your browser. The lab reads the file locally and does not require an account or hosted upload.</p></article>
              <article><b>02</b><h3>Run the evidence pass</h3><p>It inspects MP3 structure, measures native and decoded clocks, probes seeks, and estimates decoded memory.</p></article>
              <article><b>03</b><h3>Export and compare</h3><p>Download the JSON report, repeat the test in another browser, and compare both reports in the same lab.</p></article>
            </div>
            <div className="docs-inline-callout"><strong>Start with the browser that shows the bug.</strong><span>That preserves the decoder and player behavior you are trying to explain.</span></div>
          </section>

          <section className="docs-section" id="javascript">
            <div className="docs-section-heading"><span className="tiny-label">02 / EMBED IT</span><h2>ADD IT TO A JAVASCRIPT APP</h2><p>Use the same report shape in a test harness, debugging panel, or internal support tool.</p></div>
            <div className="docs-package-grid">{packageCards.map(([name, description]) => <article className="docs-package-card" key={name}><code>{name}</code><p>{description}</p></article>)}</div>
            <CodeBlock label="Browser analysis" children={`import { analyzeBrowserFile } from '@audio-browser-lab/browser'\n\nconst report = await analyzeBrowserFile(file, {\n  seekTargets: [1, 30, 120],\n})`} />
            <p className="docs-note"><strong>Package status:</strong> the project is source-first while the npm publishing scope is being finalized. Clone the repository and build the workspaces locally before using these package imports.</p>
          </section>

          <section className="docs-section" id="terminal">
            <div className="docs-section-heading"><span className="tiny-label">03 / AUTOMATE IT</span><h2>INSPECT FILES IN THE CLI OR CI</h2><p>Use the CLI when the file is local, repeatable, and should become part of a fixture or release check.</p></div>
            <CodeBlock label="Clone and build" children={`git clone ${repository}.git\ncd audio-browser-lab\nnpm install\nnpm run build:packages`} />
            <CodeBlock label="Inspect and compare" children={`npm run abl -- inspect ./problem.mp3 --json > report.json\nnpm run abl -- questions\nnpm run abl -- compare chrome.json safari.json\nnpm run abl -- inspect-url https://example.com/problem.mp3`} />
            <div className="docs-warning"><span className="tiny-label">Important boundary</span><p>Use browser reports for decoder behavior. The CLI can inspect file structure and generate diagnoses, but it cannot reproduce a browser's media timeline by itself.</p></div>
          </section>

          <section className="docs-section" id="services">
            <div className="docs-section-heading"><span className="tiny-label">04 / CONNECT IT</span><h2>USE THE API OR MCP SERVER</h2><p>Choose a service boundary when another process needs the same evidence engine.</p></div>
            <div className="docs-service-grid">
              <article className="docs-service-card"><span className="tiny-label">LOCAL HTTP API</span><h3>Connect another stack</h3><p>Run the Node server yourself and call health, question, inspect, diagnose, and compare routes from a trusted local application.</p><CodeBlock label="Start the server" children={`import { createAudioBrowserLabApi } from '@audio-browser-lab/api'\n\ncreateAudioBrowserLabApi({\n  corsOrigin: 'http://localhost:3000',\n}).listen(8787)`} /><small>Keep the CORS origin narrow and bind only where your application can reach it.</small></article>
              <article className="docs-service-card"><span className="tiny-label">MCP SERVER</span><h3>Give coding agents evidence tools</h3><p>Expose local inspection, report diagnosis, comparison, remote probing, question discovery, and non-destructive repair plans through stdio.</p><CodeBlock label="MCP client config" children={`{\n  "mcpServers": {\n    "audio-browser-lab": {\n      "command": "npx",\n      "args": ["audio-browser-lab-mcp"]\n    }\n  }\n}`} /><small>File access follows the permissions of the MCP host process.</small></article>
            </div>
          </section>

          <section className="docs-section" id="evidence">
            <div className="docs-section-heading"><span className="tiny-label">05 / UNDERSTAND THE RESULT</span><h2>FOLLOW THE EVIDENCE, NOT THE GUESS</h2><p>The tools are designed to separate the layers that often get conflated in a browser-audio bug.</p></div>
            <div className="docs-evidence-grid">
              <article><b>01</b><h3>Asset structure</h3><p>Frames, bitrate mode, ID3 offsets, seek-table metadata, and file identity.</p></article>
              <article><b>02</b><h3>Browser clocks</h3><p>Native media duration versus fully decoded Web Audio duration and PCM memory cost.</p></article>
              <article><b>03</b><h3>Player integration</h3><p>Howler or WaveSurfer backend, position, lifecycle, and rendering evidence.</p></article>
              <article><b>04</b><h3>Delivery path</h3><p>MIME headers, byte ranges, real remote seeks, and the response behavior that browsers receive.</p></article>
            </div>
            <a className="docs-reference-link" href={`${base}#questions`}>See the eight diagnostic questions in the lab <span aria-hidden="true">↗</span></a>
          </section>

          <section className="docs-section docs-project-section" id="project">
            <div className="docs-section-heading"><span className="tiny-label">06 / OPEN SOURCE</span><h2>BUILD WITH THE PROJECT</h2><p>Audio Browser Lab is MIT-licensed and local-first. Read the project rules before contributing or deploying a service.</p></div>
            <div className="docs-project-links"><a href={`${repository}/blob/main/CONTRIBUTING.md`}><strong>Contributing</strong><span>How to propose changes and work with the repository.</span></a><a href={`${repository}/blob/main/SECURITY.md`}><strong>Security</strong><span>How to report a vulnerability privately.</span></a><a href={`${repository}/blob/main/LICENSE`}><strong>MIT License</strong><span>Use, modify, and distribute the project under the license.</span></a><a href={repository}><strong>GitHub issues</strong><span>Ask a question or report a reproducible problem.</span></a></div>
            <p className="docs-note"><strong>Privacy:</strong> the web lab does not upload selected files or use analytics. The local API and MCP server are opt-in processes that you run and control.</p>
          </section>
        </div>
      </section>
    </main>
  </PageFrame>
}
