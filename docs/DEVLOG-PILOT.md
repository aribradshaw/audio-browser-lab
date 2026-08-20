# Reusable DevLog pilot

## Decision

A shared DevLog source of truth is worthwhile if it is headless. Projects should share release types, validation, GitHub source resolution, search, pagination, and version helpers. They should not share a fixed page component, stylesheet, data store, access policy, or deployment provider.

Audio Browser Lab is the proving ground. No other project should adopt the package until this integration is approved and the package API is extracted into its own public repository.

## Existing project needs

| Project | Audience | Useful capabilities | Host-owned concerns |
| --- | --- | --- | --- |
| Audio Browser Lab | Public | Author, avatar, exact commit | Pixel visual system and GitHub Pages build |
| 1976 | Public | Optional author and commit | Election-broadcast presentation and contribution calls to action |
| Brickstone Learning | Project users | Author, avatar, profile, commit | Next.js page and project-specific release copy |
| Saguaro Signal | Private admin | Author, commit, search, pagination | Database fallback, admin shell, and authentication |
| Campaign Baby | Private admin | Search, pagination, deployment context | Platform admin styling and deployment data |
| Peter MD | Private admin | Author, avatar, commit, batched commits, lifecycle, search, pagination | HIPAA-safe data rules, authentication, database lifecycle, and Vercel deployment recording |

## Package boundary

The shared package may own:

- Portable release, author, commit, and included-commit types.
- Public and private capability defaults with per-project overrides.
- Author initials and safe GitHub avatar and profile resolution.
- Exact current-build commit fallback.
- Repository commit URLs.
- Search and pagination helpers.
- Calendar version helpers after the existing implementations are reconciled.
- Framework-neutral validation and migration utilities.

Each host project must continue to own:

- Rendering and visual styling.
- Public versus authenticated routing.
- Database, JSON, API, or build-time data loading.
- Which fields are safe to expose.
- Deployment-provider lifecycle collection.
- Project-specific release prose and calls to action.

## Extraction sequence

1. Prove the headless package in Audio Browser Lab.
2. Approve the API and visual result.
3. Extract `@aribradshaw/devlog` into a dedicated public repository without changing consumers.
4. Publish an initial npm version only after package names and ownership are confirmed.
5. Migrate one lower-risk project, preferably 1976 or Brickstone Learning.
6. Migrate Saguaro Signal and Campaign Baby independently.
7. Treat Peter MD as the final adoption because its lifecycle, authentication, and privacy requirements are the richest.

## Pilot acceptance gates

- Audio Browser Lab preserves its existing design.
- Every historical entry links to its exact source commit.
- The current release uses the CI build SHA without a self-referential commit edit.
- Avatar failure falls back to initials.
- Author and commit metadata wrap cleanly on small screens.
- Public policy hides lifecycle and batch details by default.
- The package passes type checks, unit tests, a production build, and an npm dry-run pack.
