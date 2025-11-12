import type {
    CreateNoteChatMessagePayload,
    ListNoteChatMessagesResponse,
    NoteChatMessageRecord,
    RealtimeTokenRequestPayload,
    RealtimeTokenResponse,
} from "@eye-note/definitions";
import { apiRequest } from "../../lib/api-client";

export async function fetchNoteChatMessages (
    noteId : string,
    cursor ?: string
) : Promise<ListNoteChatMessagesResponse> {
    return apiRequest<ListNoteChatMessagesResponse>( `/api/notes/${ noteId }/chat/messages`, {
        searchParams: cursor ? { cursor } : undefined,
    } );
}

export async function postNoteChatMessage (
    noteId : string,
    payload : CreateNoteChatMessagePayload
) : Promise<NoteChatMessageRecord> {
    return apiRequest<NoteChatMessageRecord>( `/api/notes/${ noteId }/chat/messages`, {
        method: "POST",
        bodyJson: payload,
    } );
}

export async function requestRealtimeToken (
    payload ?: RealtimeTokenRequestPayload
) : Promise<RealtimeTokenResponse> {
    return apiRequest<RealtimeTokenResponse>( "/api/realtime/token", {
        method: "POST",
        bodyJson: payload ?? {},
    } );
}
