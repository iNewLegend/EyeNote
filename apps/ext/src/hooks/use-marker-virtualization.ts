import { useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "../types";
import { isElementInsidePlugin } from "../utils/is-element-visible";
import { MARKER_IO_ROOT_MARGIN, MARKER_IO_THRESHOLD, MARKER_ELEMENT_ID_DATA_ATTR } from "@eye-note/definitions";

type Options = {
    rootMargin ?: string;
};

/**
 * useMarkerVirtualization
 *
 * Observes note-anchored elements via IntersectionObserver and returns a Set
 * of visible note ids. The overlay uses this to only render markers/dialogs
 * near the viewport, improving performance on long documents.
 *
 * - Skips EyeNote-owned DOM (shadow/userland containers).
 * - Uses MARKER_IO_ROOT_MARGIN as the default prefetch buffer.
 * - Associates elements to note ids via MARKER_ELEMENT_ID_DATA_ATTR.
 */
export function useMarkerVirtualization ( notes : Note[], options : Options = {} ) : Set<string> | undefined {
    const [ visibleIds, setVisibleIds ] = useState<Set<string>>();
    const observerRef = useRef<IntersectionObserver>();
    const elementsMap = useMemo( () => {
        const map = new Map<string, Element>();
        for ( const n of notes ) {
            const el = n.highlightedElement;
            if ( el && !isElementInsidePlugin( el ) ) {
                map.set( n.id, el );
            }
        }
        return map;
    }, [ notes ] );

    useEffect( () => {
        if ( typeof IntersectionObserver === "undefined" ) {
            setVisibleIds( undefined );
            return;
        }

        const nextVisible = new Set<string>();
        const observer = new IntersectionObserver( ( entries ) => {
            let changed = false;
            for ( const entry of entries ) {
                const id = ( entry.target as HTMLElement ).getAttribute( MARKER_ELEMENT_ID_DATA_ATTR );
                if ( !id ) continue;
                if ( entry.isIntersecting ) {
                    if ( !nextVisible.has( id ) ) { nextVisible.add( id ); changed = true; }
                } else if ( nextVisible.delete( id ) ) {
                    changed = true;
                }
            }
            if ( changed ) {
                setVisibleIds( new Set( nextVisible ) );
            }
        }, {
            root: null,
            rootMargin: options.rootMargin ?? MARKER_IO_ROOT_MARGIN,
            threshold: MARKER_IO_THRESHOLD,
        } );

        observerRef.current = observer;

        // Observe all current elements
        elementsMap.forEach( ( el, id ) => {
            try {
                ( el as HTMLElement ).setAttribute( MARKER_ELEMENT_ID_DATA_ATTR, id );
                observer.observe( el );
            } catch { /* ignore */ }
        } );

        // Initial snapshot: assume currently intersecting elements are visible
        // (Observer will update promptly afterwards.)
        setVisibleIds( new Set( Array.from( elementsMap.keys() ) ) );

        return () => {
            try { observer.disconnect(); } catch { /* ignore */ }
            observerRef.current = undefined;
        };
    }, [ elementsMap, options.rootMargin ] );

    return visibleIds;
}
