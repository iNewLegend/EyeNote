import { useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "../types";
import { isElementInsidePlugin } from "../utils/is-element-visible";
import { MARKER_IO_ROOT_MARGIN, MARKER_IO_THRESHOLD } from "@eye-note/definitions";

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
 * - Associates each observed element to all of its note ids so IntersectionObserver updates every note sharing the anchor.
 */
export function useMarkerVirtualization ( notes : Note[], options : Options = {} ) : Set<string> | undefined {
    const [ visibleIds, setVisibleIds ] = useState<Set<string>>();
    const observerRef = useRef<IntersectionObserver>();
    const elementToIds = useMemo( () => {
        const map = new Map<Element, string[]>();
        for ( const note of notes ) {
            const el = note.highlightedElement;
            if ( !el || isElementInsidePlugin( el ) ) {
                continue;
            }
            const existing = map.get( el );
            if ( existing ) {
                existing.push( note.id );
            } else {
                map.set( el, [ note.id ] );
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
                const ids = elementToIds.get( entry.target as Element );
                if ( !ids || ids.length === 0 ) continue;
                if ( entry.isIntersecting ) {
                    for ( const id of ids ) {
                        if ( !nextVisible.has( id ) ) {
                            nextVisible.add( id );
                            changed = true;
                        }
                    }
                } else {
                    for ( const id of ids ) {
                        if ( nextVisible.delete( id ) ) {
                            changed = true;
                        }
                    }
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
        elementToIds.forEach( ( _ids, el ) => {
            try {
                observer.observe( el );
            } catch { /* ignore */ }
        } );

        // Initial snapshot: assume currently intersecting elements are visible
        // (Observer will update promptly afterwards.)
        const initialVisible = new Set<string>();
        elementToIds.forEach( ( ids ) => {
            for ( const id of ids ) {
                initialVisible.add( id );
            }
        } );
        setVisibleIds( initialVisible.size > 0 ? initialVisible : new Set() );

        return () => {
            try { observer.disconnect(); } catch { /* ignore */ }
            observerRef.current = undefined;
        };
    }, [ elementToIds, options.rootMargin ] );

    return visibleIds;
}
