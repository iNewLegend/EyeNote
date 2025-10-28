## Read project .cursor/rules

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

## Cursor Rules
- Always chase the root cause instead of patching with hacks or workarounds.
- Keep code modular and reusable; favor implementation-agnostic naming.
- Always write modular code that respects the Single Responsibility Principle.
- Never create commits without explicit user permission.
- Prefer React abstractions over direct DOM manipulation.
- Use shadcn UI primitives for new interface components.
- Favor Tailwind for styling whenever practical.
- Make changes in small, testable steps before moving on.
- Remember the workspace uses `pnpm` with a monorepo layout.
- Name new TypeScript files with kebab-case filenames.
- Reach for Zustand when a shared client-side store is warranted.

## Cursor Rules for Commit Messages

When generating commit messages, follow this exact format:

### Format Template

```
Tag1(`Tag2`): Tag3
```

### Tag1 Categories (Required)

Choose ONE from these options:

- `feat` - New feature or functionality
- `fix` - Bug fix or issue resolution
- `chore` - Maintenance tasks, dependencies, or tooling
- `infra` - Infrastructure changes, CI/CD, deployment
- `tweak` - Minor improvements, refactoring, or adjustments

### Tag2 - Package/Area (Required)

Specify the relevant workspace, package, or directory using slash notation (e.g. `frontend/groups`, `backend/api`, `shared/utils`). Pick the narrowest scope that reflects the change.

### Tag3 - Description (Required)

Provide a clear, concise explanation of what was done:

- Use present tense ("Add feature" not "Added feature")
- Be specific about the changes
- Focus on the "what" and "why"
- Keep it under 50 characters when possible
- Use lowercase (except for proper nouns)

### Examples

```
feat(`frontend/app`): add resume section reordering functionality
fix(`docs`): resolve broken internal links in api documentation
chore(`shared/types`): update typescript dependencies to latest
infra(`root`): configure automated deployment pipeline
tweak(`frontend/groups`): centralize group bootstrap hook
```

### Instructions

When generating commit messages:

1. Analyze the changes - Review file modifications, additions, deletions
2. Determine the primary change type - Choose the most appropriate Tag1
3. Identify the affected area - Determine which package/area is primarily affected
4. Summarize the change - Write a clear, concise description
5. Follow the exact format - Ensure proper syntax and capitalization
6. Be consistent - Use the same style and terminology across commits

Always provide the commit message in this exact format:
Tag1(`Tag2`): Tag3

Do not include additional explanations, just the commit message itself.
