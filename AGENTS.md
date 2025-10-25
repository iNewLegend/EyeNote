
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
- Maintained in `CHANGELOG.md`. Read existing entries there and append new dated bullets in that file after every substantial task; this replaces `gpt-codex-history.txt`.
