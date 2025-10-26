import type {
    CreateNotePayload,
    NoteRecord,
    PageIdentityPayload,
    UpdateNotePayload,
    ViewportPosition,
} from "@eye-note/definitions";
import type { Note } from "../../types";
import { getPageAnalyzer } from "../../lib/page-analyzer";

const draftIdPrefix = "temp";

export function createTempId () : string {
    if ( typeof crypto !== "undefined" && "randomUUID" in crypto ) {
        return `${ draftIdPrefix }-${ crypto.randomUUID() }`;
    }
    return `${ draftIdPrefix }-${ Date.now() }-${ Math.random().toString( 16 ).slice( 2 ) }`;
}

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
        groupId: initialGroupId ?? undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        x: snapshot.viewportPosition.x,
        y: snapshot.viewportPosition.y,
        elementRect: snapshot.rect,
        elementOffset: snapshot.elementOffset,
        elementOffsetRatio: snapshot.elementOffsetRatio,
        scrollPosition: snapshot.scrollPosition,
        locationCapturedAt: snapshot.timestamp,
        isEditing: true,
        highlightedElement: element,
        isPendingSync: true,
        isLocalDraft: true,
    };
}

function clamp ( value : number ) : number {
    if ( Number.isNaN( value ) ) {
        return 0;
    }
    return Math.max( 0, Math.min( 1, value ) );
}

function safeFindElement ( selector : string ) : HTMLElement | null {
    try {
        return document.querySelector( selector ) as HTMLElement | null;
    } catch {
        return null;
    }
}

export function resolveOffsetRatio ( note : Note ) {
    if ( note.elementOffsetRatio ) {
        return note.elementOffsetRatio;
    }

    if ( note.elementOffset && note.elementRect && note.elementRect.width && note.elementRect.height ) {
        return {
            x: clamp( note.elementOffset.x / note.elementRect.width ),
            y: clamp( note.elementOffset.y / note.elementRect.height ),
        };
    }

    return { x: 0, y: 0 };
}

export function calculateMarkerPosition ( note : Note ) : { x : number; y : number } {
    const element = note.highlightedElement || safeFindElement( note.elementPath );

    if ( !element ) {
        return {
            x: note.x ?? 0,
            y: note.y ?? 0,
        };
    }

    const rect = element.getBoundingClientRect();
    const ratio = resolveOffsetRatio( note );

    const markerX = rect.left + rect.width * clamp( ratio.x );
    const markerY = rect.top + rect.height * clamp( ratio.y );

    const markerSize = 12;
    const halfMarker = markerSize / 2;

    const constrainedX = Math.max( 
        rect.left + halfMarker, 
        Math.min( rect.right - halfMarker, markerX ) 
    );
    const constrainedY = Math.max( 
        rect.top + halfMarker, 
        Math.min( rect.bottom - halfMarker, markerY ) 
    );

    return { x: constrainedX, y: constrainedY };
}

export function rehydrateNotePosition ( note : Note ) : Note {
    const element = safeFindElement( note.elementPath );

    if ( !element ) {
        if ( note.highlightedElement ) {
            return { ...note, highlightedElement: null };
        }
        return note;
    }

    const rect = element.getBoundingClientRect();
    const ratio = resolveOffsetRatio( note );
    const computedX = rect.left + rect.width * clamp( ratio.x );
    const computedY = rect.top + rect.height * clamp( ratio.y );

    const shouldUpdatePosition =
        Math.abs( ( note.x ?? 0 ) - computedX ) > 0.5 ||
        Math.abs( ( note.y ?? 0 ) - computedY ) > 0.5;

    if ( !shouldUpdatePosition && note.highlightedElement === element ) {
        return note;
    }

    return {
        ...note,
        x: computedX,
        y: computedY,
        highlightedElement: element,
    };
}

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
        groupId: resolvedGroupId,
        x: draft.x,
        y: draft.y,
        elementRect: draft.elementRect,
        elementOffset: draft.elementOffset,
        elementOffsetRatio: draft.elementOffsetRatio,
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
