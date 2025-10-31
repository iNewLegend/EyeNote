import React, { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useNotesStore } from "../../features/notes/notes-store";
import { useNotesController } from "../../features/notes/notes-controller";
import { NotesComponent } from "../../features/notes/notes-component";
import { useInspectorMode } from "../../hooks/use-inspector-mode";
import { isElementVisible } from "../../utils/is-element-visible";
import { useDomMutations } from "../../hooks/use-dom-mutations";
import { EVENT_OPEN_GROUP_MANAGER, EVENT_OPEN_QUICK_MENU, EVENT_OPEN_SETTINGS_DIALOG } from "@eye-note/definitions";
import { useMarkerVirtualization } from "../../hooks/use-marker-virtualization";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { InteractionBlocker } from "../../components/interaction-blocker";
import { useAuthStore, useAuthStatusEffects } from "@eye-note/auth/extension";
import { useUrlListener } from "../../hooks/use-url-listener";
import { useBackendHealthBridge } from "../../hooks/use-backend-health-bridge";
import { useNotesLifecycle } from "../../features/notes/use-notes-lifecycle";
import { useElementSelectionListener } from "../../hooks/use-element-selection-listener";
import { usePageIdentity } from "../../hooks/use-page-identity";
import {
    useGroupsBootstrap,
    useGroupsStore,
    GroupManagerPanel,
} from "../../modules/groups";
import { useExtensionSettings, type ExtensionSettings } from "../../hooks/use-extension-settings";
import { QuickMenuDialog } from "../../components/quick-menu-dialog";
import {
    Label,
    SettingsDialog,
    Switch,
    Toaster,
    type SettingsDialogItem,
} from "@eye-note/ui";

type SettingsSectionId = "general" | "groups";

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
    const [ isQuickMenuOpen, setIsQuickMenuOpen ] = useState( false );
    const [ isSettingsDialogOpen, setIsSettingsDialogOpen ] = useState( false );
    const [ activeSettingsSection, setActiveSettingsSection ] = useState<SettingsSectionId>( "general" );
    const [ , setLocalSelectedElement ] = useState<HTMLElement | null>( null );
    const notesContainerRef = useRef<HTMLDivElement>( null );
    const pageIdentityState = usePageIdentity( currentUrl );
    const { settings, setSetting } = useExtensionSettings();
    const handleSettingChange = useCallback(
        ( key : keyof ExtensionSettings ) => ( value : boolean ) => setSetting( key, value ),
        [ setSetting ]
    );
    const dialogContainer = notesContainerRef.current?.parentElement ?? null;
    const visibleNoteIds = useMarkerVirtualization( notes, { rootMargin: "200px" } );

    const lastKnownUrlRef = useUrlListener( setCurrentUrl );
    useGroupsBootstrap( {
        isAuthenticated,
        canSync: isConnected,
        shouldResetOnUnsync: false,
        logContext: "content-script",
    } );

    useBackendHealthBridge();
    useDomMutations();
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

    const generalSettingsSection = useMemo(
        () => (
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
        ),
        [
            handleSettingChange,
            settings.enabled,
            settings.notificationSound,
            settings.showUnreadBadge,
        ]
    );

    const groupsSection = useMemo(
        () =>
            canManageGroups ? (
                <GroupManagerPanel onClose={() => setIsSettingsDialogOpen( false )} />
            ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Sign in and connect to manage groups.</p>
                    <p>Once connected, you can create, join, and configure collaboration groups.</p>
                </div>
            ),
        [ canManageGroups, setIsSettingsDialogOpen ]
    );

    const settingsItems = useMemo<SettingsDialogItem[]>(
        () => [
            {
                id: "general",
                label: "General",
                description: "Configure overlay preferences and notifications.",
                content: generalSettingsSection,
            },
            {
                id: "groups",
                label: "Groups",
                description: canManageGroups
                    ? "Manage collaboration groups and member roles."
                    : "Connect first to manage groups.",
                content: groupsSection,
                disabled: !canManageGroups,
            },
        ],
        [ canManageGroups, generalSettingsSection, groupsSection ]
    );

    const quickMenuItems = useMemo(
        () => [
            {
                id: "groups" as const,
                label: "Groups",
                description: "Manage collaboration groups, invites, and roles.",
                shortcut: "Shift + G",
                disabled: !canManageGroups,
            },
            {
                id: "settings" as const,
                label: "Settings",
                description: "Adjust overlay preferences without leaving the page.",
                shortcut: "Shift + S",
            },
        ],
        [ canManageGroups ]
    );

    useEffect( () => {
        const handler = () => {
            if ( !canManageGroups ) {
                return;
            }
            setActiveSettingsSection( "groups" );
            setIsSettingsDialogOpen( true );
        };

        window.addEventListener( EVENT_OPEN_GROUP_MANAGER, handler as EventListener );
        return () => {
            window.removeEventListener( EVENT_OPEN_GROUP_MANAGER, handler as EventListener );
        };
    }, [ canManageGroups ] );

    useEffect( () => {
        const handler = () => {
            setIsQuickMenuOpen( true );
        };

        window.addEventListener( EVENT_OPEN_QUICK_MENU, handler as EventListener );
        return () => {
            window.removeEventListener( EVENT_OPEN_QUICK_MENU, handler as EventListener );
        };
    }, [] );

    useEffect( () => {
        const handler = () => {
            setActiveSettingsSection( "general" );
            setIsSettingsDialogOpen( true );
        };

        window.addEventListener( EVENT_OPEN_SETTINGS_DIALOG, handler as EventListener );
        return () => {
            window.removeEventListener( EVENT_OPEN_SETTINGS_DIALOG, handler as EventListener );
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

            // Require page identity to avoid creating notes without pageId/normalizedUrl
            if ( !pageIdentityState.identity ) {
                console.warn( "Cannot create note until page identity is captured." );
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
        <>
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
                    items={quickMenuItems}
                    onSelect={ ( item ) => {
                        setIsQuickMenuOpen( false );
                        if ( item === "groups" ) {
                            if ( canManageGroups ) {
                                setActiveSettingsSection( "groups" );
                                setIsSettingsDialogOpen( true );
                            }
                            return;
                        }
                        setActiveSettingsSection( "general" );
                        setIsSettingsDialogOpen( true );
                    }}
                />
                <SettingsDialog
                    open={isSettingsDialogOpen}
                    onOpenChange={setIsSettingsDialogOpen}
                    dialogContainer={dialogContainer}
                    title="Extension Managment"
                    description="These preferences are stored locally in chrome.storage and sync across the popup and overlay."
                    selectedItemId={activeSettingsSection}
                    onSelectedItemChange={( id ) =>
                        setActiveSettingsSection( id as SettingsSectionId )
                    }
                    items={settingsItems}
                />
                {notes
                    .filter( ( note ) => {
                        const el = note.highlightedElement;
                        if ( !el ) return false;
                        // Prefer IO-based visibility set when available; fallback to computed check
                        return visibleNoteIds ? visibleNoteIds.has( note.id ) : isElementVisible( el );
                    } )
                    .map( ( note ) => (
                    <NotesComponent
                        key={note.id}
                        note={note}
                        container={notesContainerRef.current!.parentElement}
                        setSelectedElement={setSelectedElement}
                        onNoteDismissed={handleNoteDismissed}
                    />
                ) )}
            </div>
        </>
    );
};
