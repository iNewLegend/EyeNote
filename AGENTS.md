## Project Structure & Module Organization
- `apps/backend`: Fastify + Socket.IO API; TypeScript lives in `src` and compiles to `dist`.
- `apps/ext`: Vite Chrome extension; `src` sources, watch/build rolls up to `dist` and copies the unpacked bundle into `extension/`.
- `packages/auth`: Shared auth flows with environment-specific entrypoints.
- `packages/definitions`: Shared Zod schemas and TypeScript contracts.
- `packages/page-identity`: Shared document fingerprinting and resolution helpers.
- `packages/ui`: Shared shadcn/Tailwind UI primitives.

## Build, Test, and Development Commands
- `pnpm install` — bootstrap all workspaces.
- `pnpm backend:dev` or `pnpm --filter @eye-note/backend dev` — nodemon + tsx Fastify server (reads `.env`).
- `pnpm ext:dev` or `pnpm --filter @eye-note/ext dev` — watches Vite builds and repacks the Chrome extension into `apps/ext/extension`.
- `pnpm --filter @eye-note/backend build` — transpile the API into `apps/backend/dist`.
- `pnpm --filter @eye-note/ext build` — clean/build Vite outputs and prepare the unpacked extension.
- `pnpm --filter @eye-note/ext build` — clean/build Vite outputs and prepare the unpacked extension.
- `pnpm lint` — run ESLint across all `apps`.
- `pnpm type-check` — run `tsc --noEmit` against every workspace to keep shared types honest.
- `pnpm --filter <workspace> exec tsc --noEmit` — mandatory type gate before PRs.

## Coding Style & Naming Conventions
- TypeScript, 4-space indent; keep spaced annotations.
- Components in PascalCase, Zustand stores/hooks camelCase, shared Tailwind helpers in `src/lib` or `components/ui`.
- No formatter—lean on ESLint plus manual tidy-up.

## Testing Guidelines
- Automated suites are absent (`apps/backend` test exits 1); align before adding harnesses.
- Once testing lands, prefer Fastify injection tests (Vitest/tap) and document scripts.
- Smoke-test via Chrome-loaded `apps/ext/extension` and Inspector Mode.
- `pnpm --filter <workspace> exec tsc --noEmit` is the regression gate.

## Commit & Pull Request Guidelines
- Conventional Commits (`type(scope): summary`) with imperative verbs, lowercase scopes.
- Squash setup noise, link issues, flag env/config deltas, attach UI evidence for behavior changes.
- Run lint/build scripts before review; note skipped checks in the PR body.

## Security & Configuration Tips
- Keep secrets in untracked `.env` files (`MONGODB_URI`, `GOOGLE_CLIENT_ID`, backend socket config).
- Never commit `apps/ext/extension`; regenerate via build scripts.

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

### Cursor Rule Details
- `always-find-the-root-cause-instead-of-using-hacks`: Always find the root cause instead of patching around problems.
- `code-should-be-modular`: Shape code so components stay reusable and implementation-agnostic.
- `never-commit-without-my-permission`: Ask for approval before creating commits.
- `prefer-use-react-instead-of-direct-dom`: Implement UI changes through React rather than touching the DOM directly.
- `prefer-use-shadcn-for-ui`: Build interface pieces with shadcn UI components by default.
- `prefer-use-tailwind-style`: Prefer Tailwind utility classes wherever styling makes sense.
- `small-steps-for-changes`: Deliver work in small, testable increments.
- `this-project-use-pnpm-its-monorepo-workspace`: Use `pnpm` and treat the repo as a monorepo workspace.
- `use-kebab-case-for-filenames`: Name new TypeScript files with kebab-case file names.
- `use-zustand-when-needed`: Reach for Zustand when shared client-side state is needed.

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

Specify the relevant workspace, package, or directory using slash notation (e.g. `ext/overlay`, `backend/api`, `shared/ui`). Pick the narrowest scope that reflects the change.

### Tag3 - Description (Required)

Provide a clear, concise explanation of what was done:

- Use present tense ("Add feature" not "Added feature")
- Be specific about the changes
- Focus on the "what" and "why"
- Keep it under 50 characters when possible
- Use lowercase (except for proper nouns)

### Examples

```
feat(`ext/overlay`): add inspector controls
fix(`backend/api`): guard missing sessions
chore(`shared/definitions`): sync zod contracts
infra(`root`): configure lint workflow
tweak(`ext/ui`): refine settings layout
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
