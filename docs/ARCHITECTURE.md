# Architecture

The project is a small monorepo with one shared report schema.

```text
audio file or URL
  -> core MP3 inspector and report schema
  -> browser measurements or Node inspection
  -> deterministic diagnosis engine
  -> web UI, CLI, API, MCP, Howler adapter, or WaveSurfer adapter
```

`@audio-browser-lab/core` has no browser or Node dependency. It owns structure inspection, questions, diagnoses, and report comparison. The browser package adds native media, Web Audio, codec, seek, hashing, and remote-delivery measurements. Every other surface consumes the same core functions so the verdict does not drift between interfaces.

The report SHA-256 protects cross-browser comparisons from the most common testing mistake: using different files with the same display name.

## Site shell conventions

Both public pages render through `PageFrame` in `src/SiteChrome.tsx`. Keep new pages inside that shell so they inherit the loading skeleton, staggered top-level module entrance, reduced-motion behavior, and same-origin exit transition. New static HTML entries are discovered by `scripts/generate-sitemap.mjs` during `npm run build` and included in `public/sitemap.xml`.

## Headless DevLog package

The external [`@aribradshaw/devlog`](https://github.com/aribradshaw/devlog) package owns portable release types and behavior without owning a visual design. Its capability policy lets a host choose public or private defaults, then independently expose author, commit, source-subject, batched-commit, lifecycle, search, and pagination features.

Audio Browser Lab is the first consumer. Its DevLog keeps the local pixel interface while using the package to resolve GitHub profiles, avatars, and exact source commits. Current-release commits come from `GITHUB_SHA` during the Pages build, so the release can link to the commit that contains itself.
