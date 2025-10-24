
## Project Structure & Module Organization
- `apps/frontend`: Vite/React extension; code in `src`, builds in `dist`, Chrome load from `extension`.
- `apps/backend`: Fastify + Socket.IO API; TypeScript in `src`, compiled output in `dist`.
- `packages/definitions`: Shared Zod schemas and TypeScript contracts.
- `packages/commander`: Reusable command framework (providers, hooks, utilities).

## Build, Test, and Development Commands
- `pnpm install` — bootstrap all workspaces.
- `pnpm --filter @eye-note/frontend watch` — live-builds the extension into `apps/frontend/extension`.
- `pnpm --filter @eye-note/backend dev` — ts-node Fastify server (reads `.env`).
- `pnpm --filter {frontend|backend} build` — production bundles; `pnpm lint` keeps ESLint clean.
- `pnpm --filter <workspace> exec tsc --noEmit` — mandatory type gate before PRs.

## Coding Style & Naming Conventions
- TypeScript, 4-space indent; keep spaced annotations.
- Components in PascalCase, Zustand stores/hooks camelCase, shared Tailwind helpers in `src/lib` or `components/ui`.
- No formatter—lean on ESLint plus manual tidy-up.

## Testing Guidelines
- Automated suites are absent (`apps/backend` test exits 1); align before adding harnesses.
- Once testing lands, prefer Fastify injection tests (Vitest/tap) and document scripts.
- Smoke-test via Chrome-loaded `apps/frontend/extension` and Inspector Mode.
- `pnpm --filter <workspace> exec tsc --noEmit` is the regression gate.

## Commit & Pull Request Guidelines
- Conventional Commits (`type(scope): summary`) with imperative verbs, lowercase scopes.
- Squash setup noise, link issues, flag env/config deltas, attach UI evidence for behavior changes.
- Run lint/build scripts before review; note skipped checks in the PR body.

## Security & Configuration Tips
- Keep secrets in untracked `.env` files (`MONGODB_URI`, `GOOGLE_CLIENT_ID`, backend socket config).
- Never commit `apps/frontend/extension`; regenerate via build scripts.

## Changelog & Task Log
- **Repository recon & DOM mapping**: catalogued structure, built `PageAnalyzer` snapshots (pointer offsets, scroll, EyeNote exclusions), integrated with `useNotesStore`/`ShadowDOM`, and re-ran frontend `tsc --noEmit`.
- **Backend foundation**: scaffolded Fastify (dotenv/zod config, logging, CORS, Mongo/Mongoose, auth middleware) plus `/api/notes` CRUD with user-scoped zod validation; confirmed via backend `tsc --noEmit`.
- **Shared definitions & cleanup**: shipped `@eye-note/definitions`, synced workspace manifests, removed `bun.lock`, regenerated `pnpm-lock.yaml`, and type-checked backend/frontend/definitions.
- **Authentication & persistence (current session)**: added Google OAuth in the background worker (using `chrome.identity.getRedirectURL()`), persisted ID/access tokens + user info, refactored the notes store to call `/api/notes`, and gated note loading/creation on auth.
- **Reference tests**: `pnpm --filter @eye-note/{frontend,backend,definitions} exec tsc --noEmit`.
- **Update policy**: append a dated bullet here after every substantial task; this log replaces `gpt-codex-history.txt`.
- **2025-10-24 – Inspector focus & per-URL notes**: dropped inspector mode once an element is selected so the add-note dialog retains focus, introduced URL change detection (history patch + polling) to reload notes per page, and aligned the notes store typing with its async `createNote`.
