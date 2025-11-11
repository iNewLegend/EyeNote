import {
    EYE_NOTE_ROOT_CONTAINER_ID,
    EYE_NOTE_SHADOW_CONTAINER_ID,
    EYE_NOTE_USERLAND_CONTAINER_ID,
    NOTES_PLUGIN_SELECTOR,
} from "@eye-note/definitions";

import { getElementPath, findElementByPath } from "@eye-note/ext/src/utils/element-path";

import type {
    ElementLocationSnapshot,
    SerializedDOMRect,
    ViewportPosition,
} from "@eye-note/definitions";

export interface AnalyzeElementOptions {
    pointerPosition ?: ViewportPosition;
}

const PLUGIN_ROOT_SELECTOR = NOTES_PLUGIN_SELECTOR;
const SHADOW_ROOT_ID = `#${ EYE_NOTE_SHADOW_CONTAINER_ID }`;
const USERLAND_ROOT_ID = `#${ EYE_NOTE_USERLAND_CONTAINER_ID }`;
const ROOT_CONTAINER_ID = EYE_NOTE_ROOT_CONTAINER_ID;

function serializeDOMRect ( rect : DOMRect ) : SerializedDOMRect {
    return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
    };
}

function clampToRange ( value : number, min : number, max : number ) : number {
    if ( Number.isNaN( value ) ) {
        return min;
    }
    if ( !Number.isFinite( value ) ) {
        return value > 0 ? max : min;
    }
    return Math.max( min, Math.min( max, value ) );
}

function shouldIgnoreElement ( element : Element ) : boolean {
    if ( element.id && element.id === ROOT_CONTAINER_ID ) {
        return true;
    }

    return Boolean(
        element.closest( SHADOW_ROOT_ID ) ||
        element.closest( USERLAND_ROOT_ID ) ||
        element.closest( PLUGIN_ROOT_SELECTOR )
    );
}

/**
 * PageAnalyzer builds a lightweight map of the current document so we can
 * reliably identify DOM elements and the exact position a note was created at.
 *
 * The analyzer keeps a cache keyed by both element reference and CSS path.
 * Consumers can ask for an element snapshot directly or trigger a full-page scan.
 */
export class PageAnalyzer {
    private elementCache : WeakMap<Element, ElementLocationSnapshot>;
    private pathCache : Map<string, ElementLocationSnapshot>;

    public constructor () {
        this.elementCache = new WeakMap();
        this.pathCache = new Map();
    }

    /**
     * Scan the current document (or a specific subtree) and refresh the page map.
     */
    public analyzePage ( root ?: ParentNode ) : Map<string, ElementLocationSnapshot> {
        if ( typeof document === "undefined" ) {
            return this.pathCache;
        }

        const scope = root
            ? ( root instanceof Document ? root : root.ownerDocument ?? document )
            : document;
        const elements : Element[] = [];

        this.pathCache.clear();

        if ( scope instanceof Document && scope.documentElement ) {
            elements.push( scope.documentElement );
        }

        if ( root instanceof Element ) {
            elements.push( root );
        }

        elements.push(
            ...Array.from( scope.querySelectorAll( "*" ) )
        );

        for ( const element of elements ) {
            if ( shouldIgnoreElement( element ) ) {
                continue;
            }

            this.captureElementSnapshot( element );
        }

        return this.pathCache;
    }

    /**
     * Build and cache a snapshot for a specific element. Optionally accepts the
     * pointer position to record the exact click location within the element.
     */
    public analyzeElement ( element : Element, options : AnalyzeElementOptions = {} ) : ElementLocationSnapshot {
        if ( shouldIgnoreElement( element ) ) {
            throw new Error( "Cannot analyze EyeNote internal elements." );
        }

        return this.captureElementSnapshot( element, options.pointerPosition );
    }

    /**
     * Retrieve the latest cached snapshot for an element or build one on demand.
     */
    public getSnapshotForElement ( element : Element ) : ElementLocationSnapshot | undefined {
        const cached = this.elementCache.get( element );
        if ( cached ) {
            return cached;
        }

        try {
            return this.analyzeElement( element );
        } catch {
            return undefined;
        }
    }

    /**
     * Retrieve a cached snapshot by path. Consumers can combine this with
     * findElementByPath to rehydrate elements after navigation.
     */
    public getSnapshotByPath ( elementPath : string ) : ElementLocationSnapshot | undefined {
        return this.pathCache.get( elementPath );
    }

    /**
     * Convenience helper to rehydrate an element from a stored snapshot.
     */
    public findElementFromSnapshot ( snapshot : ElementLocationSnapshot ) : Element | null {
        return findElementByPath( snapshot.elementPath );
    }

    private captureElementSnapshot ( element : Element, pointerPosition ?: ViewportPosition ) : ElementLocationSnapshot {
        const rect = element.getBoundingClientRect();
        const viewportPosition = pointerPosition ?? {
            x: rect.left,
            y: rect.top,
        };

        const offsetX = viewportPosition.x - rect.left;
        const offsetY = viewportPosition.y - rect.top;
        const maxOffsetX = rect.width > 0 ? rect.width : 0;
        const maxOffsetY = rect.height > 0 ? rect.height : 0;
        const boundedOffsetX = clampToRange( offsetX, 0, maxOffsetX );
        const boundedOffsetY = clampToRange( offsetY, 0, maxOffsetY );
        const storedOffsetX = clampToRange( boundedOffsetX + 1, 1, Math.max( 1, maxOffsetX ) );
        const storedOffsetY = clampToRange( boundedOffsetY + 1, 1, Math.max( 1, maxOffsetY ) );

        const snapshot : ElementLocationSnapshot = {
            elementPath: getElementPath( element ),
            tagName: element.tagName.toLowerCase(),
            rect: serializeDOMRect( rect ),
            viewportPosition,
            elementOffset: {
                x: storedOffsetX,
                y: storedOffsetY,
            },
            scrollPosition: {
                x: window.scrollX,
                y: window.scrollY,
            },
            timestamp: Date.now(),
        };

        this.elementCache.set( element, snapshot );
        this.pathCache.set( snapshot.elementPath, snapshot );

        return snapshot;
    }
}

let singletonAnalyzer : PageAnalyzer | null = null;

/**
 * Lazily create a singleton analyzer so the extension can share a single page map.
 */
export function getPageAnalyzer () : PageAnalyzer {
    if ( !singletonAnalyzer ) {
        singletonAnalyzer = new PageAnalyzer();
    }
    return singletonAnalyzer;
}
