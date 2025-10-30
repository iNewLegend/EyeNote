import type {
    CreateNotePayload,
    NoteRecord,
    PageIdentityPayload,
    UpdateNotePayload,
    ViewportPosition,
    Vector2D,
} from "@eye-note/definitions";
import type { Note } from "../../types";
import { getPageAnalyzer } from "../../lib/page-analyzer";
import { isElementVisible } from "../../utils/is-element-visible";
import { ANCHOR_HINTS_DATA_ATTR_WHITELIST } from "@eye-note/definitions";

const draftIdPrefix = "temp";

/**
 * Small, fast string hash (djb2) used to hint at text identity for anchor
 * recovery without storing full innerText.
 */
function djb2 ( str : string ) : string {
    let hash = 5381;
    for ( let i = 0; i < str.length; i++ ) {
        hash = ( ( hash << 5 ) + hash ) + str.charCodeAt( i ); // hash * 33 + c
        hash |= 0;
    }
    return ( hash >>> 0 ).toString( 36 );
}

/**
 * Builds lightweight anchor hints (id, a small class sample, whitelisted
 * data-* attributes, and a short text hash) to improve selector recovery
 * when nth-of-type or attributes shift.
 */
function buildAnchorHints ( element : Element ) {
    const el = element as HTMLElement;
    const dataAttrs : Record<string, string> = {};
    for ( const name of ANCHOR_HINTS_DATA_ATTR_WHITELIST ) {
        const v = el.getAttribute( name );
        if ( v ) dataAttrs[ name ] = v;
    }
    const classListSample = Array.from( el.classList || [] ).slice( 0, 3 );
    const text = ( el.innerText || "" ).trim().slice( 0, 200 );
    const textHash = text ? djb2( text ) : undefined;
    return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classListSample: classListSample.length ? classListSample : undefined,
        dataAttrs: Object.keys( dataAttrs ).length ? dataAttrs : undefined,
        textHash,
    };
}

/**
 * Generates a stable temporary id for local drafts.
 * Uses `crypto.randomUUID` when available; falls back to a timestamp+random
 * suffix. All temp ids are prefixed with `temp-` for easy detection.
 */
export function createTempId () : string {
    if ( typeof crypto !== "undefined" && "randomUUID" in crypto ) {
        return `${ draftIdPrefix }-${ crypto.randomUUID() }`;
    }
    return `${ draftIdPrefix }-${ Date.now() }-${ Math.random().toString( 16 ).slice( 2 ) }`;
}

/**
 * Normalizes a persisted NoteRecord into a UI Note shape, applying optional
 * runtime overrides (e.g., restoring a highlightedElement reference).
 */
export function mapRecordToNote ( record : NoteRecord, overrides : Partial<Note> = {} ) : Note {
    return {
        ...record,
        isEditing: false,
        isPendingSync: false,
        isLocalDraft: false,
        highlightedElement: null,
        ...overrides,
    };
}

/**
 * Creates a local draft Note from a user-selected DOM element.
 * Captures element path, geometry, cursor offsets, scroll position, and
 * page/time metadata. The draft is marked as editing + pending sync.
 */
export function createDraftFromElement (
    element : Element,
    pointerPosition ?: ViewportPosition,
    initialGroupId ?: string | null
) : Note {
    const rect = element.getBoundingClientRect();
    const pointer : ViewportPosition = pointerPosition ?? {
        x: rect.right,
        y: rect.top,
    };

    const analyzer = getPageAnalyzer();
    const snapshot = analyzer.analyzeElement( element, { pointerPosition: pointer } );
    const timestamp = new Date().toISOString();

    return {
        id: createTempId(),
        elementPath: snapshot.elementPath,
        content: "",
        url: window.location.href,
        hostname: window.location.hostname,
        anchorHints: buildAnchorHints( element ),
        groupId: initialGroupId ?? undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        elementRect: snapshot.rect,
        elementOffset: snapshot.elementOffset,
        scrollPosition: snapshot.scrollPosition,
        locationCapturedAt: snapshot.timestamp,
        isEditing: true,
        highlightedElement: element,
        isPendingSync: true,
        isLocalDraft: true,
    };
}

/**
 * Wraps `document.querySelector` with try/catch to avoid selector syntax
 * exceptions from breaking the rehydration pipeline.
 */
function safeFindElement ( selector : string ) : HTMLElement | null {
    try {
        return document.querySelector( selector ) as HTMLElement | null;
    } catch {
        return null;
    }
}

/**
 * Attempts to recover an element using stored anchor hints when the original
 * CSS path no longer matches: prefers id, then whitelisted data-* attributes,
 * then tag+class combo, and finally a capped text-hash scan.
 */
function findElementByHints ( note : Note ) : HTMLElement | null {
    const hints = note.anchorHints;
    if ( !hints ) return null;

    // 1) id selector
    if ( hints.id ) {
        const byId = document.getElementById( hints.id );
        if ( byId ) return byId;
    }

    const candidates : string[] = [];

    // 2) data-* attributes
    if ( hints.dataAttrs ) {
        const entries = Object.entries( hints.dataAttrs );
        for ( const [ k, v ] of entries ) {
            if ( v ) {
                candidates.push( `${ hints.tagName || "*" }[${ k }="${ CSS.escape( v ) }"]` );
            }
        }
    }

    // 3) tag + classes
    if ( hints.classListSample && hints.classListSample.length ) {
        const classSel = hints.classListSample.map( ( c ) => `.${ CSS.escape( c ) }` ).join( "" );
        candidates.push( `${ hints.tagName || "*" }${ classSel }` );
    }

    for ( const sel of candidates ) {
        try {
            const el = document.querySelector( sel ) as HTMLElement | null;
            if ( el ) return el;
        } catch { /* ignore */ }
    }

    // 4) fallback by text hash (linear scan, last resort, capped)
    if ( hints.textHash ) {
        const all = Array.from( document.querySelectorAll( hints.tagName || "*" ) ) as HTMLElement[];
        const cap = Math.min( all.length, 500 );
        for ( let i = 0; i < cap; i++ ) {
            const el = all[ i ];
            const text = ( el.innerText || "" ).trim().slice( 0, 200 );
            if ( text && djb2( text ) === hints.textHash ) {
                return el;
            }
        }
    }

    return null;
}

const MIN_OFFSET_VALUE = 1;

function clampOffsetValue ( value : number, max ?: number ) : number {
    if ( Number.isNaN( value ) || !Number.isFinite( value ) ) {
        return MIN_OFFSET_VALUE;
    }
    if ( max === undefined || max <= 0 ) {
        return Math.max( MIN_OFFSET_VALUE, value );
    }
    return Math.max( MIN_OFFSET_VALUE, Math.min( max, value ) );
}

function resolveElementOffset (
    note : Note,
    rect ?: DOMRect | null
) : Vector2D {
    const bounds = rect
        ? { width: rect.width, height: rect.height }
        : note.elementRect
            ? { width: note.elementRect.width, height: note.elementRect.height }
            : undefined;

    if ( note.elementOffset ) {
        return {
            x: clampOffsetValue( note.elementOffset.x, bounds?.width ),
            y: clampOffsetValue( note.elementOffset.y, bounds?.height ),
        };
    }

    if ( bounds ) {
        return {
            x: clampOffsetValue( ( bounds.width / 2 ) + MIN_OFFSET_VALUE, bounds.width ),
            y: clampOffsetValue( ( bounds.height / 2 ) + MIN_OFFSET_VALUE, bounds.height ),
        };
    }

    return { x: MIN_OFFSET_VALUE, y: MIN_OFFSET_VALUE };
}

/**
 * Computes the on-screen marker position by combining the current element
 * bounding rect with stored cursor offsets. Returns null when the element
 * cannot be resolved or is not visible.
 */
export function calculateMarkerPosition ( note : Note ) : Vector2D | null {
    const element = note.highlightedElement || safeFindElement( note.elementPath );

    if ( !element || !isElementVisible( element ) ) {
        return null;
    }

    const rect = element.getBoundingClientRect();
    const offset = resolveElementOffset( note, rect );

    return {
        x: rect.left + offset.x - MIN_OFFSET_VALUE,
        y: rect.top + offset.y - MIN_OFFSET_VALUE,
    };
}

/**
 * Recomputes a note's screen position and live element reference. Uses the
 * CSS path first, then anchor hints for recovery. If the element is missing or
 * not visible, clears the live reference and clears stored coordinates so the
 * marker stays hidden until the anchor reappears.
 */
export function rehydrateNotePosition ( note : Note ) : Note {
    let element = safeFindElement( note.elementPath );
    if ( !element ) {
        element = findElementByHints( note );
    }

    // Treat missing or invisible elements the same: drop the live reference
    if ( !element || !isElementVisible( element ) ) {
        if ( note.highlightedElement ) {
            return {
                ...note,
                highlightedElement: null,
            };
        }
        return note;
    }

    const rect = element.getBoundingClientRect();
    const offset = resolveElementOffset( note, rect );
    return {
        ...note,
        elementOffset: offset,
        highlightedElement: element,
    };
}

/**
 * Builds a CreateNotePayload from a local draft, applying any inline updates
 * and caller-provided context (pageId/identity). Ensures hostname + anchor
 * hints are included for robust recovery and indexing.
 */
export function createPayloadFromDraft (
    draft : Note,
    updates : UpdateNotePayload,
    context : {
        pageId ?: string;
        pageIdentity ?: PageIdentityPayload;
    } = {}
) : CreateNotePayload {
    const resolvedGroupId = updates.groupId !== undefined ? updates.groupId : draft.groupId;
    const resolvedPageIdentity = updates.pageIdentity ?? context.pageIdentity;
    const resolvedPageId = updates.pageId ?? context.pageId ?? draft.pageId ?? undefined;
    const resolvedCanonicalUrl =
        updates.canonicalUrl ??
        resolvedPageIdentity?.canonicalUrl ??
        draft.canonicalUrl ??
        undefined;
    const resolvedNormalizedUrl =
        updates.normalizedUrl ??
        resolvedPageIdentity?.normalizedUrl ??
        draft.normalizedUrl ??
        undefined;

    const payload : CreateNotePayload = {
        elementPath: draft.elementPath,
        content: updates.content ?? draft.content ?? "",
        url: draft.url,
        hostname: draft.hostname ?? window.location.hostname,
        anchorHints: draft.anchorHints,
        groupId: resolvedGroupId,
        elementRect: draft.elementRect,
        elementOffset: draft.elementOffset,
        scrollPosition: draft.scrollPosition,
        locationCapturedAt: draft.locationCapturedAt,
        pageIdentity: resolvedPageIdentity,
    };

    if ( resolvedPageId ) {
        payload.pageId = resolvedPageId;
    }

    if ( resolvedCanonicalUrl ) {
        payload.canonicalUrl = resolvedCanonicalUrl;
    }

    if ( resolvedNormalizedUrl ) {
        payload.normalizedUrl = resolvedNormalizedUrl;
    }

    return payload;
}
