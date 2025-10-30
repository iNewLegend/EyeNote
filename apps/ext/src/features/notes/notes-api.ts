import type {
    ListNotesResponse,
    NoteRecord,
    PageIdentityPayload,
    PageIdentityResolution,
    UpdateNotePayload,
} from "@eye-note/definitions";
import type { Note } from "../../types";
import { apiRequest } from "../../lib/api-client";
import { createPayloadFromDraft, mapRecordToNote } from "./notes-utils";
import { capturePageIdentity } from "@eye-note/page-identity";

type FetchNotesArgs = {
    url : string;
    hostname ?: string;
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
            hostname: params.hostname ?? ( typeof window !== "undefined" ? window.location.hostname : undefined ),
            groupIds: params.groupIds,
            pageId: params.pageId,
            normalizedUrl: params.normalizedUrl,
            pageIdentity: params.pageIdentity,
        },
    } );

    console.log( "[EyeNote] fetchNotesForPage", {
        url: params.url,
        hostname: params.hostname,
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
    if ( !payload.pageIdentity && !payload.pageId ) {
        try {
            const identity = await capturePageIdentity( {
                currentUrl: draft.url,
                target: typeof document !== "undefined" ? document : undefined,
            } );
            payload.pageIdentity = identity;
            if ( !payload.hostname ) {
                payload.hostname = window.location.hostname;
            }
            console.log( "[EyeNote] captured page identity inline for draft", {
                normalizedUrl: identity.normalizedUrl,
            } );
        } catch ( error ) {
            console.warn( "[EyeNote] failed to inline-capture page identity for draft", error );
        }
    }

    console.log( "[EyeNote] persistDraftNote payload", {
        hasIdentity: Boolean( payload.pageIdentity ),
        hostname: payload.hostname,
        normalizedUrl: payload.pageIdentity?.normalizedUrl,
        pageId: payload.pageId,
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
