# 2025-11-12

## Notes overlay
- Prevented the extension NoteSheet from endlessly refetching `/api/notes/:id/chat/messages` when a note has no chat history by tracking per-note chat initialization in the store so the initial load only fires once per session.
- Added an end-to-end notifications system: Mongo-backed notification records, Fastify `/api/notifications` listing + read endpoints, live gateway broadcasts, and an extension notification center with realtime updates and Chrome badge sync.
- Reworked group invites into an approval-driven workflow—join requests now fan out via the notification system, group managers can approve or decline directly from the overlay, and applicants are synced into their groups automatically once approved.

# 2025-11-11

## Notes overlay
- Replaced the note sheet's native select with the shared shadcn dropdown so editors can preview group colors directly inside the overlay.
- Exported the select primitives from `@eye-note/ui` and threaded group color metadata through note group options to keep the picker in sync even when a group's membership changes.
- Kept the note sheet at full opacity whenever the dropdown is open so the panel no longer fades mid-edit, moved the Radix select portal inside the shadow container, and boosted the popover z-index/logging so the menu renders above the overlay and we can trace when it opens or closes.
- Simplified the group selector trigger so it no longer shows a duplicate color chip; the top-of-sheet header remains the single color indicator.
- Introduced server-side chat infrastructure: added Mongo models, REST endpoints, and a socket.io gateway (auth tokens + `/api/notes/:id/chat/messages`) so group members can exchange real-time note messages.
- Wired the extension to the new realtime service with a `useRealtimeStore`, chat store, and NoteSheet UI that streams messages live, loads history, and falls back to HTTP when the socket drops.
- Split the websocket gateway into a dedicated `apps/live` service with its own Fastify + Socket.IO stack, reusable Mongoose models (`@eye-note/backend-models`), and a configurable `REALTIME_JWT_SECRET`, so the REST API and realtime layer can scale independently.

# 2025-10-30

## Overlay capture & rendering
- Updated `specs/notes.md` so note anchoring assumes 1-indexed cursor offsets and removed normalized ratio fallback language.
- Refined shared definitions plus backend validation/models to drop `elementOffsetRatio`, keeping only 1-indexed offsets captured by the analyzer.
- Reworked the extension capture/rehydration flow to recompute marker coordinates by adding stored cursor offsets to the live element frame once page identity resolves.
- Prevented markers from rendering until page identity broadcasts and the target element is located, clearing stored coordinates whenever the anchor is missing so nothing appears at stale positions.
- Removed persisted absolute marker coordinates (`x`/`y`) across definitions, backend models, and extension logic so rendering always derives positions from live element geometry plus stored cursor offsets.
- Normalized incremental rehydration path matching (stripping positional pseudo-classes like `:nth-of-type()`/`:nth-child()`) so markers refresh whenever any ancestor in their selector tree re-renders.
- Rehydration now refreshes selector strings, DOM rectangles, and scroll snapshots for recovered anchors so markers realign immediately after their subtree re-mounts.
- Added automatic recovery for notes missing live elements: every mutation flush re-attempts rehydration so markers reappear the instant their anchors return to the DOM.
- Increased the DOM mutation debounce window to 800 ms so rapid successive mutations are coalesced before forcing rehydrate passes.

# 2025-10-29

## Documentation
- Realigned `AGENTS.md` with the current workspace layout (`apps/app`, `apps/dashboard`, `apps/ext`) and developer commands.
- Inlined `.cursor` automation rule descriptions inside `AGENTS.md` for quick reference.
- Added a root `pnpm type-check` script that executes TypeScript checks across every workspace and documented it for agents.

## UI
- Consolidated the EyeNote sign-in prompt icon inside `@eye-note/ui`, bundling the SVG with the component so consuming apps no longer need to ship their own copy.
- Updated the extension tooling to read the same shared SVG when generating Chrome icon assets so there is a single source of truth.

## Auth
- Let the dashboard Google OAuth flow read an explicit `VITE_GOOGLE_REDIRECT_URI` so the registered redirect can differ from `window.location.origin`, mirroring the extension’s working configuration.

# 2025-10-27

## Popup quick controls
- Refined the popup header controls so the menu and settings buttons trigger wide content-script overlays instead of in-popup dialogs.
- Synced extension preference toggles across the popup and overlay and added a quick menu action that opens the in-page group manager.

# 2025-10-25

## Discord-like role system for groups
- Implemented comprehensive role-based permission system with hierarchy (Owner > Admin > Moderator > Member) and granular permissions (manage group, manage roles, manage members, moderate content, create/edit/delete/view notes).
- Added `GroupRole` and `GroupMemberRole` MongoDB models with position-based hierarchy, custom colors, and permission arrays.
- Created `RoleService` with permission checking, role assignment/removal, and hierarchy enforcement utilities.
- Extended `/api/groups` routes with role management endpoints: create/update/assign/remove roles, get group with roles data.
- Built role management UI components: `RoleManagementPanel`, `RoleList`, `RoleForm` with permission selection and role hierarchy display.
- Integrated role management into existing group manager with "Manage Roles" button for group owners.
- Added permission checking utilities and role-based access control throughout the application.
- Automatically creates default roles (Owner, Admin, Moderator, Member) when new groups are created.
- Regenerated frontend/backend/definitions type checks with `pnpm --filter @eye-note/{definitions,backend,frontend} exec tsc --noEmit`.

## Page identity shared package
- Scaffolded `@eye-note/page-identity` with shared fingerprints, DOM capture utilities, and server-side ranking helpers so clients/backend can agree on document identity beyond raw URLs.
- Added a frontend `usePageIdentity` hook that captures fingerprints on navigation and publishes them via a custom event for future integration.
- Persist page identity metadata in Mongo, introduced `/api/notes/query` to resolve fingerprints server-side, and thread resolved `pageId` through note fetch/create flows.
- Normalize identities against canonical URLs when available so harmless query params (`?das`) resolve to the same note document.
- Await DOM readiness when fingerprinting, flush stale identity state on navigation, and cascade backend lookups across normalized URLs so the correct notes load on the first visit and after every route change.

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

# 2025-10-27

## UI composition
- Extracted the Quick Lunch dialog into `QuickMenuDialog` under `apps/frontend/src/components` and updated the shadow overlay to consume the shared component.

## Settings hub & shadcn refresh
- Added a reusable two-pane `SettingsDialog` that drives general preferences and group management from a shared layout, wiring the shadow overlay and quick menu to target specific sections.
- Realigned `QuickMenuDialog` controls and gating to the new settings flow, disabling group actions when collaboration isn’t available.
- Upgraded checkbox and toast UI primitives to the shadcn patterns so shared components stay consistent across the extension.
- Refreshed the Chrome popup to focus on collaboration: swapped the settings toggles for inline create/join group forms and retargeted quick controls to open the shared group manager.

# 2025-10-28

## Shared UI package
- Promoted the shadcn-based primitives and `SettingsDialog` into a new `@eye-note/ui` workspace package with Radix dependencies, exposing a consolidated surface for Tailwind/React consumers.
- Refactored the extension overlay, popup, and group manager to consume the shared exports and dropped the local `lib/utils.ts` helper.

## Dashboard settings app
- Scaffolded `apps/dashboard` (Vite + Tailwind) to render overlay preferences outside the extension, persisting toggles to `localStorage` and wiring the shared `@eye-note/ui` components.
- Added a collaboration roadmap panel and reset affordances to clarify the future standalone experience while reuseing the shared toast/toaster abstractions.
- Matched the dashboard layout to the extension settings two-pane surface so users get a consistent navigation and content structure across entry points.
- Implemented Google OAuth sign-in for the dashboard using a popup flow, local session storage, and shared account header controls so standalone settings stay in sync with authenticated API calls.
# 2025-10-30

## Extension overlay — Phase A visibility gating

## Extension overlay — Phase C indexing & payloads

## Extension overlay — Phase D robust rehydration

## Extension overlay — Phase E virtualization
- Added `useMarkerVirtualization` hook using `IntersectionObserver` with a configurable buffer to limit marker/dialog rendering to in-viewport anchors.
- Overlay now prefers the IO visibility set; falls back to computed visibility when IO is unavailable.
- Reduces layout work on long pages with many notes.
- Added optional `anchorHints` to note contracts (tagName, id, sampled classes, selected `data-*` attributes, short text hash) to improve element recovery when selectors drift.
- Capture `anchorHints` on draft creation; include in create/update payloads.
- Extended rehydration to try recovery by `id`, whitelisted `data-*` attributes, class sample, then a capped text-hash scan before giving up.
- Added `hostname` to note base contracts and query payloads in `@eye-note/definitions` to support composite indexing `(hostname, normalizedUrl, layoutSignature)` alongside resolved `pageId`.
- Threaded `hostname` through draft creation, create/update payloads, and list queries in the extension without breaking existing flows.
- Verified extension and definitions type checks with `tsc --noEmit`.
- Added strict marker visibility rules: markers render only when the anchored element is connected, visible by style, has non-zero geometry, and intersects the viewport.
- Introduced `isElementVisible` utility and wired it into rehydration and renderer filtering to suppress markers for hidden/offscreen elements.
- Kept behavior minimal and testable; no backend/API changes in this phase.

## Backend — page indexing and note model refresh
- Added `hostname` and `anchorHints` to note model; created compound indexes `{userId,pageId,updatedAt}` and `{userId,hostname,normalizedUrl,updatedAt}`.
- Updated zod schemas to accept `hostname` and `anchorHints` on create/update, and `hostname` on queries.
- Simplified `/api/notes/query` to resolve `pageId` from identity and then query by `pageId`, or fall back to `(hostname, normalizedUrl)` when no `pageId` is available. Removed legacy URL fallback paths per new dataset policy.

## Fixes
- Accept note creates when `pageIdentity` is briefly unavailable by using provided `pageId` or safe `(hostname, normalizedUrl)` composite; add server-side composite query fallback when pageId lookup returns empty.
- Quiet health endpoint logs to reduce noise while debugging.
- Improve client robustness: wait for identity/pageId before saving, inline-capture identity on save if missing, and log payloads clearly for diagnosis.

# 2025-11-02

## Extension notes modularization
- Broke `notes-component` into dedicated marker, sheet, and image viewer components under `apps/ext/src/features/notes/components` to keep the feature composable and easier to maintain.
- Confirmed the extension workspace still type-checks via `pnpm --filter @eye-note/ext exec tsc --noEmit`.

## Inspector feedback improvements
- Introduced `ShadowToastProvider` + `useShadowToast` in `@eye-note/ui` so shadow DOM surfaces can trigger full-width, bottom-anchored toast messages without relying on the document body.
- Wrapped the overlay tree with the new provider and emit a toast when Shift-triggered inspector mode is blocked because the backend is offline, giving users immediate feedback about the connection state.
- Reused a stable toast id and manage a 3-second timeout manually so the notification auto-dismisses even if the backend remains down, while still preventing duplicate toasts.
- Added the official `icon.svg` asset to the left of every shadow toast so the overlay branding stays present even when rendered inside arbitrary shadow roots.
- Added a `KeyboardEvent.repeat` guard to the inspector hotkey handler so holding Shift no longer spams the warning toast while the backend is offline.
- Show a second toast when Shift is pressed while signed out (“Sign in to use inspector mode.”) using the same debounced infrastructure so users understand both offline and authentication blockers.
