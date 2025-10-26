# @eye-note/page-identity

Shared utilities that let EyeNote clients and services agree on what “the same page” means when URLs are unreliable. The package coordinates DOM fingerprinting on the browser side with validation on the backend so notes stick to the right document even when routing or query params change.

## Why this exists

- **URL roulette:** Many apps mutate query params or hash fragments without changing the rendered content, so raw URLs cannot be trusted as stable identifiers.
- **Cross-client consistency:** Browser extensions, IDE integrations, and backend APIs must all converge on a single page identity contract to keep shared annotations aligned.
- **Defense against collisions:** Centralised heuristics help detect when seemingly different URLs render the same document (and when they do not), preventing accidental note bleed-over.

## Package layout

```
packages/page-identity/
├─ src/
│  ├─ client/          # Browser/extension helpers for DOM sampling & hashing
│  ├─ server/          # Fastify-friendly verification and persistence helpers
│  ├─ shared/          # Types, constants, hashing algorithms
│  └─ index.ts         # Public entrypoint re-exporting shared APIs
├─ README.md
├─ package.json
└─ tsconfig.json
```

## Key concepts

- **PageIdentity:** Canonical structure describing a render (canonical URL hints, normalized URL, content signature, layout tokens, optional anchor resolution stats).
- **Fingerprints:** Lightweight hashes (SimHash/MinHash) built from stable DOM landmarks and text; tuned to ignore cosmetic or personalised noise.
- **Equivalence rules:** Domain-scoped normalization, canonical tag discovery, and server-side overrides ensure consistent decisions across clients.

## Options we evaluated

**Client-only detection**
- Pros: instant decisions, works offline, can probe live DOM anchors.
- Cons: easy for clients to diverge, backend loses visibility, harder to secure against bad actors.

**Backend-only detection**
- Pros: single source of truth, simpler analytics and overrides.
- Cons: still needs client DOM fingerprints, adds latency, cannot resolve selectors locally.

**Hybrid (our choice)**
- Pros: keeps DOM-heavy work on the client but lets the backend authoritatively confirm or remap identities for every request; ensures consistency across devices.
- Cons: requires shared payload contracts and version compatibility between client fingerprints and backend validators.

## Decision

Use a **hybrid model**: clients compute fingerprints with the utilities in this package, ship them alongside note requests, and the backend confirms or reassigns the final `pageId`. The shared package hosts both halves so heuristics stay aligned.

## Client responsibilities

- Listen for navigation events (pushState, popstate, visibility) and treat them as triggers—not truth—for re-evaluating the current document.
- Wait for the DOM to settle (idle callback + mutation debounce), then call `computePageIdentity(document)` to gather fingerprints.
- Compare the new identity against the last known render using `isSameDocument(prev, next)`.
- Send the latest identity to the backend with every note fetch/mutation so the server can confirm or remap the page identifier.
- Cache the resolved `pageId` per origin to shortcut subsequent lookups within the extension session.

## Backend responsibilities

- Accept fingerprints from clients (e.g. via `POST /api/notes:list` payloads) and match them against stored identities using `resolvePageIdentity`.
- Maintain canonical records in persistent storage—linking equivalent fingerprints, merging metadata, and issuing stable `pageId` tokens for downstream queries.
- Apply whitelist/blacklist overrides for tricky domains and emit telemetry for ambiguous matches so heuristics can evolve.
- Provide reconciliation utilities (`mergePageIdentity`, `recordAlias`) to keep historical notes reachable when heuristics change.

## Suggested API surface

```ts
// shared/index.ts
export type PageIdentity = { /* canonicalUrl, normalizedUrl, signatures */ };
export type PageIdentityMatch = { pageId: string; confidence: number; reason: string };

// client exports
export function capturePageIdentity(target?: Document): Promise<PageIdentity>;
export function comparePageIdentities(a: PageIdentity, b: PageIdentity): boolean;

// server exports
export async function resolvePageIdentity(
  fingerprint: PageIdentity,
  opts?: ResolveOptions
): Promise<PageIdentityMatch>;
export function registerPageAlias(pageId: string, alias: PageIdentity): Promise<void>;
```

## Integrating into EyeNote

1. **Frontend:** Replace direct URL-based note lookups with `capturePageIdentity` and attach the resulting identity to API requests. Fall back to fetching new notes only when `comparePageIdentities` fails.
2. **Backend:** Use `resolvePageIdentity` within Fastify handlers to map incoming fingerprints to the canonical `pageId`, then query note collections by that identifier.
3. **Shared types:** Extend `@eye-note/definitions` with the new payload/response contracts (`ListNotesQuery`, `PageIdentityPayload`) so all layers stay type-safe.

## Roadmap

- [ ] Implement DOM tokenization and SimHash utilities.
- [ ] Add per-domain normalization presets and canonical URL readers.
- [ ] Build Fastify plugin for resolving page identities inside request lifecycles.
- [ ] Wire telemetry hooks for low-confidence matches.
- [ ] Provide developer tooling (debug overlay, CLI inspectors) to inspect fingerprints in the wild.

## Development

```bash
pnpm --filter @eye-note/page-identity install
pnpm --filter @eye-note/page-identity build
pnpm --filter @eye-note/page-identity exec tsc --noEmit
```

Ensure changes are reflected in `CHANGELOG.md` under the current date whenever the package evolves.
