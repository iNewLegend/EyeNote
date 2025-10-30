# Note Marker Overlay – Functional Specification

## 1. Purpose
Define the authoritative behaviour, data model, and integration guarantees for the EyeNote note-marker overlay. This document is the single source of truth for implementation and QA (Quality Assurance) across the extension, backend, and shared packages.

## 2. Scope
- **In scope**: inspector activation, draft creation, marker rendering, positioning, persistence, rehydration, visual state, and interaction gating.
- **Out of scope**: note content moderation, notification systems, offline storage, and popup/panel UX that does not affect overlay markers.

## 3. Overview
EyeNote renders interactive markers anchored to DOM elements so teams can collaborate in-context on any page. Markers must remain stable through layout shifts and page transitions, must encode group-level visibility, and must degrade gracefully when the underlying DOM changes.

## 3.1 Key Guarantees (Authoritative)
- Storage keying: each note is stored and retrieved under a composite index: `hostname` + `normalizedUrl` + `domTokenization` (layout/content fingerprint). The fingerprint comes from the page-identity module. When the backend resolves aliases to a canonical `pageId`, that `pageId` becomes the primary key and the composite remains as query attributes.
- Element anchoring: every note is anchored to the element it was captured from via `elementPath` plus the cursor offset measured inside that element. Offsets are stored 1-indexed in CSS pixels (top-left == `{ x:1, y:1 }`) so the original click point can be recomposed exactly. Optional anchor hints (stable attributes) may be persisted to improve rehydration.
- Render gating: markers remain hidden until the page-identity handshake completes and the target element is located in the live DOM. No coordinates are surfaced or rendered before both conditions are satisfied.
- Visibility gating: if the target element is not visible (detached, `display:none`, `visibility:hidden`, zero-size, or off-viewport threshold), no marker renders for that note.
- Incremental rehydration: DOM mutations are observed. Only mutated subtrees are re-analyzed; notes whose anchors intersect changed subtrees are rehydrated and re-rendered. Full-page rehydration is the fallback when change volume exceeds thresholds.

## 4. Actors & Surfaces
- **End user**: initiates inspector mode, creates/edits/deletes notes.
- **Browser content page**: hosts the overlay; DOM mutations are untrusted.
- **Overlay subsystems**: Shadow DOM renderer, Userland DOM highlighter, Mode store.
- **Backend API**: persists notes, resolves canonical/normalized URLs, enforces permissions.

## 5. Glossary
- **Marker**: visible affordance positioned near the element a note targets.
- **Draft note**: temporary note created locally prior to backend persistence.
- **Rehydration**: recomputing marker position after DOM/layout changes by resolving the stored element path.
- **Inspector mode**: cursor-driven selection state used to pick target elements; toggled by holding the Shift key.

## 6. Story (System Walkthrough)

### 6.1 Inspector & Draft Capture Pipeline
1. **Mode Gating**  
   - The inspector controller listens for keyboard press and release events.  
   - Preconditions: user session is authenticated and the backend connection is healthy.  
   - Pressing the Shift key enables inspector mode; releasing the key, losing auth, or losing connectivity disables it.
2. **Hit Testing**  
   - While inspector mode is active, the highlighter reacts to pointer movement, queries the underlying page for the element beneath the cursor, and ignores overlay-owned DOM.  
   - The hovered element reference is cached for downstream consumers.
3. **Click Interception**  
   - A capture-phase listener in the overlay consumes the next click.  
   - Guardrails: abort if inspector inactive, no hovered element, user disconnected, or click targets overlay UI (except the interaction blocker).  
   - Captures pointer coordinates, records scroll offsets, then invokes the note-creation orchestration with the hovered element and default active group.
4. **Draft Data Capture**  
   - The notes subsystem captures the selected element reference and computes its positioning metadata (CSS path, bounding rectangle, cursor-relative offsets, viewport position, and scroll snapshot).  
   - Cursor offsets are stored relative to the element’s top-left corner and are incremented by one pixel to keep them positive (top-left == `{ x:1, y:1 }`).  
   - The subsystem also computes the page identity fingerprint (normalized URL, content signature, layout signature, layout tokens, token sample) and records the `hostname`. Optionally, it serializes the element `outerHTML` and a minimal DOM snapshot for audit/remediation.  
   - A draft is inserted with a temporary id, pending-sync flag, local-draft flag, live element reference, captured positioning metadata, and the page-identity block; render is still subject to visibility gating.  
   - Captured notes are always anchored to the selected element; downstream render logic must compute marker placement relative to that element’s geometry.
5. **Mode Transition & Scroll Preservation**  
   - The system transitions into notes mode, clears inspector hover state, and replays stored scroll offsets on the next animation frame to prevent viewport drift.

### 6.2 Rendering Pipeline
1. **Overlay Composition**  
   - The overlay renders with pointer interactions disabled by default.  
   - A runtime flag flips when inspector or notes mode is active, temporarily allowing pointer events on markers.
2. **Marker Placement**  
   - Each marker computes its position from note metadata.  
   - Marker coordinates are always resolved relative to the targeted element by combining the current bounding rectangle with the stored cursor offsets. Adding `{ offset.x - 1, offset.y - 1 }` to the element’s `left/top` yields the precise click point.  
   - If the targeted element cannot be resolved, the marker is withheld from rendering until the element returns.
   - Notes fetched before the `eye-note-page-identity` event or without a resolved anchor remain unrendered; rehydration retries once identity broadcasting and DOM reconciliation complete.
3. **Visual State Management**  
   - Color palette: group color for synced notes, a distinct warning color from the design token set for pending persistence.  
   - Absolute positioning combined with a center translation keeps the marker anchored precisely over the saved point.  
   - Z-index priority ensures markers render above host content but below system UI; dialogs are positioned at the same anchor point to preserve spatial context.

## 9. Data Model & Indexing
- Client draft note: `{ id, elementPath, content, url, groupId?, elementRect, elementOffset, scrollPosition, locationCapturedAt, isLocalDraft, isPendingSync, highlightedElement }` plus `pageIdentity` block and derived `hostname`.
- Persisted record: server-assigned `id`, `createdAt`, `updatedAt`, and the above fields (without `highlightedElement`, `isLocalDraft`, `isPendingSync`).
- Storage indexing (backend): primary key `pageId` when resolved; otherwise composite key `(hostname, normalizedUrl, layoutSignature)`; secondary indexes permit listing by `groupId` and recent activity.
- Element anchoring: `elementPath` + `elementOffset` (1-indexed cursor offsets in CSS pixels) is authoritative; optional `anchorHints` may include `id`, sampled `classList`, selected `data-*` attributes, and a short text hash to improve recovery when nth-of-type shifts.
4. **Marker Interaction**  
   - Clicking a marker toggles the note into editing state, highlights the underlying element, and opens a dialog anchored to the marker coordinates.  
   - The dialog intercepts outside clicks for drafts to avoid accidental dismissal.

### 6.3 Persistence & Hydration Pipeline
1. **Optimistic Synchronisation**  
   - Draft updates assemble a payload containing the latest content, group assignment, canonical and normalized URLs, captured DOM geometry, serialized element HTML, and the full page HTML snapshot.  
   - Backend returns the canonical note record; the temp draft is replaced while preserving the DOM reference.
2. **Server Loading**  
   - The lifecycle controller fetches notes whenever page identity, URL, or active groups change.  
   - Responses hydrate the notes store after mapping records to client shape.
3. **Rehydration**  
   - After loading and on scroll or resize, notes are rehydrated by rebuilding the analyzer cache and recomputing each note’s coordinates.  
   - Missing elements clear the stored live reference and purge stored coordinates so markers stay hidden until the anchor reappears.  
   - Existing elements receive refreshed offsets and coordinates derived from the latest DOM geometry.
4. **Fallback Behaviour**  
   - If selector resolution fails or the target element no longer exists in the current DOM, the marker is not rendered. The note remains accessible through list views but stays hidden until the element reappears or the user applies a remediation flow.  
   - Deletion or group-filter changes remove the note from state, causing the marker to disappear on next render.

### 6.4 Operational Safeguards
1. Overlay remains non-interactive unless inspector/notes modes are active, preventing interference with the host page.  
2. Scroll restoration is deferred to the next animation frame to eliminate layout jitter.  
3. Group membership governs visibility; markers render only when the viewer belongs to one of the note’s associated groups.  
4. Markers render only when the target element exists in the current DOM; missing elements suppress marker display until rehydration succeeds.  
5. Markers in pending-sync state disable destructive actions until the backend confirms persistence.

## 7. Functional Requirements
- **FR-1** Inspector mode is only enterable when the backend health check marks the extension as connected and the user session is valid.
- **FR-2** Clicking a highlighted element must synchronously emit a draft marker with accurate positioning.
- **FR-3** Marker visuals must encode note state (pending vs. synced) and group identity.
- **FR-4** Marker coordinates and dialogs must remain stable across scroll, resize, zoom, and SPA route transitions.
- **FR-5** Each note capture must persist the targeted element’s outer HTML and the full page HTML snapshot alongside positioning metadata.
- **FR-6** Notes outside the active group filter must be hidden and should not participate in rehydration computations.
- **FR-7** Markers must render only when the viewer is a member of the note’s group (or the note is ungrouped and authored by the viewer).
- **FR-8** Markers must render only when the targeted element currently exists in the DOM; otherwise the note remains hidden from the overlay but available in list views.
- **FR-9** Deleting a note removes the marker immediately; failed deletes roll back to the previous state.

## 8. Non-Functional Requirements
- **NFR-1** Marker recalculation must complete within 16 ms under typical scroll/resize events to preserve 60 fps.  
- **NFR-2** Overlay must not leak CSS into the host page (achieved via Shadow DOM scoping).  
- **NFR-3** Memory footprint per note should remain minimal; element caches should rely on weak references.  
- **NFR-4** Overlay must remain accessible: dialog focus traps, keyboard dismissal, and color contrast meeting WCAG AA.

## 9. Data Persistence & Relationships

### 9.1 Client Runtime State
- **Note registry**: holds every note currently relevant to the active page, including unsaved drafts, server-synced records, loading status, and error state. Each entry keeps the live DOM reference (when available) so markers can follow layout changes without querying the document repeatedly.
- **Page analyzer cache**: stores per-element snapshots—CSS selector path, bounding rectangle, viewport click coordinates, scroll offset, and capture timestamp. These snapshots are keyed both by element reference and selector to enable rehydration after navigation or DOM mutations.
- **Mode registry**: tracks overlay operating modes (inspector, notes, connected, debug) as bit flags. This registry gates pointer handling, marker interactivity, and scroll preservation.

### 9.2 Persisted Note Record
When a draft transitions to a stored note, the payload sent to the backend includes:
- **Identifiers**: globally unique note id, author id, group id (nullable), and optionally a resolved page id.
- **Grouping & visibility**: group id or null (public to the author only until shared), and the workspace or team context inferred from authentication.
- **Page linkage**: raw URL, canonical URL, normalized URL, and page identity fingerprint so the backend can associate the note with equivalent pages.
- **Element targeting**: CSS selector path, element rectangle (top/right/bottom/left/width/height), 1-indexed cursor offsets within the element (top-left == `{ x:1, y:1 }`), and the scroll position at capture time.
- **DOM snapshots**: serialized outer HTML of the targeted element and serialized HTML of the entire document at capture time. These snapshots are used for auditing, offline inspection, and potential remediation when the original element disappears.
- **Content**: note body, optional metadata such as reactions or attachments (reserved for future use).
- **Timestamps**: creation, last update, and `locationCapturedAt` (epoch milliseconds corresponding to the analyzer snapshot).
The backend stores this record and returns the authoritative representation, preserving all targeting data so that future sessions can reconstruct the marker position precisely. Local-only fields—such as the live DOM reference and pending-sync flags—are not persisted.

### 9.3 Relationships & Retrieval
- Notes are associated with **groups**; activating or deactivating a group filters the client note registry before any markers render. If no groups are active, the overlay defaults to notes authored by the current user.
- Notes link to **page identities** that encapsulate canonical URLs, normalized URLs, and hashed content signals. This allows the system to show the same marker on variant URLs that represent the same document.
- Each note may maintain a **live element reference** while the corresponding DOM node exists. If the node disappears, the system hides the marker and relies on the stored selector path, coordinates, and DOM snapshots to determine whether the element can be restored on future page loads.
- Deleting a note removes it from both the backend store and the client registry; failure cases roll back to the last confirmed dataset to keep client and server consistent.

## 10. UX Requirements
- Overlay must avoid obstructing host interactions when inactive.  
- Marker dialog positions must match marker anchors to preserve spatial context.  
- Group metadata (color, name) displayed inline for quick recognition.  
- Prevent unintentional navigation during inspector mode by freezing scroll and consuming clicks.
- Do not render markers for non-visible anchors; re-verify visibility before opening dialogs.

## 11. Technical Considerations
- Shadow DOM split (overlay renderer vs. highlighter) isolates styling from the host page.  
- Scroll restoration should rely on the next animation frame to avoid layout thrash; avoid synchronous scroll jumps.  
- CSS selectors may degrade on dynamic DOM; consider augmenting with data attributes where available.  
- Mutation observer integration is a candidate enhancement for high-change pages.

### 11.1 DOM Change Detection & Incremental Rehydration (Required)
- A single MutationObserver watches `document` for childList/attributes/subtree changes.
- Mutations are batched (16–32ms); changed nodes are compacted to a minimal set of distinct subtrees.
- The PageAnalyzer re-analyzes only affected subtrees, refreshing snapshots for elements within.
- Notes mapped to mutated subtrees are rehydrated; a circuit breaker escalates to full-page rehydration when cost exceeds thresholds.

### 11.2 Visibility Rules (Required)
An element is considered visible when all are true:
- Connected to `document` and not within EyeNote-owned DOM containers.
- Computed style: `display` not `none`, `visibility` not `hidden`/`collapse`, `opacity` > 0.
- Bounding client rect width/height > 0.
- Intersects the viewport by at least 1px (configurable threshold).

### 11.3 Marker Virtualization (Recommended)
- Use an IntersectionObserver around the shadow host to suspend offscreen markers.
- Render dialog portals only for markers within viewport ± buffer.

## 12. Edge Cases
- Elements with zero height/width: clamp cursor offsets to `{ x:1, y:1 }` and fallback to positioning at the element’s origin point.  
- Detached DOM nodes: hide the marker until the element reappears; maintain stored selector, coordinates, and DOM snapshots for remediation.  
- Rapid successive clicks: inspector listener must ignore input while a note dialog is being dismissed.  
- Mixed zoom levels: rely on the browser’s layout metrics to maintain visual accuracy.
- Host/page aliasing: if `normalizedUrl` matches but `layoutSignature` changes, consult backend identity resolution; suppress markers until reconciliation completes to avoid drift.

## 13. Open Questions
- Should we debounce or throttle the rehydration routine during rapid scroll sequences to reduce computation load?  
- Do we persist alternative selectors (e.g., data-test attributes) for heavily dynamic applications?  
- What collision policy should apply when multiple markers anchor to the same coordinates?
- Should we persist an element-level fingerprint (e.g., tagName + stable attributes + sibling rank) alongside `elementPath` to improve recovery when selectors drift?

## 14. Risks & Mitigations
- **DOM mutations invalidate selectors** → Evaluate adding Mutation Observer triggers and heuristics in the page analyzer service.  
- **High marker density degrades performance** → Profile marker render, consider virtualization/lazy hydration.  
- **Inspector misuse while offline** → Mode gating already blocks; add explicit toast to guide users.

## 15. Extension Refactor Plan (Implementation Notes)
This plan maps the spec to `apps/ext` and sequences the work.

- Phase A — Visibility & filtering
  - Add `isElementVisible(el)` utility; filter markers by visibility; update `rehydrateNotePosition` to null `highlightedElement` when invisible.
  - Result: satisfies “no marker when not visible” without API changes.

- Phase B — DOM mutations → incremental rehydration
  - Add shared `useDomMutations()` with a `MutationObserver` that batches and compacts roots; call `getPageAnalyzer().analyzePage(subtree)`; rehydrate only affected notes; add circuit breaker to full rehydrate.

- Phase C — Identity & indexing
  - Include `hostname` in create/list payloads; ensure backend indexes `(hostname, normalizedUrl, layoutSignature)` and returns `pageId` when available.
  - Keep `packages/page-identity` as the fingerprint source; continue SPA URL tracking with `useUrlListener` + `usePageIdentity`.

- Phase D — Anchor hints & recovery
  - Persist `anchorHints` for robust rehydration when selectors drift; extend rehydration to try hints before giving up.

- Phase E — Virtualization & polish
  - Add marker IntersectionObserver and dialog portal gating; smooth scroll restoration via rAF; profile and adjust thresholds.
