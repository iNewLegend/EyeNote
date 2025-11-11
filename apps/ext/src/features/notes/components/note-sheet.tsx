import { Button, Sheet, SheetContent, SheetDescription, SheetTitle } from "@eye-note/ui";
import type { Note } from "../../../types";

export interface NoteGroupOption {
    id : string;
    name : string;
}

type NoteScreenshot = NonNullable<Note["screenshots"]>[ number ];

interface NoteSheetProps {
    note : Note;
    container : HTMLElement | null;
    open : boolean;
    onOpenChange : ( open : boolean ) => void;
    groupColor : string;
    groupLabel : string;
    screenshots : NoteScreenshot[];
    isCapturingScreenshots : boolean;
    onImageClick : ( index : number ) => void;
    selectOptions : NoteGroupOption[];
    selectedGroupId : string;
    onSelectedGroupIdChange : ( value : string ) => void;
    draftContent : string;
    onDraftContentChange : ( value : string ) => void;
    isActionLocked : boolean;
    onCancel : () => void;
    onDelete : () => void;
    onSave : () => void;
    isDeleting : boolean;
    isSaving : boolean;
    isExistingPending : boolean;
}

export function NoteSheet ( {
    note,
    container,
    open,
    onOpenChange,
    groupColor,
    groupLabel,
    screenshots,
    isCapturingScreenshots,
    onImageClick,
    selectOptions,
    selectedGroupId,
    onSelectedGroupIdChange,
    draftContent,
    onDraftContentChange,
    isActionLocked,
    onCancel,
    onDelete,
    onSave,
    isDeleting,
    isSaving,
    isExistingPending,
} : NoteSheetProps ) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                {...( container ? { container } : {} )}
                side="right"
                className="note-content w-full sm:max-w-md flex flex-col outline-none opacity-50 hover:opacity-100 transition-opacity duration-200"
                onPointerDownOutside={( event ) => {
                    if ( note.isLocalDraft ) {
                        event.preventDefault();
                        return;
                    }
                    onOpenChange( false );
                }}
                onInteractOutside={( event ) => {
                    if ( note.isLocalDraft ) {
                        event.preventDefault();
                    }
                }}
            >
                <SheetTitle className="sr-only">Add Note</SheetTitle>
                <SheetDescription className="sr-only">
                    Add or edit your note for the selected element. Use the textarea below to write your note,
                    then click Save to confirm or Delete to remove the note.
                </SheetDescription>
                <div className="flex flex-col h-full gap-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border/50">
                        <span
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: groupColor }}
                        />
                        <span>{groupLabel}</span>
                    </div>
                    {( screenshots.length > 0 ) || isCapturingScreenshots ? (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Element Capture
                            </label>
                            {isCapturingScreenshots ? (
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
                                                    { `Capturing ${ zoom }x...` }
                                                </div>
                                            </div>
                                        </div>
                                    ) )}
                                </div>
                            ) : screenshots.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {screenshots.map( ( screenshot, index ) => (
                                        <div
                                            key={`${ note.id }-${ index }`}
                                            className="relative rounded-md overflow-hidden border border-border/50 bg-background/40 cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => onImageClick( index )}
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
                            onChange={( event ) => onSelectedGroupIdChange( event.target.value )}
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
                            onChange={( event ) => onDraftContentChange( event.target.value )}
                            placeholder="Enter your note..."
                            autoFocus
                            disabled={isActionLocked}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                        <Button variant="outline" onClick={onCancel} disabled={isActionLocked}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                            disabled={isDeleting || isExistingPending}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                        <Button onClick={onSave} disabled={isSaving || isExistingPending}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
