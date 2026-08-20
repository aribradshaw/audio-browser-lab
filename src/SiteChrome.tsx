import type { ReactNode } from 'react'
import { currentVersion } from './release-data'

const base = import.meta.env.BASE_URL

export function SiteHeader({ page = 'lab' }: { page?: 'lab' | 'devlog' }) {
  return <header className="site-header">
    <a className="brand" href={base} aria-label="Audio Browser Lab home">
      <span className="pixel-mark" aria-hidden="true">ABL</span>
      <span>Audio Browser Lab</span>
    </a>
    <nav className="site-nav" aria-label="Primary navigation">
      <a className={page === 'lab' ? 'active' : ''} href={base}>Lab</a>
      <a href={`${base}#questions`}>Questions</a>
      <a className={page === 'devlog' ? 'active' : ''} href={`${base}devlog/`}>DevLog</a>
      <a href="https://github.com/aribradshaw/audio-browser-lab">GitHub</a>
    </nav>
    <span className="privacy-chip"><i /> Local only</span>
  </header>
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-brand">
      <div className="flygon-lockup">
        <img src={`${base}flygon-logo.png`} alt="" />
        <span>A Flygon LC project</span>
      </div>
      <p>Open-source tools for evidence-first browser audio debugging.</p>
    </div>
    <nav className="footer-links" aria-label="Footer navigation">
      <a href={base}>Open lab</a>
      <a href="https://github.com/aribradshaw/audio-browser-lab">Source code</a>
      <a href="https://github.com/aribradshaw/audio-browser-lab/blob/main/LICENSE">MIT License</a>
    </nav>
    <div className="footer-meta">
      <span>v{currentVersion}</span>
      <a href={`${base}devlog/`}>Public DevLog</a>
      <span>Files stay in your browser</span>
      <span>No usage tracking</span>
    </div>
    <p className="copyright">© 2026 Flygon LC. Code released under the MIT License.</p>
  </footer>
}

export function PageFrame({ children, page }: { children: ReactNode, page?: 'lab' | 'devlog' }) {
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader page={page} />
    {children}
    <SiteFooter />
  </>
}
