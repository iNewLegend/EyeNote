import React, { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useNotesStore } from "../../features/notes/notes-store";
import { useNotesController } from "../../features/notes/notes-controller";
import { NotesComponent } from "../../features/notes/notes-component";
import { useInspectorMode } from "../../hooks/use-inspector-mode";
import { ThemeProvider } from "../theme/theme-provider";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { InteractionBlocker } from "../../components/interaction-blocker";
import { useAuthStore } from "../../modules/auth";
import { useUrlListener } from "../../hooks/use-url-listener";
import { useBackendHealthBridge } from "../../hooks/use-backend-health-bridge";
import { useAuthStatusEffects } from "../../modules/auth/hooks/use-auth-status-effects";
import { useNotesLifecycle } from "../../features/notes/use-notes-lifecycle";
import { useElementSelectionListener } from "../../hooks/use-element-selection-listener";
import { usePageIdentity } from "../../hooks/use-page-identity";
import {
    useGroupsBootstrap,
    useGroupsStore,
    GroupManagerPanel,
} from "../../modules/groups";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "../../components/ui/dialog";
import { Toaster } from "../../components/ui/sonner";
import { Button } from "../../components/ui/button.tsx";
import { useExtensionSettings, type ExtensionSettings } from "../../hooks/use-extension-settings";
import { Label } from "../../components/ui/label.tsx";
import { Switch } from "../../components/ui/switch.tsx";
import { QuickMenuDialog } from "../../components/quick-menu-dialog";

export const ShadowDOM : React.FC = () => {
    const notes = useNotesStore( ( state ) => state.notes );
    const clearNotes = useNotesStore( ( state ) => state.clearNotes );
    const rehydrateNotes = useNotesStore( ( state ) => state.rehydrateNotes );
    const { createNote, loadNotes } = useNotesController();
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
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
    const [ isGroupManagerOpen, setIsGroupManagerOpen ] = useState( false );
    const [ isQuickMenuOpen, setIsQuickMenuOpen ] = useState( false );
    const [ isSettingsDialogOpen, setIsSettingsDialogOpen ] = useState( false );
    const [ , setLocalSelectedElement ] = useState<HTMLElement | null>( null );
    const notesContainerRef = useRef<HTMLDivElement>( null );
    const pageIdentityState = usePageIdentity( currentUrl );
    const { settings, setSetting } = useExtensionSettings();
    const handleSettingChange = useCallback(
        ( key : keyof ExtensionSettings ) => ( value : boolean ) => setSetting( key, value ),
        [ setSetting ]
    );
    const dialogContainer = notesContainerRef.current?.parentElement ?? undefined;
    const wideDialogClassName = "max-h-[85vh] overflow-y-auto w-[min(90vw,640px)] max-w-[640px] space-y-6";

    const lastKnownUrlRef = useUrlListener( setCurrentUrl );
    useGroupsBootstrap( {
        isAuthenticated,
        canSync: isConnected,
        shouldResetOnUnsync: false,
        logContext: "content-script",
    } );

    useBackendHealthBridge();
    useAuthStatusEffects( refreshAuthStatus );
    useNotesLifecycle( {
        isAuthenticated,
        isConnected,
        currentUrl,
        pageIdentity: pageIdentityState.identity,
        clearNotes,
        loadNotes,
        notesLength: notes.length,
        rehydrateNotes,
        activeGroupIds,
    } );
    useElementSelectionListener( setLocalSelectedElement );

    useEffect( () => {
        if ( typeof window === "undefined" ) {
            return;
        }

        if ( pageIdentityState.identity ) {
            console.log( "[EyeNote] Page identity captured", {
                identity: pageIdentityState.identity,
                previousIdentity: pageIdentityState.previousIdentity,
                comparison: pageIdentityState.lastComparison,
            } );

            window.dispatchEvent(
                new CustomEvent( "eye-note-page-identity", {
                    detail: {
                        identity: pageIdentityState.identity,
                        previousIdentity: pageIdentityState.previousIdentity,
                        comparison: pageIdentityState.lastComparison,
                    },
                } )
            );
        }
    }, [ pageIdentityState.identity, pageIdentityState.lastComparison, pageIdentityState.previousIdentity ] );

    const defaultGroupId = useMemo( () => {
        const candidate = activeGroupIds.find( ( id ) => id && id.trim().length > 0 );
        return candidate ?? null;
    }, [ activeGroupIds ] );
    const canManageGroups = isAuthenticated && isConnected;

    useEffect( () => {
        const handler = () => {
            if ( canManageGroups ) {
                setIsGroupManagerOpen( true );
            }
        };

        window.addEventListener( "eye-note-open-group-manager", handler );
        return () => {
            window.removeEventListener( "eye-note-open-group-manager", handler );
        };
    }, [ canManageGroups ] );

    useEffect( () => {
        const handler = () => {
            setIsQuickMenuOpen( true );
        };

        window.addEventListener( "eye-note-open-quick-menu", handler );
        return () => {
            window.removeEventListener( "eye-note-open-quick-menu", handler );
        };
    }, [] );

    useEffect( () => {
        const handler = () => {
            setIsSettingsDialogOpen( true );
        };

        window.addEventListener( "eye-note-open-settings-dialog", handler );
        return () => {
            window.removeEventListener( "eye-note-open-settings-dialog", handler );
        };
    }, [] );

    useEffect( () => {
        lastKnownUrlRef.current = currentUrl;
    }, [ currentUrl, lastKnownUrlRef ] );

    // Handle note element selection
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
                await createNote( hoveredElement, pointerPosition, defaultGroupId );
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
            createNote,
            defaultGroupId,
            hoveredElement,
            isActive,
            isAuthenticated,
            isConnected,
            isProcessingNoteDismissal,
            selectElement,
            setHoveredElement,
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
            <Toaster />
            <div
                ref={notesContainerRef}
                className="notes-plugin"
                data-inspector-active={isActive ? "1" : "0"}
            >
                <InteractionBlocker isVisible={isActive} />
                <QuickMenuDialog
                    open={isQuickMenuOpen}
                    onOpenChange={setIsQuickMenuOpen}
                    dialogContainer={dialogContainer}
                    canManageGroups={canManageGroups}
                    onSelect={ ( item ) => {
                        setIsQuickMenuOpen( false );
                        setIsGroupManagerOpen( true );
                    }}
                />
                <Dialog
                    open={isSettingsDialogOpen}
                    onOpenChange={setIsSettingsDialogOpen}
                >
                    <DialogContent
                        container={dialogContainer}
                        className={wideDialogClassName}
                    >
                        <DialogHeader>
                            <DialogTitle>Extension settings</DialogTitle>
                            <DialogDescription>
                                These preferences are stored locally in chrome.storage and sync
                                across the popup and overlay.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between space-x-4">
                                <Label
                                    htmlFor="overlay-enable-notes"
                                    className="flex-1 text-sm font-normal"
                                >
                                    Enable Notes
                                </Label>
                                <Switch
                                    id="overlay-enable-notes"
                                    checked={settings.enabled}
                                    onCheckedChange={handleSettingChange( "enabled" )}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-4">
                                <Label
                                    htmlFor="overlay-notification-sound"
                                    className="flex-1 text-sm font-normal"
                                >
                                    Notification Sound
                                </Label>
                                <Switch
                                    id="overlay-notification-sound"
                                    checked={settings.notificationSound}
                                    onCheckedChange={handleSettingChange( "notificationSound" )}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-4">
                                <Label
                                    htmlFor="overlay-unread-badge"
                                    className="flex-1 text-sm font-normal"
                                >
                                    Show Unread Badge
                                </Label>
                                <Switch
                                    id="overlay-unread-badge"
                                    checked={settings.showUnreadBadge}
                                    onCheckedChange={handleSettingChange( "showUnreadBadge" )}
                                />
                            </div>
                        </div>
                        <DialogFooter className="justify-end">
                            <DialogClose asChild>
                                <Button variant="outline">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog
                    open={isGroupManagerOpen}
                    onOpenChange={( next ) => {
                        if ( next ) {
                            if ( canManageGroups ) {
                                setIsGroupManagerOpen( true );
                            }
                            return;
                        }
                        setIsGroupManagerOpen( false );
                    }}
                >
                    <DialogContent
                        container={notesContainerRef.current?.parentElement ?? undefined}
                        className="max-h-[85vh] overflow-y-auto"
                    >
                        <DialogHeader>
                            <DialogTitle>Manage groups</DialogTitle>
                        </DialogHeader>
                        <GroupManagerPanel onClose={() => setIsGroupManagerOpen( false )} />
                    </DialogContent>
                </Dialog>
                {notes.map( ( note ) => (
                    <NotesComponent
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
