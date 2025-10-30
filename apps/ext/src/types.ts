import type { NoteRecord } from "@eye-note/definitions";

export interface Note extends NoteRecord {
    isEditing ?: boolean;
    highlightedElement ?: Element | null;
    isPendingSync ?: boolean;
    isLocalDraft ?: boolean;
    isCapturingScreenshots ?: boolean;
}
