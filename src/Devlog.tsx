import { PageFrame } from './SiteChrome'
import { currentVersion, releases } from './release-data'

const repository = 'https://github.com/aribradshaw/audio-browser-lab'

function commitUrl(commit: string) {
  return commit === 'main' ? `${repository}/commits/main` : `${repository}/commit/${commit}`
}

export default function Devlog() {
  return <PageFrame page="devlog">
    <main id="main-content" className="devlog-page">
      <section className="devlog-hero">
        <div>
          <p className="kicker">Build in public</p>
          <h1>THE<br/><span>DEVLOG.</span></h1>
          <p className="lede">A plain-English record of what changed, why it matters, and which release is live.</p>
        </div>
        <aside className="release-card" aria-label="Current release">
          <span className="tiny-label">Current release</span>
          <strong>v{currentVersion}</strong>
          <p>Every public update gets a three-part version and a readable release record.</p>
          <span className="live-status"><i /> Live</span>
        </aside>
      </section>

      <section className="release-history" aria-labelledby="release-history-title">
        <div className="section-title release-heading">
          <div>
            <span className="tiny-label">Release history</span>
            <h2 id="release-history-title">WHAT SHIPPED</h2>
          </div>
          <p>Newest first. No marketing fog.</p>
        </div>
        <ol className="release-list">
          {releases.map((release, index) => <li className="release-entry" key={release.version}>
            <div className="release-rail">
              <span className="release-number">{String(releases.length - index).padStart(3, '0')}</span>
              <time dateTime={release.date}>{new Date(`${release.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
            </div>
            <article>
              <div className="release-title-row">
                <div>
                  <span className="version-chip">v{release.version}{index === 0 ? ' · CURRENT' : ''}</span>
                  <h3>{release.title}</h3>
                </div>
                <a className="text-link" href={commitUrl(release.commit)}>View source ↗</a>
              </div>
              <p className="release-summary">{release.summary}</p>
              <ul>{release.notes.map((note) => <li key={note}>{note}</li>)}</ul>
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
