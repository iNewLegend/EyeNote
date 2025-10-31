import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import type { Note } from "../../types";
import type { UpdateNotePayload } from "@eye-note/definitions";
import {
    Button,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    Dialog,
    DialogContent,
} from "@eye-note/ui";
import { useHighlightStore } from "../../stores/highlight-store";
import { useNotesStore } from "./notes-store";
import { useNotesController } from "./notes-controller";
import { useGroupsStore } from "../../modules/groups";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { calculateMarkerPosition } from "./notes-utils";

interface NoteComponentProps {
    note : Note;
    container : HTMLElement | null;
    setSelectedElement : ( element : Element | null ) => void;
    onNoteDismissed : () => void;
}

type GroupOption = {
    id : string;
    name : string;
};

export function NotesComponent ( {
    note,
    container,
    setSelectedElement,
    onNoteDismissed,
} : NoteComponentProps ) {
    const markerPosition = useMemo( () => calculateMarkerPosition( note ), [ note ] );

    useEffect( () => {
        console.debug( "[EyeNote] Rendering note marker", {
            id: note.id,
            calculatedX: markerPosition?.x,
            calculatedY: markerPosition?.y,
            hasElement: Boolean( note.highlightedElement ),
            elementPath: note.elementPath,
        } );
    }, [
        markerPosition?.x,
        markerPosition?.y,
        note.elementPath,
        note.highlightedElement,
        note.id,
    ] );

    const { deleteNote, updateNote } = useNotesController();
    const setNoteEditing = useNotesStore( ( state ) => state.setNoteEditing );
    const { addHighlight, removeHighlight } = useHighlightStore();
    const addMode = useModeStore( ( state ) => state.addMode );
    const groups = useGroupsStore( ( state ) => state.groups );
    const [ draftContent, setDraftContent ] = useState( note.content );
    const [ isSaving, setIsSaving ] = useState( false );
    const [ isDeleting, setIsDeleting ] = useState( false );
    const [ selectedGroupId, setSelectedGroupId ] = useState( note.groupId ?? "" );
    const [ selectedScreenshotIndex, setSelectedScreenshotIndex ] = useState<number | null>( null );

    useEffect( () => {
        setDraftContent( note.content );
    }, [ note.content ] );
    useEffect( () => {
        setSelectedGroupId( note.groupId ?? "" );
    }, [ note.groupId ] );

    const currentGroup = useMemo( () => {
        if ( !note.groupId ) {
            return null;
        }
        return groups.find( ( item ) => item.id === note.groupId ) ?? null;
    }, [ groups, note.groupId ] );

    const groupColor = currentGroup?.color ?? "#646cff";

    if ( !markerPosition ) {
        return null;
    }

    const markerStyle : CSSProperties = {
        left: `${ markerPosition.x }px`,
        top: `${ markerPosition.y }px`,
        zIndex: 2147483646,
        transform: "translate(-50%, -50%)",
        backgroundColor: note.isPendingSync ? "#f97316" : groupColor,
        borderColor: note.isPendingSync ? "#f97316" : groupColor,
    };

    const groupOptions = useMemo<GroupOption[]>( () => {
        if ( groups.length === 0 ) {
            return [];
        }

        return groups
            .map( ( group ) => ( {
                id: group.id,
                name: group.name,
            } ) )
            .sort( ( a, b ) => a.name.localeCompare( b.name ) );
    }, [ groups ] );

    const selectOptions = useMemo<GroupOption[]>( () => {
        if ( selectedGroupId === "" ) {
            return groupOptions;
        }

        const exists = groupOptions.some( ( option ) => option.id === selectedGroupId );

        if ( exists ) {
            return groupOptions;
        }

        return [
            ...groupOptions,
            {
                id: selectedGroupId,
                name: "Group unavailable",
            },
        ];
    }, [ groupOptions, selectedGroupId ] );

    const isActionLocked = useMemo( () => {
        const isPersistingExistingNote = !note.isLocalDraft && note.isPendingSync;
        return isPersistingExistingNote || isSaving || isDeleting;
    }, [ note.isLocalDraft, note.isPendingSync, isSaving, isDeleting ] );

    const handleOpenChange = ( open : boolean, options : { force ?: boolean } = {} ) => {
        const force = options.force ?? false;

        if ( !open && isActionLocked && !force ) {
            return;
        }

        console.log( "[Debug] Dialog onOpenChange", {
            open,
            noteId: note.id,
            currentIsEditing: note.isEditing,
        } );

        if ( !open ) {
            console.log( "[Debug] Dialog closing" );
            const element = note.highlightedElement;
            if ( element ) {
                removeHighlight( element );
                setSelectedElement( null );
            }
            setNoteEditing( note.id, false );
            requestAnimationFrame( () => {
                console.log( "[Debug] Calling onNoteDismissed" );
                onNoteDismissed();
            } );
        } else {
            console.log( "[Debug] Dialog opening" );
            addMode( AppMode.NOTES_MODE );
            if ( note.highlightedElement ) {
                addHighlight( note.highlightedElement );
                setSelectedElement( note.highlightedElement );

                const scrollX = window.scrollX;
                const scrollY = window.scrollY;

                requestAnimationFrame( () => {
                    window.scrollTo( scrollX, scrollY );
                } );
            }
        }
    };

    const handleSave = async () => {
        if ( isActionLocked ) {
            return;
        }

        try {
            setIsSaving( true );
            const nextGroupId = selectedGroupId.length > 0 ? selectedGroupId : null;
            const updatePayload : UpdateNotePayload = {
                content: draftContent,
            };

            if ( ( note.groupId ?? null ) !== nextGroupId ) {
                updatePayload.groupId = nextGroupId;
            }

            await updateNote( note.id, updatePayload );
            setIsSaving( false );
            handleOpenChange( false, { force: true } );
        } catch ( error ) {
            console.error( "Failed to save note:", error );
        } finally {
            setIsSaving( false );
        }
    };

    const handleDelete = async () => {
        if ( isActionLocked ) {
            return;
        }

        try {
            setIsDeleting( true );
            await deleteNote( note.id );
            setIsDeleting( false );
            handleOpenChange( false, { force: true } );
            onNoteDismissed();
        } catch ( error ) {
            console.error( "Failed to delete note:", error );
        } finally {
            setIsDeleting( false );
        }
    };

    const isExistingPending = note.isPendingSync && !note.isLocalDraft;

    const handleCancel = async () => {
        if ( note.isLocalDraft ) {
            try {
                await deleteNote( note.id );
            } catch ( error ) {
                console.error( "Failed to discard draft note:", error );
            }
            handleOpenChange( false, { force: true } );
            onNoteDismissed();
            return;
        }

        handleOpenChange( false );
    };

    const screenshots = note.screenshots ?? [];
    const selectedScreenshot = selectedScreenshotIndex !== null ? screenshots[ selectedScreenshotIndex ] : null;
    const hasMultipleScreenshots = screenshots.length > 1;

    const handleImageClick = useCallback( ( index : number ) => {
        setSelectedScreenshotIndex( index );
    }, [] );

    const handleCloseImageViewer = useCallback( () => {
        setSelectedScreenshotIndex( null );
    }, [] );

    const handlePreviousImage = useCallback( () => {
        if ( selectedScreenshotIndex === null || screenshots.length === 0 ) return;
        const prevIndex = selectedScreenshotIndex > 0 ? selectedScreenshotIndex - 1 : screenshots.length - 1;
        setSelectedScreenshotIndex( prevIndex );
    }, [ selectedScreenshotIndex, screenshots.length ] );

    const handleNextImage = useCallback( () => {
        if ( selectedScreenshotIndex === null || screenshots.length === 0 ) return;
        const nextIndex = selectedScreenshotIndex < screenshots.length - 1 ? selectedScreenshotIndex + 1 : 0;
        setSelectedScreenshotIndex( nextIndex );
    }, [ selectedScreenshotIndex, screenshots.length ] );

    useEffect( () => {
        if ( selectedScreenshotIndex === null ) return;

        const handleKeyDown = ( event : KeyboardEvent ) => {
            if ( event.key === "Escape" ) {
                handleCloseImageViewer();
            } else if ( event.key === "ArrowLeft" ) {
                event.preventDefault();
                handlePreviousImage();
            } else if ( event.key === "ArrowRight" ) {
                event.preventDefault();
                handleNextImage();
            }
        };

        window.addEventListener( "keydown", handleKeyDown );
        return () => {
            window.removeEventListener( "keydown", handleKeyDown );
        };
    }, [ selectedScreenshotIndex, handleCloseImageViewer, handlePreviousImage, handleNextImage ] );

    return (
        <div>
            <div
                style={markerStyle}
                data-note-id={note.id}
                data-has-element={note.highlightedElement ? "1" : "0"}
                data-pending={note.isPendingSync ? "1" : "0"}
                className={`note-marker${ note.isPendingSync ? " is-pending" : "" }`}
                onClick={() => {
                    console.log( "[Debug] Note marker clicked", {
                        note,
                        element: note.highlightedElement,
                    } );
                    const element = note.highlightedElement;
                    if ( element ) {
                        setSelectedElement( element );
                        addHighlight( element );
                    }
                    console.log( "[Debug] Before setNoteEditing", {
                        noteId: note.id,
                        currentIsEditing: note.isEditing,
                    } );
                    handleOpenChange( true );
                    setNoteEditing( note.id, true );
                    console.log( "[Debug] After setNoteEditing" );
                }}
            />
            <Sheet open={Boolean( note.isEditing )} onOpenChange={handleOpenChange}>
                <SheetContent
                    {...( container ? { container } : {} )}
                    side="right"
                    className="note-content w-full sm:max-w-md flex flex-col outline-none opacity-50 hover:opacity-100 transition-opacity duration-200"
                    onPointerDownOutside={( event ) => {
                        console.log( "[Debug] Sheet pointer down outside" );
                        if ( note.isLocalDraft ) {
                            event.preventDefault();
                            return;
                        }
                        handleOpenChange( false );
                    }}
                    onInteractOutside={( event ) => {
                        if ( note.isLocalDraft ) {
                            event.preventDefault();
                        }
                    }}
                >
                    <SheetTitle className="sr-only">Add Note</SheetTitle>
                    <SheetDescription className="sr-only">
                        Add or edit your note for the selected element. Use the textarea below to
                        write your note, then click Save to confirm or Delete to remove the note.
                    </SheetDescription>
                    <div className="flex flex-col h-full gap-6">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border/50">
                            <span
                                className="h-3 w-3 rounded-full border border-border"
                                style={{ backgroundColor: groupColor }}
                            />
                            <span>{currentGroup?.name ?? ( note.groupId ? "Group" : "No group" )}</span>
                        </div>
                        {( note.screenshots && note.screenshots.length > 0 ) || note.isCapturingScreenshots ? (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Element Capture
                                </label>
                                {note.isCapturingScreenshots ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {[ 1, 2 ].map( ( zoom ) => (
                                            <div
                                                key={zoom}
                                                className="relative rounded-md overflow-hidden border border-border/50 bg-background/40 flex flex-col items-center justify-center"
                                                style={{ minHeight: "150px", maxHeight: "300px" }}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                                                    <div className="text-xs text-muted-foreground">
                                                        Capturing {zoom}x...
                                                    </div>
                                                </div>
                                            </div>
                                        ) )}
                                    </div>
                                ) : note.screenshots && note.screenshots.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {note.screenshots.map( ( screenshot, index ) => (
                                            <div
                                                key={index}
                                                className="relative rounded-md overflow-hidden border border-border/50 bg-background/40 cursor-pointer hover:border-primary/50 transition-colors"
                                                onClick={() => handleImageClick( index )}
                                            >
                                                <img
                                                    src={screenshot.dataUrl}
                                                    alt={ `Element capture at ${ screenshot.zoom }x zoom` }
                                                    className="w-full h-auto object-contain pointer-events-none"
                                                    style={{ maxHeight: "300px", minHeight: "150px" }}
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center">
                                                    { `${ screenshot.zoom }x` }
                                                </div>
                                            </div>
                                        ) )}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            <label
                                htmlFor={`note-group-${ note.id }`}
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Group
                            </label>
                            <select
                                id={`note-group-${ note.id }`}
                                className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={selectedGroupId}
                                onChange={( event ) => setSelectedGroupId( event.target.value )}
                                disabled={isActionLocked}
                            >
                                <option value="">No group</option>
                                {selectOptions.map( ( option ) => (
                                    <option key={`${ note.id }-${ option.id }`} value={option.id}>
                                        {option.name}
                                    </option>
                                ) )}
                            </select>
                        </div>
                        <div className="space-y-2 flex-1 min-h-0">
                            <label
                                htmlFor={`note-content-${ note.id }`}
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Note
                            </label>
                            <textarea
                                id={`note-content-${ note.id }`}
                                className="w-full min-h-[150px] p-3 border border-border rounded resize-y font-sans bg-background/60 focus:bg-background/80 transition-colors"
                                value={draftContent}
                                onChange={( event ) => setDraftContent( event.target.value )}
                                placeholder="Enter your note..."
                                autoFocus
                                disabled={isActionLocked}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                            <Button variant="outline" onClick={handleCancel} disabled={isActionLocked}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting || isExistingPending}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving || isExistingPending}>
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
            <Dialog open={selectedScreenshotIndex !== null} onOpenChange={( open ) => {
                if ( !open ) {
                    handleCloseImageViewer();
                }
            }}>
                <DialogContent
                    {...( container ? { container } : {} )}
                    className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none"
                    onPointerDownOutside={handleCloseImageViewer}
                >
                    {selectedScreenshot && (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={selectedScreenshot.dataUrl}
                                alt={ `Element capture at ${ selectedScreenshot.zoom }x zoom` }
                                className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-md backdrop-blur-sm">
                                <span className="font-medium">{ `${ selectedScreenshot.zoom }x zoom` }</span>
                                {hasMultipleScreenshots && (
                                    <span className="ml-2 text-muted-foreground">
                                        { `${ selectedScreenshotIndex! + 1 } / ${ screenshots.length }` }
                                    </span>
                                )}
                            </div>
                            {hasMultipleScreenshots && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-sm"
                                        onClick={handlePreviousImage}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M15 18l-6-6 6-6" />
                                        </svg>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-sm"
                                        onClick={handleNextImage}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-sm"
                                onClick={handleCloseImageViewer}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
