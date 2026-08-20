import { useEffect, useState, type ReactNode } from 'react'
import { currentVersion } from './release-data'

const base = import.meta.env.BASE_URL
type SitePage = 'lab' | 'devlog'

function SkeletonBar({ className = '' }: { className?: string }) {
  return <span className={`skeleton-bar ${className}`} aria-hidden="true" />
}

function PageSkeleton({ page = 'lab' }: { page?: SitePage }) {
  if (page === 'devlog') return <main id="main-content" className="page-skeleton devlog-page" aria-busy="true" aria-label="Loading page">
    <section className="skeleton-hero">
      <div className="skeleton-copy"><SkeletonBar className="skeleton-kicker" /><SkeletonBar className="skeleton-title" /><SkeletonBar className="skeleton-title skeleton-title-short" /><SkeletonBar className="skeleton-lede" /></div>
      <div className="skeleton-card"><SkeletonBar className="skeleton-card-label" /><SkeletonBar className="skeleton-card-title" /><SkeletonBar className="skeleton-card-copy" /><SkeletonBar className="skeleton-card-copy short" /></div>
    </section>
    <section className="skeleton-section skeleton-history"><SkeletonBar className="skeleton-kicker" /><SkeletonBar className="skeleton-heading" /><div className="skeleton-release-list"><SkeletonBar /><SkeletonBar /><SkeletonBar /></div></section>
    <section className="skeleton-cta"><SkeletonBar className="skeleton-heading" /><SkeletonBar className="skeleton-action" /></section>
  </main>

  return <main id="main-content" className="page-skeleton" aria-busy="true" aria-label="Loading page">
    <section className="skeleton-workspace">
      <div className="skeleton-workspace-intro"><SkeletonBar className="skeleton-kicker" /><SkeletonBar className="skeleton-title" /><SkeletonBar className="skeleton-title skeleton-title-short" /><SkeletonBar className="skeleton-lede" /></div>
      <div className="skeleton-workspace-grid"><div className="skeleton-panel"><SkeletonBar className="skeleton-kicker" /><SkeletonBar className="skeleton-heading" /><SkeletonBar className="skeleton-drop-line" /><div className="skeleton-actions"><SkeletonBar className="skeleton-action" /><SkeletonBar className="skeleton-action" /></div><SkeletonBar className="skeleton-panel-status" /></div><div className="skeleton-panel"><SkeletonBar className="skeleton-kicker" /><SkeletonBar className="skeleton-heading" /><div className="skeleton-grid"><SkeletonBar /><SkeletonBar /><SkeletonBar /></div><SkeletonBar className="skeleton-panel-status" /></div></div>
    </section>
    <section className="skeleton-section"><SkeletonBar className="skeleton-kicker" /><SkeletonBar className="skeleton-heading" /><div className="skeleton-grid"><SkeletonBar /><SkeletonBar /><SkeletonBar /></div></section>
  </main>
}

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
    <div className="site-footer-inner">
      <div className="footer-brand">
        <a className="footer-brand-link" href={base} aria-label="Audio Browser Lab home">
          <img src={`${base}flygon-logo.png`} alt="" />
          <span><small>A Flygon LC project</small><strong>Audio Browser Lab</strong></span>
        </a>
        <p>Open-source tools for evidence-first browser audio debugging.</p>
        <div className="footer-privacy"><i /> <span>Files stay in your browser</span></div>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        <div className="footer-link-group">
          <span className="footer-label">Explore</span>
          <a href={base}>Open lab</a>
          <a href={`${base}devlog/`}>Public DevLog</a>
        </div>
        <div className="footer-link-group">
          <span className="footer-label">Project</span>
          <a href="https://github.com/aribradshaw/audio-browser-lab">Source code</a>
          <a href={`${base}sitemap.xml`}>Sitemap</a>
          <a href="https://github.com/aribradshaw/audio-browser-lab/blob/main/LICENSE">MIT License</a>
        </div>
      </nav>
    </div>
    <div className="footer-bottom">
      <span>© 2026 Flygon LC</span>
      <div className="footer-bottom-meta"><span>No usage tracking</span><span>v{currentVersion}</span></div>
    </div>
  </footer>
}

export function PageFrame({ children, page = 'lab' }: { children: ReactNode, page?: SitePage }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 160)
    const handleInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest('a') : null
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return
      const url = new URL(target.href, window.location.href)
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return
      event.preventDefault()
      document.documentElement.dataset.pageTransition = 'exit'
      window.setTimeout(() => window.location.assign(url.href), 180)
    }

    document.addEventListener('click', handleInternalNavigation)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', handleInternalNavigation)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    delete document.documentElement.dataset.pageTransition
  }, [ready])

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader page={page} />
    <div className={`site-page ${ready ? 'is-ready' : 'is-loading'}`}>
      {ready ? children : <PageSkeleton page={page} />}
    </div>
    <SiteFooter />
  </>
}
