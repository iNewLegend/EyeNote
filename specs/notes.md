# Note Marker Overlay – Functional Specification

## 1. Purpose
Define the authoritative behaviour, data model, and integration guarantees for the EyeNote note-marker overlay. This document is the single source of truth for implementation and QA across the extension, backend, and shared packages.

## 2. Scope
- **In scope**: inspector activation, draft creation, marker rendering, positioning, persistence, rehydration, visual state, and interaction gating.
- **Out of scope**: note content moderation, notification systems, offline storage, and popup/panel UX that does not affect overlay markers.

## 3. Overview
EyeNote renders interactive markers anchored to DOM elements so teams can collaborate in-context on any page. Markers must remain stable through layout shifts and page transitions, must encode group-level visibility, and must degrade gracefully when the underlying DOM changes.

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

### 6.1 Inspector & Draft Creation Pipeline
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
4. **Draft Instantiation**  
   - The notes domain creates a draft using the currently hovered element and pointer position.  
   - The page analyzer produces a CSS path, element rectangle, raw offsets, normalized offset ratios, viewport position, and scroll snapshot.  
   - A draft is inserted with a temporary id, pending-sync flag, local-draft flag, and a live element reference.
5. **Mode Transition & Scroll Preservation**  
   - The system transitions into notes mode, clears inspector hover state, and replays stored scroll offsets on the next animation frame to prevent viewport drift.

### 6.2 Rendering Pipeline
1. **Overlay Composition**  
   - The overlay renders with pointer interactions disabled by default.  
   - A runtime flag flips when inspector or notes mode is active, temporarily allowing pointer events on markers.
2. **Marker Placement**  
   - Each marker computes its position from note metadata.  
   - When a live element reference exists, the system reads the current bounding rectangle and stored offset ratio; otherwise it falls back to the stored viewport coordinates. Values are clamped to element bounds to keep the marker visible.
3. **Visual State Management**  
   - Color palette: group color for synced notes, a distinct warning color from the design token set for pending persistence.  
   - Absolute positioning combined with a center translation keeps the marker anchored precisely over the saved point.  
   - Z-index priority ensures markers render above host content.
4. **Marker Interaction**  
   - Clicking a marker toggles the note into editing state, highlights the underlying element, and opens a dialog anchored to the marker coordinates.  
   - The dialog intercepts outside clicks for drafts to avoid accidental dismissal.

### 6.3 Persistence & Hydration Pipeline
1. **Optimistic Synchronisation**  
   - Draft updates assemble a payload containing the latest content, group assignment, canonical and normalized URLs, and captured DOM geometry.  
   - Backend returns the canonical note record; the temp draft is replaced while preserving the DOM reference.
2. **Server Loading**  
   - The lifecycle controller fetches notes whenever page identity, URL, or active groups change.  
   - Responses hydrate the notes store after mapping records to client shape.
3. **Rehydration**  
   - After loading and on scroll or resize, notes are rehydrated by rebuilding the analyzer cache and recomputing each note’s coordinates.  
   - Missing elements clear the stored live reference; existing elements receive refreshed coordinates.
4. **Fallback Behaviour**  
   - If selector resolution fails, the marker persists at the last known viewport position to preserve context until the note is edited or deleted.  
   - Deletion or group-filter changes remove the note from state, causing the marker to disappear on next render.

### 6.4 Operational Safeguards
1. Overlay remains non-interactive unless inspector/notes modes are active, preventing interference with the host page.  
2. Scroll restoration is deferred to the next animation frame to eliminate layout jitter.  
3. Group filters are source of truth; changing the active group list purges stale notes prior to refetch.  
4. Markers in pending-sync state disable destructive actions until the backend confirms persistence.

## 7. Functional Requirements
- **FR-1** Inspector mode is only enterable when the backend health check marks the extension as connected and the user session is valid.
- **FR-2** Clicking a highlighted element must synchronously emit a draft marker with accurate positioning.
- **FR-3** Marker visuals must encode note state (pending vs. synced) and group identity.
- **FR-4** Marker coordinates and dialogs must remain stable across scroll, resize, zoom, and SPA route transitions.
- **FR-5** Notes outside the active group filter must be hidden and should not participate in rehydration computations.
- **FR-6** Deleting a note removes the marker immediately; failed deletes roll back to the previous state.

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
- **Element targeting**: CSS selector path, element rectangle (top/right/bottom/left/width/height), absolute click offsets within the element, normalized offset ratios (0–1 in both axes), and the scroll position at capture time.
- **Content**: note body, optional metadata such as reactions or attachments (reserved for future use).
- **Timestamps**: creation, last update, and `locationCapturedAt` (epoch milliseconds corresponding to the analyzer snapshot).
The backend stores this record and returns the authoritative representation, preserving all targeting data so that future sessions can reconstruct the marker position precisely. Local-only fields—such as the live DOM reference and pending-sync flags—are not persisted.

### 9.3 Relationships & Retrieval
- Notes are associated with **groups**; activating or deactivating a group filters the client note registry before any markers render. If no groups are active, the overlay defaults to notes authored by the current user.
- Notes link to **page identities** that encapsulate canonical URLs, normalized URLs, and hashed content signals. This allows the system to show the same marker on variant URLs that represent the same document.
- Each note may maintain a **live element reference** while the corresponding DOM node exists. If the node disappears, the system falls back to the stored selector path and recorded coordinates until a new node resolves that selector.
- Deleting a note removes it from both the backend store and the client registry; failure cases roll back to the last confirmed dataset to keep client and server consistent.

## 10. UX Requirements
- Overlay must avoid obstructing host interactions when inactive.  
- Marker dialog positions must match marker anchors to preserve spatial context.  
- Group metadata (color, name) displayed inline for quick recognition.  
- Prevent unintentional navigation during inspector mode by freezing scroll and consuming clicks.

## 11. Technical Considerations
- Shadow DOM split (overlay renderer vs. highlighter) isolates styling from the host page.  
- Scroll restoration should rely on the next animation frame to avoid layout thrash; avoid synchronous scroll jumps.  
- CSS selectors may degrade on dynamic DOM; consider augmenting with data attributes where available.  
- Mutation observer integration is a candidate enhancement for high-change pages.

## 12. Edge Cases
- Elements with zero height/width: normalize relative offsets into the 0–1 range and fallback to positioning at the element’s origin point.  
- Detached DOM nodes: retain the last known viewport coordinates while clearing any live element reference.  
- Rapid successive clicks: inspector listener must ignore input while a note dialog is being dismissed.  
- Mixed zoom levels: rely on the browser’s layout metrics to maintain visual accuracy.

## 13. Open Questions
- Should we debounce or throttle the rehydration routine during rapid scroll sequences to reduce computation load?  
- Do we persist alternative selectors (e.g., data-test attributes) for heavily dynamic applications?  
- What collision policy should apply when multiple markers anchor to the same coordinates?

## 14. Risks & Mitigations
- **DOM mutations invalidate selectors** → Evaluate adding Mutation Observer triggers and heuristics in the page analyzer service.  
- **High marker density degrades performance** → Profile marker render, consider virtualization/lazy hydration.  
- **Inspector misuse while offline** → Mode gating already blocks; add explicit toast to guide users.

