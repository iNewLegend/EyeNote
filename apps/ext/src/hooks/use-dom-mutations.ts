import { useEffect, useRef } from "react";

import {
    MUTATION_ATTRIBUTE_FILTER,
    MUTATION_DEBOUNCE_MS_DEFAULT,
    MUTATION_MAX_ROOT_SAMPLES_DEFAULT,
} from "@eye-note/definitions";

import { useNotesStore } from "@eye-note/ext/src/features/notes/notes-store";
import { getElementPath } from "@eye-note/ext/src/utils/element-path";
import { isElementInsidePlugin } from "@eye-note/ext/src/utils/is-element-visible";

import { getPageAnalyzer } from "@eye-note/ext/src/lib/page-analyzer";

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
        console.log( "[EyeNote][DOM Mutations] effect mount", {
            debounceMs,
            maxRootSamples,
        } );

        // Collect a candidate element for incremental analysis
        const enqueue = ( el : Element | null, source ?: string ) => {
            if ( !el ) return;
            if ( isElementInsidePlugin( el ) ) return; // ignore our own DOM
            const tag = el.tagName?.toLowerCase?.();
            const ignoredTags = new Set( [ "html", "body", "head", "link", "style", "meta", "script", "noscript" ] );
            if ( tag && ignoredTags.has( tag ) ) {
                return;
            }
            let elementPath : string | null = null;
            try {
                elementPath = getElementPath( el );
            } catch { /* ignore */ }

            if ( !elementPath ) {
                return;
            }

            const notes = useNotesStore.getState().notes;
            const hasRelevantNote = notes.some( ( note ) => {
                if ( !note.elementPath ) return false;
                return note.elementPath.startsWith( elementPath ) || elementPath.startsWith( note.elementPath );
            } );
            if ( !hasRelevantNote ) {
                return;
            }

            pending.current.add( el );
            console.log( "[EyeNote][DOM Mutations] pending size", pending.current.size );
            console.log( "[EyeNote][DOM Mutations] enqueue", {
                source,
                tag: tag ?? "unknown",
                id: el instanceof Element ? el.id || undefined : undefined,
                elementPath,
            } );
            if ( scheduled.current === null ) {
                scheduled.current = window.setTimeout( flush, debounceMs );
                console.log( "[EyeNote][DOM Mutations] scheduled flush", { debounceMs } );
            }
        };

        // Debounced flush: compact roots, analyze subtrees, rehydrate notes
        const flush = () => {
            scheduled.current = null;
            if ( pending.current.size === 0 ) {
                console.log( "[EyeNote][DOM Mutations] flush skipped - no pending" );
                return;
            }

            const elements = Array.from( pending.current );
            pending.current.clear();

            const roots = compactRoots( elements );
            const rootSummaries = roots.map( ( el ) => ( {
                tag: el.tagName.toLowerCase(),
                id: el.id || undefined,
                classList: el.className || undefined,
            } ) );
            console.log( "[EyeNote][DOM Mutations] flush start", {
                pendingCount: elements.length,
                rootCount: roots.length,
                roots: rootSummaries,
            } );
            // If too many roots or root is <body>, fallback to full rehydrate
            const includeFull = roots.length > maxRootSamples || roots.some( ( el ) => el === document.body || el === document.documentElement );
            if ( includeFull || !rehydrateByPaths ) {
                try { getPageAnalyzer().analyzePage(); } catch { /* noop */ }
                console.log( "[EyeNote][DOM Mutations] full rehydrate", {
                    includeFull,
                    hasRehydrateByPaths: Boolean( rehydrateByPaths ),
                } );
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
                    console.warn( "[EyeNote][DOM Mutations] escalate to full rehydrate", {
                        reason: "empty-root-path",
                        rootSummary: {
                            tag: root.tagName.toLowerCase(),
                            id: root.id || undefined,
                        },
                    } );
                    rehydrateAll();
                    return;
                }
            }

            console.log( "[EyeNote][DOM Mutations] targeted rehydrate", {
                rootPaths,
            } );

            // Targeted rehydration by selector prefix
            try {
                ( rehydrateByPaths as ( paths : string[] ) => void )( rootPaths );
            } catch {
                console.warn( "[EyeNote][DOM Mutations] targeted rehydrate failed, falling back", {
                    rootPaths,
                } );
                rehydrateAll();
            }
        };

        const observer = new MutationObserver( ( records ) => {
            for ( const rec of records ) {
                if ( rec.type === "childList" ) {
                    enqueue( rec.target as Element, "childList:target" );
                    for ( const n of Array.from( rec.addedNodes ) ) {
                        const candidate = n.nodeType === 1 ? ( n as Element ) : n.parentElement;
                        enqueue( candidate, "childList:added" );
                    }
                    for ( const n of Array.from( rec.removedNodes ) ) {
                        const candidate = n.nodeType === 1 ? ( n as Element ) : ( rec.target as Element );
                        enqueue( candidate, "childList:removed" );
                    }
                } else if ( rec.type === "attributes" ) {
                    enqueue( rec.target as Element, "attributes" );
                }
            }
        } );

        console.log( "[EyeNote][DOM Mutations] observer install" );

        observer.observe( document.documentElement ?? document, {
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
    }, [ debounceMs, maxRootSamples ] );
}
