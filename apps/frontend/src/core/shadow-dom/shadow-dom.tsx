import React, { useEffect, useCallback, useState, useRef } from "react";
import { useNotesStore } from "../../stores/notes-store";
import { NoteComponent } from "../../features/notes/note-component";
import { useInspectorMode } from "../../hooks/use-inspector-mode";
import { ThemeProvider } from "../theme/theme-provider";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { useHighlightStore } from "../../stores/highlight-store";
import { InteractionBlocker } from "../../components/interaction-blocker";
import { useAuthStore } from "../../stores/auth-store";
import { pingHealth } from "../../lib/api-client";

export const ShadowDOM : React.FC = () => {
    const { notes, createNote, loadNotes, clearNotes, rehydrateNotes } = useNotesStore();
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const refreshAuthStatus = useAuthStore( ( state ) => state.refreshStatus );
    const modes = useModeStore( ( state ) => state.modes );
    const isConnected = ( modes & AppMode.CONNECTED ) === AppMode.CONNECTED;
    const {
        hoveredElement,
        setHoveredElement,
        setSelectedElement,
        selectElement,
        dismiss,
        isActive,
    } = useInspectorMode();
    const [ isProcessingNoteDismissal, setIsProcessingNoteDismissal ] = useState( false );
    const [ currentUrl, setCurrentUrl ] = useState( () => window.location.href );
    const [ , setLocalSelectedElement ] = useState<HTMLElement | null>( null );
    const notesContainerRef = useRef<HTMLDivElement>( null );
    const lastKnownUrlRef = useRef( currentUrl );

    useEffect( () => {
        lastKnownUrlRef.current = currentUrl;
    }, [ currentUrl ] );

    useEffect( () => {
        const updateUrlIfChanged = () => {
            const href = window.location.href;
            if ( lastKnownUrlRef.current !== href ) {
                lastKnownUrlRef.current = href;
                setCurrentUrl( href );
            }
        };

        const handleHistoryChange = () => {
            updateUrlIfChanged();
        };

        const handleVisibilityChange = () => {
            if ( !document.hidden ) {
                updateUrlIfChanged();
            }
        };

        window.addEventListener( "popstate", handleHistoryChange );
        window.addEventListener( "hashchange", handleHistoryChange );
        document.addEventListener( "visibilitychange", handleVisibilityChange );

        const history = window.history;
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const patchedPushState : History["pushState"] = function ( ...args ) {
            const result = originalPushState.apply(
                history,
                args as Parameters<History["pushState"]>
            );
            handleHistoryChange();
            return result;
        };

        const patchedReplaceState : History["replaceState"] = function ( ...args ) {
            const result = originalReplaceState.apply(
                history,
                args as Parameters<History["replaceState"]>
            );
            handleHistoryChange();
            return result;
        };

        history.pushState = patchedPushState;
        history.replaceState = patchedReplaceState;

        updateUrlIfChanged();
        const pollId = window.setInterval( updateUrlIfChanged, 1000 );

        return () => {
            window.removeEventListener( "popstate", handleHistoryChange );
            window.removeEventListener( "hashchange", handleHistoryChange );
            document.removeEventListener( "visibilitychange", handleVisibilityChange );
            window.clearInterval( pollId );
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }, [] );

    useEffect( () => {
        let cancelled = false;

        const updateConnection = async () => {
            const healthy = await pingHealth();

            if ( cancelled ) {
                return;
            }

            const store = useModeStore.getState();
            const isAlreadyConnected = store.isMode( AppMode.CONNECTED );

            if ( healthy === isAlreadyConnected ) {
                return;
            }

            store.toggleMode( AppMode.CONNECTED );
        };

        void updateConnection();
        const interval = window.setInterval( updateConnection, 30000 );

        return () => {
            cancelled = true;
            window.clearInterval( interval );
        };
    }, [] );

    useEffect( () => {
        refreshAuthStatus().catch( ( error : unknown ) => {
            console.error( "Failed to refresh auth status:", error );
        } );
    }, [ refreshAuthStatus ] );

    useEffect( () => {
        if ( typeof chrome === "undefined" || !chrome.storage?.onChanged ) {
            return;
        }

        const listener : Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
            changes,
            areaName
        ) => {
            if ( areaName !== "local" ) {
                return;
            }

            if ( changes.authToken || changes.authTokenExpiresAt ) {
                refreshAuthStatus().catch( ( error : unknown ) => {
                    console.error( "Failed to refresh auth status after storage change:", error );
                } );
            }
        };

        chrome.storage.onChanged.addListener( listener );
        return () => {
            chrome.storage.onChanged.removeListener( listener );
        };
    }, [ refreshAuthStatus ] );

    useEffect( () => {
        if ( !isAuthenticated || !isConnected ) {
            clearNotes();
            return;
        }

        clearNotes();

        loadNotes( { url: currentUrl } ).catch( ( error : unknown ) => {
            console.error( "Failed to load notes:", error );
        } );
    }, [ isAuthenticated, isConnected, clearNotes, loadNotes, currentUrl ] );

    useEffect( () => {
        if ( !isConnected || notes.length === 0 ) {
            return;
        }

        rehydrateNotes();
    }, [ isConnected, notes.length, rehydrateNotes ] );

    useEffect( () => {
        if ( !isConnected ) {
            return;
        }

        const handleRelayout = () => {
            rehydrateNotes();
        };

        window.addEventListener( "resize", handleRelayout );
        window.addEventListener( "scroll", handleRelayout, true );

        return () => {
            window.removeEventListener( "resize", handleRelayout );
            window.removeEventListener( "scroll", handleRelayout, true );
        };
    }, [ isConnected, rehydrateNotes ] );

    // Handle note element selection
    useEffect( () => {
        const handleElementSelected = ( ( e : CustomEvent ) => {
            const element = e.detail.element;
            if ( element instanceof HTMLElement ) {
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;

                setLocalSelectedElement( element );

                // Update store states for note mode
                useModeStore.getState().addMode( AppMode.NOTES_MODE );
                useHighlightStore.getState().setSelectedElement( element );

                ( window as any ).updateOverlay( element );

                requestAnimationFrame( () => {
                    window.scrollTo( scrollX, scrollY );
                } );
            }
        } ) as EventListener;

        window.addEventListener( "eye-note:element-selected", handleElementSelected );

        return () => {
            window.removeEventListener( "eye-note:element-selected", handleElementSelected );
        };
    }, [] );

    const handleClick = useCallback(
        async ( e : MouseEvent ) => {
            console.log( "Click event in shadow-dom.tsx", {
                e,
                target: e.target,
                currentTarget: e.currentTarget,
                hoveredElement,
                isActive,
                isInteractionBlocker: ( e.target as Element ).id === "eye-note-interaction-blocker",
                isProcessingNoteDismissal,
                isConnected,
                isAuthenticated,
            } );

            // If we're processing a note dismissal, ignore the click
            if ( isProcessingNoteDismissal ) {
                e.preventDefault();
                e.stopPropagation();
                console.log( "Ignoring click during note dismissal processing" );
                return;
            }

            if ( !isActive || !hoveredElement ) {
                console.log( "Not in inspector mode or no hovered element" );
                return;
            }

            if ( !isConnected ) {
                console.warn( "Cannot create note while disconnected from backend." );
                return;
            }

            if ( !isAuthenticated ) {
                console.warn( "Cannot create note while signed out." );
                return;
            }

            // Always prevent default behavior and stop propagation in inspector mode
            e.preventDefault();
            e.stopPropagation();

            // Check if we clicked on the interaction blocker or a plugin element
            const target = e.target as Element;
            const isInteractionBlocker = target.id === "eye-note-interaction-blocker";
            const isPluginElement = target.closest( ".notes-plugin" );

            // If we clicked on a plugin element (but not the interaction blocker), don't create a note
            if ( isPluginElement && !isInteractionBlocker ) {
                console.log( "Clicked on plugin element, not creating note" );
                return;
            }

            console.log( "Creating note for element", hoveredElement );

            // Store current scroll position
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            const pointerPosition = {
                x: e.clientX,
                y: e.clientY,
            };

            try {
                await createNote( hoveredElement, pointerPosition );
                setHoveredElement( null );

                // Use our new selectElementForNote helper function
                if ( hoveredElement instanceof HTMLElement ) {
                    selectElement( hoveredElement );
                }

                // Use requestAnimationFrame to restore scroll position after the note is created
                requestAnimationFrame( () => {
                    window.scrollTo( scrollX, scrollY );
                } );
            } catch ( error ) {
                console.error( "Failed to create note:", error );
            }
        },
        [
            isActive,
            hoveredElement,
            setHoveredElement,
            createNote,
            selectElement,
            isProcessingNoteDismissal,
            isConnected,
            isAuthenticated,
        ]
    );

    useEffect( () => {
        if ( isActive ) {
            document.addEventListener( "click", handleClick, { capture: true } );
            return () => document.removeEventListener( "click", handleClick, { capture: true } );
        }
    }, [ isActive, handleClick ] );

    // Function to handle note dismissal
    const handleNoteDismissed = useCallback( () => {
        // Set a flag to prevent immediate click handling
        setIsProcessingNoteDismissal( true );

        // Use our new dismissNote helper function
        dismiss();

        // Reset the flag after a short delay to allow the DOM to update
        setTimeout( () => {
            setIsProcessingNoteDismissal( false );
        }, 100 );
    }, [ dismiss ] );

    return (
        <ThemeProvider>
            <div
                ref={notesContainerRef}
                className="notes-plugin"
                data-inspector-active={isActive ? "1" : "0"}
            >
                <InteractionBlocker isVisible={isActive} />
                {notes.map( ( note ) => (
                    <NoteComponent
                        key={note.id}
                        note={note}
                        container={notesContainerRef.current!.parentElement}
                        setSelectedElement={setSelectedElement}
                        onNoteDismissed={handleNoteDismissed}
                    />
                ) )}
            </div>
        </ThemeProvider>
    );
};
