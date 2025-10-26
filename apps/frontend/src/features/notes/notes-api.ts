import type {
    ListNotesQuery,
    ListNotesResponse,
    NoteRecord,
    PageIdentityPayload,
    PageIdentityResolution,
    UpdateNotePayload,
} from "@eye-note/definitions";
import type { Note } from "../../types";
import { apiRequest } from "../../lib/api-client";
import { createPayloadFromDraft, mapRecordToNote } from "./notes-utils";

type FetchNotesArgs = {
    url : string;
    groupIds ?: string[];
    pageIdentity ?: PageIdentityPayload;
    pageId ?: string;
    normalizedUrl ?: string;
};

type FetchNotesResult = {
    notes : Note[];
    identity ?: PageIdentityResolution;
};

export async function fetchNotesForPage ( params : FetchNotesArgs ) : Promise<FetchNotesResult> {
    const response = await apiRequest<ListNotesResponse>( "/api/notes/query", {
        method: "POST",
        bodyJson: {
            url: params.url,
            groupIds: params.groupIds,
            pageId: params.pageId,
            normalizedUrl: params.normalizedUrl,
            pageIdentity: params.pageIdentity,
        },
    } );

    console.log( "[EyeNote] fetchNotesForPage", {
        url: params.url,
        groupIds: params.groupIds,
        pageId: params.pageId,
        normalizedUrl: params.normalizedUrl,
        hasPageIdentity: Boolean( params.pageIdentity ),
        responseIdentity: response.identity,
        noteCount: response.notes.length,
    } );

    return {
        notes: response.notes.map( ( record : NoteRecord ) => mapRecordToNote( record ) ),
        identity: response.identity,
    };
}

type PersistDraftOptions = {
    pageId ?: string;
    pageIdentity ?: PageIdentityPayload;
};

export async function persistDraftNote (
    draft : Note,
    updates : UpdateNotePayload,
    options : PersistDraftOptions = {}
) : Promise<Note> {
    const payload = createPayloadFromDraft( draft, updates, {
        pageId: options.pageId,
        pageIdentity: options.pageIdentity,
    } );
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
