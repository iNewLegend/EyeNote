# 2025-10-25

## Group collaboration foundation
- Added shared group contracts, a Mongo-backed `GroupModel`, and `/api/groups` list/create/join/leave routes that validate membership before assigning notes; note queries now accept multi-group filters.
- Shipped a popup group manager via a shared Zustand store that hydrates from Chrome storage, lets users create or join groups, toggle active sets, copy invite codes, and persists selections across contexts.
- Updated the content script to initialize group data, filter note loading by the active groups, default new notes to the leading active group, and expose group selection inside the note dialog.
- Refactored group management into a reusable panel, reusing it in the browser action popup and adding an in-page "Manage groups" dialog inside the content script overlay.
- Let group owners pick custom hex colors for their note markers; persisted color metadata in the backend, exposed update APIs, and tinted markers and UI badges by group.
- Regenerated frontend/backend/definitions type checks with `pnpm --filter @eye-note/{definitions,backend,frontend} exec tsc --noEmit`.

# 2025-10-24

## Notes store modularization
- Shifted all API interaction out of the notes Zustand store into a controller/service layer to keep state updates pure.
- Renamed the API helper module to `notes-api` to better reflect its responsibility.
- Migrated note CRUD wrappers from `lib/api-client` into `notes-api` so the shared client stays transport-focused.
- Updated backend config loading to prefer the workspace root `.env`, falling back to local defaults when absent.
- Centralized the Google OAuth client ID: Vite, background auth, and the extension manifest now draw from the root `.env`, with the build script injecting the value during extension prep.
- Extracted Chrome storage helpers into `lib/auth-storage` so the API client stays transport-focused.
- Gathered auth code under `src/modules/auth` (background handlers, store, dialog, storage) and updated consumers to import from the module entrypoint.
- Moved backend health polling into the background service worker and broadcast status updates to the page overlay instead of running timers inside hot-reloaded React components.
- Synced the extension popup with background health updates so users see connection status even after HMR reloads.
- Extracted shared hooks (`useBackendHealthBridge`, `useAuthStatusEffects`, `useNotesLifecycle`, etc.) so Shadow DOM and the popup share the same lifecycle logic.
- Simplified the popup UI: removed connection labels and show a dedicated error state when the backend is unavailable.
- Introduced a `useNotesController` hook for React consumers, updated store/service wiring, and re-ran `pnpm --filter @eye-note/frontend exec tsc --noEmit`.

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
