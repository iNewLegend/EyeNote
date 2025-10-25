# 2025-10-24

## Inspector focus & per-URL notes
- Dropped inspector mode once an element is selected so the add-note dialog retains focus.
- Introduced URL change detection (history patch + polling) to reload notes per page.
- Aligned the notes store typing with its async `createNote`.

## Authentication & persistence
- Added Google OAuth in the background worker via `chrome.identity.getRedirectURL()`.
- Persisted ID/access tokens and user info, refactored the notes store to call `/api/notes`, and gated note loading/creation on auth.

## Auth-gated inspector mode
- Required a successful backend + Google auth handshake before inspector mode can activate.
- Prevented the Shift shortcut when unauthenticated and re-ran `pnpm --filter @eye-note/frontend exec tsc --noEmit`.

## Stable extension ID
- Generated a dedicated Chrome extension key and updated the manifest so the unpacked extension ID stays consistent for OAuth redirects.
- Re-whitelisted the redirect URI for Google OAuth.

## Shared definitions
- Shipped `@eye-note/definitions`, synced workspace manifests, removed `bun.lock`, regenerated `pnpm-lock.yaml`, and type-checked backend/frontend/definitions.
- Moved auth/session, health response, and note query contracts into the shared package and refactored backend/frontend callers accordingly.

## OAuth handshake verification
- Whitelisted the fixed extension redirect URI in Google Cloud, confirmed sign-in succeeds, and validated inspector mode gating with an authenticated session.

## Popup integration & tooling upgrades
- Removed the mock Chrome API from `apps/frontend/src/core/extension-popup/extension-popup.tsx` and wired the popup to the real `chrome.storage.local` calls with runtime guards.
- Upgraded the tooling stack to run `pnpm@9.15.9` under Node 22 so workspace installs pass `sharp@0.33.5` engine checks, reinstalled dependencies, and re-ran the frontend type gate.

# 2025-10-22

## Repository recon & DOM mapping
- Catalogued project structure, built `PageAnalyzer` snapshots (pointer offsets, scroll, EyeNote exclusions), integrated with `useNotesStore`/`ShadowDOM`, and re-ran frontend `tsc --noEmit`.

## Backend foundation
- Scaffolded Fastify (dotenv/zod config, logging, CORS, Mongo/Mongoose, auth middleware) plus `/api/notes` CRUD with user-scoped zod validation; confirmed via backend `pnpm --filter @eye-note/backend exec tsc --noEmit`.

## Reference tests
- `pnpm --filter @eye-note/{frontend,backend,definitions} exec tsc --noEmit`.

## Update policy
- Established that all substantial work should be logged here with dated bullets, replacing `gpt-codex-history.txt`.
