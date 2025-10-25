import type {
    ListNotesQuery,
    NoteRecord,
    UpdateNotePayload,
} from "@eye-note/definitions";
import type { Note } from "../../types";
import { apiRequest } from "../../lib/api-client";
import { createPayloadFromDraft, mapRecordToNote } from "./notes-utils";

type FetchNotesArgs = Pick<ListNotesQuery, "groupIds"> & { url : string };

export async function fetchNotesForPage ( params : FetchNotesArgs ) : Promise<Note[]> {
    const response = await apiRequest<{ notes : NoteRecord[] }>( "/api/notes", {
        searchParams: {
            url: params.url,
            groupIds: params.groupIds,
        },
    } );

    return response.notes.map( ( record ) => mapRecordToNote( record ) );
}

export async function persistDraftNote (
    draft : Note,
    updates : UpdateNotePayload
) : Promise<Note> {
    const payload = createPayloadFromDraft( draft, updates );
    const response = await apiRequest<{ note : NoteRecord }>( "/api/notes", {
        method: "POST",
        bodyJson: payload,
    } );

    return mapRecordToNote( response.note, {
        highlightedElement: draft.highlightedElement,
    } );
}

export async function persistExistingNote (
    id : string,
    updates : UpdateNotePayload,
    highlightedElement : Note["highlightedElement"]
) : Promise<Note> {
    const response = await apiRequest<{ note : NoteRecord }>( `/api/notes/${ id }`, {
        method: "PUT",
        bodyJson: updates,
    } );

    return mapRecordToNote( response.note, {
        highlightedElement: highlightedElement ?? null,
    } );
}

export async function deleteNoteRecord ( id : string ) : Promise<void> {
    await apiRequest<void>( `/api/notes/${ id }`, {
        method: "DELETE",
    } );
}
