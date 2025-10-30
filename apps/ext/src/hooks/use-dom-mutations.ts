import { useEffect, useRef } from "react";
import { getPageAnalyzer } from "../lib/page-analyzer";
import {
    MUTATION_ATTRIBUTE_FILTER,
    MUTATION_DEBOUNCE_MS_DEFAULT,
    MUTATION_MAX_ROOT_SAMPLES_DEFAULT,
} from "@eye-note/definitions";
import { useNotesStore } from "../features/notes/notes-store";
import { getElementPath } from "../utils/element-path";
import { isElementInsidePlugin } from "../utils/is-element-visible";

type DomMutationsOptions = {
    debounceMs ?: number;
    maxRootSamples ?: number;
};

function compactRoots ( elements : Element[] ) : Element[] {
    const roots : Element[] = [];
    for ( const el of elements ) {
        if ( !el ) continue;
        let skip = false;
        for ( const r of roots ) {
            if ( r.contains( el ) ) { skip = true; break; }
        }
        if ( skip ) continue;
        // Remove any roots contained by the new element
        for ( let i = roots.length - 1; i >= 0; i-- ) {
            if ( el.contains( roots[ i ] ) ) {
                roots.splice( i, 1 );
            }
        }
        roots.push( el );
    }
    return roots;
}

/**
 * useDomMutations
 *
 * Observes host-page DOM changes and triggers incremental note rehydration.
 *
 * Behavior
 * - Uses a single MutationObserver (childList + attributes, subtree) to watch
 *   the document; EyeNote-owned DOM is ignored.
 * - Batches records with a small debounce (MUTATION_DEBOUNCE_MS_DEFAULT).
 * - Compacts mutated nodes to a minimal set of distinct roots to limit work.
 * - Re-analyzes only affected subtrees via PageAnalyzer and asks the notes
 *   store to rehydrate notes whose `elementPath` falls under those roots.
 * - Falls back to full-page analyze + rehydrate when mutation volume or roots
 *   exceed safe thresholds (MUTATION_MAX_ROOT_SAMPLES_DEFAULT) or when body
 *   is affected.
 */
export function useDomMutations ( options : DomMutationsOptions = {} ) {
    const debounceMs = options.debounceMs ?? MUTATION_DEBOUNCE_MS_DEFAULT;
    const maxRootSamples = options.maxRootSamples ?? MUTATION_MAX_ROOT_SAMPLES_DEFAULT;
    // Pending mutated elements; compacted to root nodes on flush
    const pending = useRef<Set<Element>>( new Set() );
    const scheduled = useRef<number | null>( null );
    const observerRef = useRef<MutationObserver | null>( null );
    const rehydrateAll = useNotesStore( ( s ) => s.rehydrateNotes );
    const rehydrateByPaths = useNotesStore( ( s ) => s.rehydrateNotesForPaths );

    useEffect( () => {
        // Collect a candidate element for incremental analysis
        const enqueue = ( el : Element | null ) => {
            if ( !el ) return;
            if ( isElementInsidePlugin( el ) ) return; // ignore our own DOM
            pending.current.add( el );
            if ( scheduled.current === null ) {
                scheduled.current = window.setTimeout( flush, debounceMs );
            }
        };

        // Debounced flush: compact roots, analyze subtrees, rehydrate notes
        const flush = () => {
            scheduled.current = null;
            if ( pending.current.size === 0 ) return;

            const elements = Array.from( pending.current );
            pending.current.clear();

            const roots = compactRoots( elements );
            // If too many roots or root is <body>, fallback to full rehydrate
            const includeFull = roots.length > maxRootSamples || roots.some( ( el ) => el === document.body || el === document.documentElement );
            if ( includeFull || !rehydrateByPaths ) {
                try { getPageAnalyzer().analyzePage(); } catch { /* noop */ }
                rehydrateAll();
                return;
            }

            const analyzer = getPageAnalyzer();
            const rootPaths : string[] = [];
            for ( const root of roots ) {
                try { analyzer.analyzePage( root ); } catch { /* noop */ }
                const path = getElementPath( root );
                if ( path && path.length > 0 ) {
                    rootPaths.push( path );
                } else {
                    // empty path usually means we hit <body>; escalate
                    try { analyzer.analyzePage(); } catch { /* noop */ }
                    rehydrateAll();
                    return;
                }
            }

            // Targeted rehydration by selector prefix
            try {
                ( rehydrateByPaths as ( paths : string[] ) => void )( rootPaths );
            } catch {
                rehydrateAll();
            }
        };

        const observer = new MutationObserver( ( records ) => {
            for ( const rec of records ) {
                if ( rec.type === "childList" ) {
                    enqueue( rec.target as Element );
                    for ( const n of Array.from( rec.addedNodes ) ) {
                        enqueue( n.nodeType === 1 ? ( n as Element ) : n.parentElement );
                    }
                    for ( const n of Array.from( rec.removedNodes ) ) {
                        enqueue( n.nodeType === 1 ? ( n as Element ) : ( rec.target as Element ) );
                    }
                } else if ( rec.type === "attributes" ) {
                    enqueue( rec.target as Element );
                }
            }
        } );

        observer.observe( document, {
            childList: true,
            attributes: true,
            subtree: true,
            attributeFilter: [ ...MUTATION_ATTRIBUTE_FILTER ],
        } );

        observerRef.current = observer;

        return () => {
            if ( scheduled.current !== null ) {
                clearTimeout( scheduled.current );
                scheduled.current = null;
            }
            observer.disconnect();
            observerRef.current = null;
            pending.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ debounceMs, maxRootSamples ] );
}
