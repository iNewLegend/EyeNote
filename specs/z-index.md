# Z-index layering

All stacking contexts for the overlay, popup, and shared UI primitives pull from `packages/ui/src/lib/z-index-tokens.json`. The file stores both the numeric value and a description so the intent behind every layer stays visible in code reviews.

| Token | Value | Purpose |
| --- | --- | --- |
| `globalToastViewport` | 100 | Default Radix/Sonner toast viewport for dashboard and popup surfaces so they stay below fullscreen overlays. |
| `shadowOverlayHost` | 2147483644 | Fixed container injected into inspected pages; everything else in the overlay mounts inside this root. |
| `highlightOverlay` | 2147483645 | Non-interactive highlight rectangles and guides that must sit above the page DOM but below actionable UI. |
| `cursor` | 2147483645 | Custom cursor indicator that mirrors highlight depth. |
| `noteMarker` | 2147483646 | Marker buttons rendered over highlights so they can capture clicks. |
| `interactionShield` | 2147483646 | Full-screen blocker that prevents stray clicks while inspector modes are active. |
| `panel` | 2147483646 | Side panels and sheets anchored to the edge of the viewport. |
| `dialogOverlay` | 2147483647 | Scrims for modal states; always the highest layer. |
| `dialogContent` | 2147483647 | Modal content, including note sheets, that should never be obscured. |
| `shadowToastViewport` | 2147483646 | Toast viewport rendered inside the overlay’s shadow root so toasts align with other interactive UI. |

Use `Z_INDEX` (and `Z_INDEX_META` when you need human-readable metadata) from `@eye-note/ui` instead of hard-coding values. Tailwind utilities (`z-plugin-container`, `z-toast`, etc.) are also generated from the same JSON so CSS helpers stay consistent.
