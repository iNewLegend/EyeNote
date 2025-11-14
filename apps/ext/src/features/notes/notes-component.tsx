import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import type { Note } from "../../types";
import type { UpdateNotePayload } from "@eye-note/definitions";
import { useHighlightStore } from "../../stores/highlight-store";
import { useNotesStore } from "./notes-store";
import { useNotesController } from "./notes-controller";
import { useGroupsStore } from "@eye-note/groups";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { calculateMarkerPosition } from "./notes-utils";
import { NoteMarker } from "./components/note-marker";
import { NoteSheet, type NoteGroupOption } from "./components/note-sheet";
import { NoteImageViewer } from "./components/note-image-viewer";

interface NoteComponentProps {
    note : Note;
    container : HTMLElement | null;
    setSelectedElement : ( element : Element | null ) => void;
    onNoteDismissed : () => void;
}

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
    const groupLabel = currentGroup?.name ?? ( note.groupId ? "Group" : "No group" );

    if ( !markerPosition ) {
        return null;
    }

    const markerStyle : CSSProperties = {
        left: `${ markerPosition.x }px`,
        top: `${ markerPosition.y }px`,
        zIndex: "var(--z-index-shadow-dom-container, 2147483646)",
        transform: "translate(-50%, -50%)",
        backgroundColor: note.isPendingSync ? "#f97316" : groupColor,
        borderColor: note.isPendingSync ? "#f97316" : groupColor,
    };

    const groupOptions = useMemo<NoteGroupOption[]>( () => {
        if ( groups.length === 0 ) {
            return [];
        }

        return groups
            .map( ( group ) => ( {
                id: group.id,
                name: group.name,
                color: group.color,
            } ) )
            .sort( ( a, b ) => a.name.localeCompare( b.name ) );
    }, [ groups ] );

    const selectOptions = useMemo<NoteGroupOption[]>( () => {
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
                color: undefined,
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

    const isExistingPending = Boolean( note.isPendingSync && !note.isLocalDraft );

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

    const handleMarkerClick = () => {
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
    };

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
            <NoteMarker note={note} style={markerStyle} onClick={handleMarkerClick} />
            <NoteSheet
                note={note}
                container={container}
                open={Boolean( note.isEditing )}
                onOpenChange={( open ) => handleOpenChange( open )}
                groupColor={groupColor}
                groupLabel={groupLabel}
                screenshots={screenshots}
                isCapturingScreenshots={Boolean( note.isCapturingScreenshots )}
                onImageClick={handleImageClick}
                selectOptions={selectOptions}
                selectedGroupId={selectedGroupId}
                onSelectedGroupIdChange={setSelectedGroupId}
                draftContent={draftContent}
                onDraftContentChange={setDraftContent}
                isActionLocked={isActionLocked}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onSave={handleSave}
                isDeleting={isDeleting}
                isSaving={isSaving}
                isExistingPending={isExistingPending}
            />
            <NoteImageViewer
                open={selectedScreenshotIndex !== null}
                container={container}
                screenshot={selectedScreenshot}
                hasMultipleScreenshots={hasMultipleScreenshots}
                currentIndex={selectedScreenshotIndex}
                totalScreenshots={screenshots.length}
                onClose={handleCloseImageViewer}
                onPrevious={handlePreviousImage}
                onNext={handleNextImage}
            />
        </div>
    );
}
