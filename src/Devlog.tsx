import { createDevLogCapabilities, formatDevLogDate, resolveDevLogSourceMeta } from '@aribradshaw/devlog'
import { PageFrame } from './SiteChrome'
import { currentVersion, releases, type ReleaseEntry } from './release-data'
import './devlog-source-meta.css'

const repository = 'https://github.com/aribradshaw/audio-browser-lab'
const capabilities = createDevLogCapabilities({
  visibility: 'public',
  author: true,
  commit: true,
  sourceSubject: false,
  includedCommits: false,
  lifecycle: false,
})

function SourceMeta({ release }: { release: ReleaseEntry }) {
  const source = resolveDevLogSourceMeta(release, {
    repositoryUrl: repository,
    currentVersion,
    buildCommit: __APP_COMMIT_SHA__,
    capabilities,
  })

  if (!source.author && !source.commit) return null

  const authorContents = source.author ? <>
    <span className="devlog-avatar" aria-hidden="true">
      <span>{source.author.initials}</span>
      {source.author.avatarUrl ? <img src={source.author.avatarUrl} alt="" loading="lazy" /> : null}
    </span>
    <span>{source.author.name}</span>
  </> : null

  return <footer className="devlog-source-meta">
    {source.author?.profileUrl
      ? <a className="devlog-author" href={source.author.profileUrl} target="_blank" rel="noreferrer">{authorContents}</a>
      : source.author ? <span className="devlog-author">{authorContents}</span> : null}
    {source.commit ? <a
      className="devlog-commit"
      href={source.commit.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open commit ${source.commit.shortSha} on GitHub`}
    >
      <span aria-hidden="true">◇</span>
      {source.commit.shortSha}
      <span aria-hidden="true">↗</span>
    </a> : null}
  </footer>
}

export default function Devlog() {
  return <PageFrame page="devlog">
    <main id="main-content" className="devlog-page">
      <section className="devlog-hero">
        <div>
          <p className="kicker">Build in public</p>
          <h1>THE<br/><span>DEVLOG.</span></h1>
        </div>
        <aside className="release-card" aria-label="Current release">
          <span className="tiny-label">Current release</span>
          <strong>v{currentVersion}</strong>
          <p>Live public release record, linked to its source.</p>
          <span className="live-status"><i /> Live</span>
        </aside>
      </section>

      <section className="release-history" aria-label="Releases">
        <ol className="release-list">
          {releases.map((release, index) => <li className="release-entry" key={release.version}>
            <div className="release-rail">
              <span className="release-number">{String(releases.length - index).padStart(3, '0')}</span>
              <time dateTime={release.date}>{formatDevLogDate(release.date)}</time>
            </div>
            <article>
              <div className="release-title-row">
                <div>
                  <span className="version-chip">v{release.version}{index === 0 ? ' · CURRENT' : ''}</span>
                  <h3>{release.title}</h3>
                </div>
              </div>
              <p className="release-summary">{release.summary}</p>
              <ul>{release.notes.map((note) => <li key={note}>{note}</li>)}</ul>
              <SourceMeta release={release} />
            </article>
          </li>)}
        </ol>
      </section>

      <section className="devlog-cta">
        <div><span className="tiny-label">Try the evidence</span><h2>BRING YOUR WEIRDEST AUDIO BUG.</h2></div>
        <a className="pixel-button primary" href={import.meta.env.BASE_URL}>OPEN THE LAB</a>
      </section>
    </main>
  </PageFrame>
}
